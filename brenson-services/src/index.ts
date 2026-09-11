/**
 * brenson-services — Cloudflare Worker (Hono)
 * Endpoints:
 *   POST /lead              lead B2C (cotización, financiamiento, contacto, prueba de manejo) → CRM
 *   POST /b2b/request       conversión de cuenta personal a corporativa → nota + tag pendiente + CRM (+40)
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
import { verifyShopifyHmac, shopifyAdmin, findCustomerByEmail, updateCustomerNoteAndTags, setCustomerMetafield } from './lib/shopify';
import { computeQuote, quoteHtml, specSheetHtml, nextQuoteNumber } from './lib/quote';
import { verifyTurnstile, rateLimit, jsonError, scoreFor } from './lib/util';

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

/* ---------------- Solicitud B2B (cuenta existente) ---------------- */
app.post('/b2b/request', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.nit || !body.razon_social) return jsonError(c, 422, 'Datos incompletos');
  const { crm, mail } = getProviders(c.env);
  const note = 'B2B ' + JSON.stringify({ razon_social: body.razon_social, nit: body.nit_completo || body.nit, sector: body.sector, ciudad: body.ciudad, flota_estimada: body.flota_estimada, cargo: body.cargo, whatsapp: body.whatsapp, ts: body.ts });
  if (c.env.SHOPIFY_ADMIN_TOKEN) {
    const customer = await findCustomerByEmail(c.env, body.email);
    if (!customer) return jsonError(c, 404, 'Cliente no encontrado');
    await updateCustomerNoteAndTags(c.env, customer.id, note, ['b2b-pendiente']);
    await setCustomerMetafield(c.env, customer.id, 'brenson_b2b', 'estado_b2b', 'pendiente', 'single_line_text_field');
  } else {
    console.info('[mock shopify] nota+tag b2b-pendiente para', body.email, note);
  }
  await crm.upsertLead({ tipo: 'b2b_solicitud', nombre: `${body.nombre || ''} ${body.apellido || ''}`.trim(), email: body.email, whatsapp: String(body.whatsapp || '').replace(/\D/g, ''), empresa: body.razon_social, nit: body.nit_completo || body.nit, sector: body.sector, flota: body.flota_estimada, score: 40, ts: new Date().toISOString() });
  await mail.send({ to: c.env.ADVISOR_EMAIL, subject: `Solicitud B2B: ${body.razon_social} (NIT ${body.nit_completo || body.nit})`, html: `<p>Nueva solicitud de acceso corporativo.</p><pre>${escapeHtml(note)}</pre><p>Aprobar en Shopify Admin: cambiar tag a <b>cliente-corporativo</b> y asignar tier y asesor.</p>` });
  return c.json({ ok: true });
});

/* ---------------- Upload documento B2B ---------------- */
app.post('/upload', async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return jsonError(c, 400, 'multipart requerido');
  const file = form.get('file');
  const tipo = String(form.get('tipo') || 'camara_comercio');
  const email = String(form.get('email') || '');
  const customerId = String(form.get('customer_id') || '');
  if (!(file instanceof File)) return jsonError(c, 422, 'Archivo requerido');
  const max = Number(c.env.UPLOAD_MAX_BYTES || 5242880);
  if (file.size > max) return jsonError(c, 413, 'Archivo supera 5 MB');
  if (!/^(application\/pdf|image\/(png|jpe?g|webp))$/.test(file.type)) return jsonError(c, 415, 'Solo PDF o imagen');

  const { storage } = getProviders(c.env);
  const key = `b2b/${customerId || 'anon'}/${Date.now()}-${tipo}.${file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1]}`;
  const url = await storage.put(key, file, { contentType: file.type, email, customerId, tipo });
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
  const pdfUrl = await pdf.render({ id: quote.numero, html, template: c.env.PDFMONKEY_TEMPLATE_QUOTE, data: quote });
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
  const { pdf } = getProviders(c.env);
  const html = await pdf.get(c.req.param('id').replace(/\.pdf$/, ''));
  if (!html) return c.notFound();
  return c.html(html);
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
