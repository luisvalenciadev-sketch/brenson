/**
 * brenson-services — Cloudflare Worker (Hono)
 * Endpoints:
 *   POST /lead              lead B2C (cotización, financiamiento, contacto, prueba de manejo) → CRM
 *   POST /b2b/request       alta corporativa: crea o convierte el cliente (Admin API) → metafields + tag pendiente + CRM (+40)
 *   POST /upload            documento B2B (multipart) → storage → metafield documento_url
 *   POST /quote             cotización de flota → recalcula con Admin API → PDF → metaobject → email (+50)
 *   GET  /ficha/:handle.pdf ficha técnica generada desde metafields
 *   GET  /quotes/:id.pdf    PDF de cotización (enlace firmado)
 *   POST /quotes/:numero/accept  aceptar cotización → draftOrderCreate con precio congelado → aviso al asesor
 *   POST /financing/disponible   consulta de cupo Addi (BNPL), sobre la persona — sirve a B2C y B2B
 *   POST /webhooks/shopify/:topic   customers/create, customers/update, checkouts/create, orders/create, orders/fulfilled → CRM
 *   GET  /health
 *
 * Todos los proveedores externos (CRM, mail, PDF, storage) se eligen por variable de entorno y tienen
 * implementación mock. Ver src/providers.ts y docs/ESTRATEGIA_SIMULACION.md.
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { getProviders } from './providers';
import { verifyShopifyHmac, shopifyAdmin, findCustomerByEmail, createCustomer, updateCustomerNoteAndTags, setCustomerMetafield, setCustomerMetafields, fetchQuoteByNumero, updateQuoteMetaobject, createDraftOrder } from './lib/shopify';
import { computeQuote, quoteHtml, specSheetHtml, nextQuoteNumber, fmt } from './lib/quote';
import { verifyTurnstile, rateLimit, jsonError, scoreFor, signPath, verifySignedPath, signToken, verifyToken } from './lib/util';

const app = new Hono<{ Bindings: Env }>();

// Vigencia del token de subida de documento B2B: cubre la validación (24 h hábiles) con holgura para
// que una empresa que vuelve días después a la pantalla "pendiente" todavía pueda adjuntar.
const UPLOAD_TOKEN_TTL = 60 * 60 * 24 * 30;

app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  // Denegar por defecto: un origen fuera de la lista no recibe Access-Control-Allow-Origin.
  return cors({ origin: (o) => (origins.includes(o) ? o : null), allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] })(c, next);
});

app.get('/health', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT, providers: { crm: c.env.CRM_PROVIDER, mail: c.env.MAIL_PROVIDER, pdf: c.env.PDF_PROVIDER, storage: c.env.STORAGE_PROVIDER, financing: c.env.FINANCING_PROVIDER } }));

/* ---------------- Leads B2C ---------------- */
app.post('/lead', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(c.env, `lead:${ip}`, 10, 600))) return jsonError(c, 429, 'Demasiadas solicitudes');
  const body = await c.req.json().catch(() => null);
  if (!body || body.honeypot) return jsonError(c, 400, 'Solicitud inválida');
  if (!body.nombre || !body.whatsapp) return jsonError(c, 422, 'Nombre y WhatsApp son obligatorios');
  if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstile, ip))) return jsonError(c, 403, 'Verificación anti-spam fallida');

  const { crm, mail } = getProviders(c.env);
  const lead = {
    tipo: String(body.tipo || 'contacto'),
    nombre: String(body.nombre).slice(0, 120),
    whatsapp: String(body.whatsapp).replace(/\D/g, '').slice(0, 15),
    email: body.email ? String(body.email).slice(0, 160) : '',
    ciudad: String(body.ciudad || '').slice(0, 80),
    uso: String(body.uso || ''),
    cantidad: Number(body.cantidad || 1),
    vehiculo: String(body.vehiculo || ''),
    simulacion: body.simulacion ? safeJson(body.simulacion) : null,
    prueba_modalidad: String(body.prueba_modalidad || 'no'),
    prueba_fecha: String(body.prueba_fecha || ''),
    prueba_ciudad: String(body.prueba_ciudad || ''),
    fuente: String(body.fuente || ''),
    url: String(body.url || ''),
    score: 0,
    ts: new Date().toISOString()
  };
  lead.score = scoreFor(lead);
  const crmRes = await crm.upsertLead(lead);
  await mail.send({ to: c.env.ADVISOR_EMAIL, subject: `Nuevo lead ${lead.tipo}: ${lead.nombre} · ${lead.vehiculo || 'sin vehículo'}`, html: leadEmailHtml(lead) });
  return c.json({ ok: true, id: crmRes.id, score: lead.score });
});

