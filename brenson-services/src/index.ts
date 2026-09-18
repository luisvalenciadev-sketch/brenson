/**
 * brenson-services — Cloudflare Worker (Hono)
 * Endpoints:
 *   POST /lead              lead B2C (cotización, financiamiento, contacto, prueba de manejo) → CRM
 *   POST /b2b/request       alta corporativa: crea o convierte el cliente (Admin API) → metafields + tag pendiente + CRM (+40)
 *   POST /upload            documento B2B (multipart) → storage → metafield documento_url
 *   POST /quote             cotización de flota → recalcula con Admin API → PDF → metaobject → email (+50)
 *   GET  /ficha/:handle.pdf ficha técnica generada desde metafields
 *   GET  /quotes/:id.pdf    PDF de cotización (enlace firmado)
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
import { verifyShopifyHmac, shopifyAdmin, findCustomerByEmail, createCustomer, updateCustomerNoteAndTags, setCustomerMetafield, setCustomerMetafields } from './lib/shopify';
import { computeQuote, quoteHtml, specSheetHtml, nextQuoteNumber } from './lib/quote';
import { verifyTurnstile, rateLimit, jsonError, scoreFor, signPath, verifySignedPath, signToken, verifyToken } from './lib/util';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const origins = (c.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return cors({ origin: (o) => (origins.includes(o) ? o : origins[0]), allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'] })(c, next);
});

app.get('/health', (c) => c.json({ ok: true, env: c.env.ENVIRONMENT, providers: { crm: c.env.CRM_PROVIDER, mail: c.env.MAIL_PROVIDER, pdf: c.env.PDF_PROVIDER, storage: c.env.STORAGE_PROVIDER } }));

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
  if (!(await rateLimit(c.env, `b2b:${ip}`, 5, 3600))) return jsonError(c, 429, 'Demasiadas solicitudes. Intente más tarde o escríbanos por WhatsApp.');
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.nit || !body.razon_social) return jsonError(c, 422, 'Datos incompletos');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(body.email))) return jsonError(c, 422, 'Correo inválido');
  if (c.env.TURNSTILE_SECRET && !(await verifyTurnstile(c.env, body.turnstile, ip))) return jsonError(c, 403, 'Verificación anti-spam fallida');

  const email = String(body.email).trim().slice(0, 160);
  const nit = String(body.nit_completo || body.nit).slice(0, 20);
  const { crm, mail } = getProviders(c.env);
  const note = 'B2B ' + JSON.stringify({ razon_social: body.razon_social, nit, sector: body.sector, ciudad: body.ciudad, flota_estimada: body.flota_estimada, cargo: body.cargo, whatsapp: body.whatsapp, ts: body.ts });

  let customerId = '';
  let creado = false;
  if (c.env.SHOPIFY_ADMIN_TOKEN) {
    // Todo el bloque de Admin API va en un try: este endpoint es el ÚNICO camino de alta corporativa,
    // así que un token vencido o un fallo de Shopify no puede salir como 500 crudo. La solicitud se
    // pierde de todos modos, pero el visitante recibe una salida (WhatsApp) en vez de un error mudo.
    try {
      const existente = await findCustomerByEmail(c.env, email);
      if (existente) {
        // Ya aprobado: no se degrada a pendiente por reenviar el formulario.
        if (existente.tags.includes('cliente-corporativo')) return c.json({ ok: true, ya_aprobado: true, customer_id: existente.id.split('/').pop() });
        customerId = existente.id;
      } else {
        customerId = await createCustomer(c.env, { email, firstName: String(body.nombre || '').slice(0, 60), lastName: String(body.apellido || '').slice(0, 60), note });
        creado = true;
      }
      await updateCustomerNoteAndTags(c.env, customerId, note, ['b2b-pendiente']);
      await setCustomerMetafields(c.env, customerId, [
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

  // Token de 1 hora para que el paso 2 (documento) quede atado a este cliente sin sesión iniciada.
  return c.json({ ok: true, customer_id: numericId, email, upload_token: await signToken(c.env, `upload:${numericId}`) });
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
  // El paso 2 sin sesión (alta corporativa recién creada) solo se acepta con el token que devolvió
  // /b2b/request, para que un customer_id ajeno no sirva para sobrescribir el documento de otro.
  if (token && !(await verifyToken(c.env, `upload:${customerId}`, String(token)))) return jsonError(c, 403, 'Token de subida inválido o vencido');
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
    await shopifyAdmin(c.env, `mutation($m: MetaobjectCreateInput!) { metaobjectCreate(metaobject: $m) { metaobject { id } userErrors { message } } }`, {
      m: { type: 'brenson_cotizacion_b2b', handle: quote.numero.toLowerCase(), fields: [
        { key: 'numero', value: quote.numero },
        { key: 'cliente', value: `gid://shopify/Customer/${body.customer_id}` },
        { key: 'items', value: JSON.stringify(quote.items) },
        { key: 'subtotal', value: JSON.stringify({ amount: String(quote.subtotal_publico), currency_code: 'COP' }) },
        { key: 'descuento_pct', value: String(quote.descuento_pct) },
        { key: 'total', value: JSON.stringify({ amount: String(quote.total), currency_code: 'COP' }) },
        { key: 'validez_dias', value: String(quote.validez_dias) },
        { key: 'estado', value: quote.estado },
        { key: 'observaciones', value: quote.observaciones || '' },
        { key: 'pdf_url', value: pdfUrl },
        { key: 'creada_en', value: quote.creada_en }
      ] }
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