/* ---------------- Solicitud de acceso B2B ----------------
 * Cuentas NUEVAS de cliente: el tema ya no puede crear cuentas con `form 'create_customer'`, así que
 * este endpoint es el único camino de alta corporativa. Cubre los dos casos de la propuesta (pág. 6,
 * "creación de cuenta con NIT validado" antes del login):
 *   - visitante sin sesión  → se crea el cliente
 *   - cliente B2C con sesión → se convierte su cuenta existente
 * En ambos escribe los metafields brenson_b2b.* y el tag b2b-pendiente en la misma llamada, de modo
 * que el guard del tema ve el estado correcto desde el primer render, sin depender de Shopify Flow.
 */
app.post('/b2b/request', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.nit || !body.razon_social) return jsonError(c, 422, 'Datos incompletos');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email))) return jsonError(c, 422, 'Correo inválido');
  // El rate limit va DESPUÉS de validar: si contara los envíos malformados, cinco errores de tipeo
  // bastarían para dejar a una empresa legítima bloqueada una hora. Validar no cuesta E/S, así que
  // un bot con basura no consume cupo. 10/hora deja margen para reintentos honestos (una oficina
  // entera comparte una sola IP pública) sin abrir la puerta a un alta masiva.
  if (!(await rateLimit(c.env, `b2b:${ip}`, 10, 3600))) return jsonError(c, 429, 'Recibimos varias solicitudes desde esta conexión. Espere unos minutos o escríbanos por WhatsApp y la tramitamos de inmediato.');
  if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstile, ip))) return jsonError(c, 403, 'Verificación anti-spam fallida');

  const email = String(body.email).trim().slice(0, 160);
  const nit = String(body.nit_completo || body.nit).slice(0, 20);
  const { crm, mail } = getProviders(c.env);
  const note = 'B2B ' + JSON.stringify({ razon_social: body.razon_social, nit, sector: body.sector, ciudad: body.ciudad, flota_estimada: body.flota_estimada, cargo: body.cargo, whatsapp: body.whatsapp, ts: body.ts });

  let customerId = '';
  let creado = false;
  let uploadToken = '';
  if (c.env.SHOPIFY_ADMIN_TOKEN) {
    // Todo el bloque de Admin API va en un try: este endpoint es el ÚNICO camino de alta corporativa,
    // así que un token vencido o un fallo de Shopify no puede salir como 500 crudo. La solicitud se
    // pierde de todos modos, pero el visitante recibe una salida (WhatsApp) en vez de un error mudo.
    const nombre = String(body.nombre || '').slice(0, 60);
    const apellido = String(body.apellido || '').slice(0, 60);
    try {
      const existente = await findCustomerByEmail(c.env, email);
      // Solo completa el nombre si el cliente no lo tiene: no pisa el que ya haya puesto.
      const faltantes: { firstName?: string; lastName?: string } = {};
      if (existente) {
        // Ya aprobado: no se degrada a pendiente por reenviar el formulario.
        if (existente.tags.includes('cliente-corporativo')) return c.json({ ok: true, ya_aprobado: true, customer_id: existente.id.split('/').pop() });
        customerId = existente.id;
        if (!existente.firstName && nombre) faltantes.firstName = nombre;
        if (!existente.lastName && apellido) faltantes.lastName = apellido;
      } else {
        customerId = await createCustomer(c.env, { email, firstName: nombre, lastName: apellido, note });
        creado = true;
      }
      await updateCustomerNoteAndTags(c.env, customerId, note, ['b2b-pendiente'], faltantes);
      uploadToken = await signToken(c.env, `upload:${customerId.split('/').pop()}`, UPLOAD_TOKEN_TTL);
      await setCustomerMetafields(c.env, customerId, [
        // El tema lo renderiza solo para el propio cliente con sesión (pantalla "pendiente"), igual que
        // accept_token en cotizaciones: así la subida posterior también va firmada sin exponer el token.
        { key: 'upload_token', value: uploadToken, type: 'single_line_text_field' },
        { key: 'tipo_cliente', value: 'empresa', type: 'single_line_text_field' },
        { key: 'estado_b2b', value: 'pendiente', type: 'single_line_text_field' },
        { key: 'nit', value: nit, type: 'single_line_text_field' },
        { key: 'razon_social', value: String(body.razon_social).slice(0, 200), type: 'single_line_text_field' },
        { key: 'sector', value: String(body.sector || ''), type: 'single_line_text_field' },
        { key: 'cargo_contacto', value: String(body.cargo || '').slice(0, 120), type: 'single_line_text_field' },
        { key: 'flota_estimada', value: String(parseInt(body.flota_estimada, 10) || 0), type: 'number_integer' }
      ]);
    } catch (e) {
      console.error('[b2b] alta corporativa falló para', email, e);
      // Aviso al asesor para que la solicitud no se pierda por un problema de configuración.
      await mail.send({ to: c.env.ADVISOR_EMAIL, subject: `[FALLÓ] Solicitud B2B no registrada: ${body.razon_social}`, html: `<p>La solicitud no pudo guardarse en Shopify (¿token vencido o sin scope <code>write_customers</code>?). Contactar manualmente.</p><pre>${escapeHtml(note)}</pre><p>Correo: ${escapeHtml(email)}</p>` }).catch(() => {});
      return jsonError(c, 502, 'No pudimos registrar la solicitud en este momento. Escríbanos por WhatsApp y la tramitamos de inmediato.');
    }
  } else {
    console.info('[mock shopify] alta B2B pendiente para', email, note);
    customerId = 'gid://shopify/Customer/0';
  }

  const numericId = customerId.split('/').pop() as string;
  await crm.upsertLead({ tipo: 'b2b_solicitud', nombre: `${body.nombre || ''} ${body.apellido || ''}`.trim(), email, whatsapp: String(body.whatsapp || '').replace(/\D/g, ''), empresa: body.razon_social, nit, sector: body.sector, flota: body.flota_estimada, score: 40, ts: new Date().toISOString() });
  await mail.send({ to: c.env.ADVISOR_EMAIL, subject: `Solicitud B2B: ${body.razon_social} (NIT ${nit})`, html: `<p>Nueva solicitud de acceso corporativo. Cuenta ${creado ? 'creada' : 'existente, convertida'}.</p><pre>${escapeHtml(note)}</pre><p>Aprobar en Shopify Admin: cambiar el tag a <b>cliente-corporativo</b>, poner <b>estado_b2b = aprobado</b> y asignar tier y asesor.</p>` });

  // Mismo token que quedó en el metafield: el paso 2 (documento) queda atado a este cliente sin sesión.
  return c.json({ ok: true, customer_id: numericId, email, upload_token: uploadToken || await signToken(c.env, `upload:${numericId}`, UPLOAD_TOKEN_TTL) });
});

/* ---------------- Upload documento B2B ---------------- */
app.post('/upload', async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return jsonError(c, 400, 'multipart requerido');
  const file = form.get('file') as unknown as File | string | null;
  const tipo = String(form.get('tipo') || 'camara_comercio');
  const email = String(form.get('email') || '');
  const customerId = String(form.get('customer_id') || '');
  const token = form.get('token');
  // Siempre con token: el que devolvió /b2b/request (paso 2 sin sesión) o el que el tema toma del
  // metafield brenson_b2b.upload_token (pantalla "pendiente" con sesión). Sin esto, un customer_id
  // ajeno adivinado bastaba para sobrescribir el documento de otra empresa.
  if (!customerId || !(await verifyToken(c.env, `upload:${customerId}`, token ? String(token) : undefined))) return jsonError(c, 403, 'Enlace de subida inválido o vencido. Escríbanos por WhatsApp y le ayudamos a adjuntar el documento.');
  if (!file || typeof file === 'string') return jsonError(c, 422, 'Archivo requerido');
  const max = Number(c.env.UPLOAD_MAX_BYTES || 5242880);
  if (file.size > max) return jsonError(c, 413, 'Archivo supera 5 MB');
  if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(file.type)) return jsonError(c, 415, 'Solo PDF o imagen');

  const { storage } = getProviders(c.env);
  const key = `b2b/${customerId || 'anon'}/${Date.now()}-${tipo}.${file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]}`;
  const stored = await storage.put(key, file, { contentType: file.type, email, customerId, tipo });
  // Enlace firmado de 180 días para que el equipo de habilitación abra el documento desde el Admin (bucket privado)
  const url = stored.startsWith('r2://') ? new URL(await signPath(c.env, `/docs/${key}`, 60 * 60 * 24 * 180), c.req.url).toString() : stored;
  if (c.env.SHOPIFY_ADMIN_TOKEN && customerId) {
    await setCustomerMetafield(c.env, `gid://shopify/Customer/${customerId}`, 'brenson_b2b', 'documento_url', url, 'url');
    await setCustomerMetafield(c.env, `gid://shopify/Customer/${customerId}`, 'brenson_b2b', 'documento_tipo', tipo, 'single_line_text_field');
  }
  return c.json({ ok: true, key, url });
});

/* ---------------- Cotización de flota ---------------- */
app.post('/quote', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || !body.items.length) return jsonError(c, 422, 'Sin ítems');
  const { crm, mail, pdf } = getProviders(c.env);

  // Recalcular server-side: precios reales desde Shopify (o los enviados si no hay token, en modo simulación)
  const quote = await computeQuote(c.env, body);
  quote.numero = await nextQuoteNumber(c.env);
  const html = quoteHtml(quote, c.env);
  let pdfUrl = await pdf.render({ id: quote.numero, html, template: c.env.PDFMONKEY_TEMPLATE_QUOTE, data: quote });
  // Proveedor HTML: el enlace se firma (30 días) para que el número de cotización no sea adivinable (Módulo 18)
  if (pdfUrl.startsWith('/quotes/')) pdfUrl = new URL(await signPath(c.env, `/quotes/${quote.numero}`), c.req.url).toString();
  quote.pdf_url = pdfUrl;

  if (c.env.SHOPIFY_ADMIN_TOKEN) {
    const fields = [
      { key: 'numero', value: quote.numero },
      { key: 'cliente', value: `gid://shopify/Customer/${body.customer_id}` },
      // El portal filtra por este campo, no por `cliente`: un customer_reference no se resuelve de
      // forma fiable desde Liquid en el storefront, así que "Mis cotizaciones" salía siempre vacío.
      { key: 'cliente_id', value: String(body.customer_id) },
      { key: 'items', value: JSON.stringify(quote.items) },
      { key: 'subtotal', value: JSON.stringify({ amount: String(quote.subtotal_publico), currency_code: 'COP' }) },
      { key: 'descuento_pct', value: String(quote.descuento_pct) },
      { key: 'total', value: JSON.stringify({ amount: String(quote.total), currency_code: 'COP' }) },
      { key: 'total_formateado', value: fmt(quote.total) },
      { key: 'validez_dias', value: String(quote.validez_dias) },
      { key: 'estado', value: quote.estado },
      { key: 'observaciones', value: quote.observaciones || '' },
      { key: 'pdf_url', value: pdfUrl },
      { key: 'creada_en', value: quote.creada_en }
    ];
    // El token de aceptación solo tiene sentido una vez la cotización es visible para el cliente
    // (estado 'enviada'); un borrador todavía puede cambiar de ítems y precios.
    if (quote.estado === 'enviada') {
      const acceptToken = await signToken(c.env, `accept:${quote.numero}`, 60 * 60 * 24 * (quote.validez_dias + 2));
      fields.push({ key: 'accept_token', value: acceptToken });
    }
    await shopifyAdmin(c.env, `mutation($m: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $m) { metaobject { id } userErrors { message } } }`, {
      m: { type: 'brenson_cotizacion_b2b', handle: quote.numero.toLowerCase(), fields }
    });
  }
  if (quote.estado === 'enviada') {
    await mail.send({ to: body.email, subject: `Cotización ${quote.numero} · Brenson Empresas`, html: `<p>Adjuntamos su cotización de flota. Validez ${quote.validez_dias} días.</p><p><a href="${pdfUrl}">Descargar PDF</a></p>` });
    await mail.send({ to: c.env.ADVISOR_EMAIL, subject: `[B2B] ${body.empresa} generó ${quote.numero} · ${quote.unidades} unidades · ${quote.total.toLocaleString('es-CO')} COP`, html: `<p><a href="${pdfUrl}">PDF</a></p><p>${escapeHtml(quote.observaciones || '')}</p>` });
    await crm.upsertLead({ tipo: 'b2b_cotizacion', email: body.email, empresa: body.empresa, whatsapp: '', nombre: body.empresa, score: 50, cotizacion: quote.numero, total: quote.total, unidades: quote.unidades, ts: quote.creada_en });
  }
  return c.json({ ok: true, numero: quote.numero, pdf_url: pdfUrl, total: quote.total, unidades: quote.unidades });
});

app.get('/quotes/:id', async (c) => {
  const id = c.req.param('id').replace(/\.pdf$/, '');
  if (!(await verifySignedPath(c.env, `/quotes/${id}`, c.req.query('exp'), c.req.query('sig')))) return jsonError(c, 403, 'Enlace inválido o vencido');
  const { pdf } = getProviders(c.env);
  const html = await pdf.get(id);
  if (!html) return c.notFound();
  return c.html(html);
});

/**
 * Aceptar cotización → pedido borrador (Módulo 08, decisión "Opción A").
 *
 * Todo ocurre en una sola llamada atómica en el servidor: crear el draft order con el precio
 * negociado congelado línea por línea y marcar la cotización como aceptada. Si quedara como dos
 * pasos (aceptar, y luego que el asesor genere el pedido a mano), se reintroduce el riesgo que este
 * endpoint existe para eliminar: que el valor del PDF y el del pedido no coincidan.
 */
app.post('/quotes/:numero/accept', async (c) => {
  const numero = c.req.param('numero');
  const body = await c.req.json().catch(() => null);
  if (!body || !body.customer_id || !body.token) return jsonError(c, 422, 'Solicitud inválida');
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(c.env, `accept:${ip}`, 5, 600))) return jsonError(c, 429, 'Demasiados intentos, intente más tarde');

  const quote = await fetchQuoteByNumero(c.env, numero);
  if (!quote) return jsonError(c, 404, 'Cotización no encontrada');
  if (!(await verifyToken(c.env, `accept:${numero}`, body.token))) return jsonError(c, 403, 'Enlace inválido o vencido');
  if (quote.clienteId !== String(body.customer_id)) return jsonError(c, 403, 'Esta cotización no pertenece a este cliente');

  if (quote.estado === 'aceptada' || quote.pedidoBorradorId) return c.json({ ok: true, numero, ya_aceptada: true });
  if (quote.estado === 'vencida' || quote.estado === 'rechazada') return jsonError(c, 409, `Cotización ${quote.estado}`);
  if (quote.estado !== 'enviada') return jsonError(c, 409, 'La cotización debe enviarse antes de aceptarse');

  const vence = Date.parse(quote.creadaEn) + quote.validezDias * 864e5;
  if (vence < Date.now()) {
    await updateQuoteMetaobject(c.env, quote.id, [{ key: 'estado', value: 'vencida' }]);
    return jsonError(c, 410, 'La cotización venció');
  }

  const { mail } = getProviders(c.env);
  const draft = await createDraftOrder(c.env, {
    customerId: `gid://shopify/Customer/${quote.clienteId}`,
    items: quote.items,
    note: `Generado desde cotización ${numero}`,
    tags: ['b2b-cotizacion', numero]
  });

  await updateQuoteMetaobject(c.env, quote.id, [
    { key: 'estado', value: 'aceptada' },
    { key: 'pedido_borrador_id', value: draft.id },
    { key: 'pedido_borrador_url', value: draft.invoiceUrl || '' }
  ]);

  const numericId = draft.id.split('/').pop();
  await mail.send({
    to: quote.asesorEmail || c.env.ADVISOR_EMAIL,
    subject: `[ACEPTADA] ${numero} · pedido borrador ${draft.name}`,
    html: `<p>El cliente aceptó la cotización ${numero} por ${fmt(quote.total)}.</p><p><a href="https://${c.env.SHOPIFY_SHOP}/admin/draft_orders/${numericId}">Abrir pedido borrador en Shopify Admin</a></p>`
  });

  return c.json({ ok: true, numero, pedido_borrador: draft.name });
});

/* ---------------- Consulta de cupo disponible (Addi) ----------------
 * Sirve tanto al flujo B2C (ficha de producto) como al B2B (cotizador de flota): en ambos casos el
 * cupo se consulta contra la PERSONA que diligencia el formulario, nunca contra la razón social —
 * Addi evalúa personas naturales, no tiene producto de crédito para NIT. `contexto` solo cambia el
 * tipo de lead que se registra en el CRM, no la lógica de la consulta.
 */
app.post('/financing/disponible', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  if (!(await rateLimit(c.env, `addi:${ip}`, 8, 3600))) return jsonError(c, 429, 'Demasiadas consultas desde esta conexión. Intenta de nuevo en un momento.');
  const body = await c.req.json().catch(() => null);
  if (!body || body.honeypot) return jsonError(c, 400, 'Solicitud inválida');
  if (!body.tipo_documento || !body.numero_documento || !body.nombres || !body.apellidos || !body.celular || !body.email) return jsonError(c, 422, 'Completa todos los campos');
  if (!/^\d{5,15}$/.test(String(body.numero_documento))) return jsonError(c, 422, 'Número de documento inválido');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email))) return jsonError(c, 422, 'Correo inválido');
  if (!body.acepta_datos) return jsonError(c, 422, 'Debes autorizar el tratamiento de datos para consultar tu cupo');
  if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstile, ip))) return jsonError(c, 403, 'Verificación anti-spam fallida');

  const { financing, crm } = getProviders(c.env);
  const contexto = body.contexto === 'b2b' ? 'b2b' : 'b2c';
  const result = await financing.checkAvailability({
    tipoDocumento: String(body.tipo_documento).slice(0, 4),
    numeroDocumento: String(body.numero_documento),
    nombres: String(body.nombres).slice(0, 80),
    apellidos: String(body.apellidos).slice(0, 80),
    celular: String(body.celular).replace(/\D/g, '').slice(0, 15),
    email: String(body.email).slice(0, 160),
    montoSolicitado: Number(body.monto_solicitado || 0),
    contexto
  });

  // Se registra el intento en el CRM sin importar el resultado: es una señal de intención de compra
  // financiada más fuerte que ver la ficha, aunque no llegue al nivel de "solicitó cotización" (+30).
  await crm.upsertLead({
    tipo: contexto === 'b2b' ? 'b2b_consulta_addi' : 'consulta_addi',
    nombre: `${body.nombres} ${body.apellidos}`.trim(),
    email: String(body.email),
    whatsapp: String(body.celular).replace(/\D/g, ''),
    vehiculo: String(body.vehiculo || ''),
    monto_solicitado: Number(body.monto_solicitado || 0),
    resultado_addi: result.estado,
    score: result.estado === 'aprobado' ? 35 : 20,
    ts: new Date().toISOString()
  });

  return c.json({ ok: result.ok, estado: result.estado, cupo_disponible: result.cupoDisponible, mensaje: result.mensaje, redirect_url: result.redirectUrl });
});

/* ---------------- Documentos B2B (bucket privado, enlace firmado) ---------------- */
app.get('/docs/*', async (c) => {
  const key = c.req.path.replace(/^\/docs\//, '');
  if (!(await verifySignedPath(c.env, `/docs/${key}`, c.req.query('exp'), c.req.query('sig')))) return jsonError(c, 403, 'Enlace inválido o vencido');
  if (!c.env.DOCS) return jsonError(c, 501, 'Storage R2 no configurado');
  const obj = await c.env.DOCS.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream', 'Content-Disposition': `inline; filename="${key.split('/').pop()}"`, 'Cache-Control': 'private, no-store' } });
});

/* ---------------- Ficha técnica PDF ---------------- */
app.get('/ficha/:handle', async (c) => {
  const handle = c.req.param('handle').replace(/\.pdf$/, '');
  const html = await specSheetHtml(c.env, handle);
  if (!html) return c.notFound();
  const { pdf } = getProviders(c.env);
  const url = await pdf.render({ id: `ficha-${handle}`, html, template: c.env.PDFMONKEY_TEMPLATE_SPEC, data: { handle } });
  return url.startsWith('http') ? c.redirect(url) : c.html(html);
});

/* ---------------- Webhooks Shopify → CRM ---------------- */
app.post('/webhooks/shopify/:topic', async (c) => {
  const raw = await c.req.text();
  if (c.env.SHOPIFY_WEBHOOK_SECRET && !(await verifyShopifyHmac(raw, c.req.header('X-Shopify-Hmac-Sha256') || '', c.env.SHOPIFY_WEBHOOK_SECRET))) return jsonError(c, 401, 'HMAC inválido');
  const topic = c.req.param('topic');
  const data = JSON.parse(raw);
  const { crm } = getProviders(c.env);
  switch (topic) {
    case 'customers-create':
    case 'customers-update': {
      const tags: string[] = String(data.tags || '').split(',').map((t: string) => t.trim());
      const isB2B = tags.includes('cliente-corporativo');
      await crm.upsertLead({ tipo: isB2B ? 'b2b_aprobado' : 'cliente', email: data.email, nombre: `${data.first_name || ''} ${data.last_name || ''}`.trim(), whatsapp: String(data.phone || '').replace(/\D/g, ''), tags, score: isB2B ? 40 : 0, ts: new Date().toISOString() });
      break;
    }
    case 'checkouts-create':
      await crm.event({ tipo: 'carrito_abandonado', email: data.email, total: data.total_price, url: data.abandoned_checkout_url, ts: new Date().toISOString() });
      break;
    case 'orders-create':
      await crm.event({ tipo: 'pedido_creado', email: data.email, order: data.name, total: data.total_price, ts: new Date().toISOString() });
      break;
    case 'orders-fulfilled':
      await crm.event({ tipo: 'pedido_entregado', email: data.email, order: data.name, ts: new Date().toISOString() });
      break;
    default:
      console.info('[webhook] topic sin manejador', topic);
  }
  return c.json({ ok: true });
});

export default app;

/* ---------------- helpers ---------------- */
function safeJson(v: unknown) { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } }
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string)); }
function leadEmailHtml(l: Record<string, unknown>) {
  const rows = Object.entries(l).filter(([k]) => !['ts'].includes(k)).map(([k, v]) => `<tr><td style="padding:4px 8px;color:#6b7280">${k}</td><td style="padding:4px 8px"><b>${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''))}</b></td></tr>`).join('');
  return `<h2 style="font-family:Arial">Nuevo lead · score ${l.score}</h2><table style="font-family:Arial;font-size:14px">${rows}</table>`;
}
