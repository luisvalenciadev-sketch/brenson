import type { Env, Quote, QuoteItem } from '../types';
import { fetchVariants, fetchCustomerTier, shopifyAdmin } from './shopify';

/**
 * Formato de moneda colombiano: separador de miles con punto y sin decimales ($ 10.304.000).
 * Se exporta porque el portal guarda este mismo texto en el metaobjeto (`total_formateado`): así la
 * cifra del PDF y la de la tabla "Mis cotizaciones" salen del mismo formateador y no pueden diferir.
 */
export const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/** Cuota mensual, sistema francés. Misma fórmula que brenson-simulator.js y brenson-price.liquid. */
export function cuotaMensual(precio: number, inicialPct: number, plazo: number, tasaPct: number): number {
  const P = precio * (1 - inicialPct / 100);
  const i = tasaPct / 100;
  if (plazo <= 0) return 0;
  if (i === 0) return Math.round(P / plazo);
  const f = Math.pow(1 + i, plazo);
  return Math.round((P * i * f) / (f - 1));
}

/** Calcula los ítems de una cotización aplicando el % de descuento del tier (o el override por producto). */
export function computeItems(items: { variant_id: string; cantidad: number; handle?: string; title?: string; variant?: string; sku?: string; precio_publico?: number }[], tierPct: number, tierCode: string | null, variants: Record<string, { price: number; title: string; productTitle: string; handle: string; sku: string; tierOverride: Record<string, number> | null; minB2B: number; b2bDisponible: boolean }> | null): QuoteItem[] {
  return items.filter((it) => it.cantidad > 0).map((it) => {
    const v = variants ? variants[String(it.variant_id).split('/').pop()!] : null;
    const price = v ? v.price : Math.round(Number(it.precio_publico || 0));
    // Misma regla que la Function del checkout: sin brenson.b2b_disponible = true no hay precio
    // corporativo. Si la cotización descontara y el checkout no, el cliente vería dos precios distintos.
    const pct = v && !v.b2bDisponible ? 0
      : v && v.tierOverride && tierCode && v.tierOverride[tierCode] != null ? v.tierOverride[tierCode] : tierPct;
    const qty = v ? Math.max(it.cantidad, v.minB2B) : it.cantidad;
    const unit = Math.round(price * (1 - pct / 100));
    return { handle: v ? v.handle : (it.handle || ''), title: v ? v.productTitle : (it.title || ''), variant_id: String(it.variant_id), variant: v ? v.title : (it.variant || ''), sku: v ? v.sku : (it.sku || ''), cantidad: qty, precio_publico: price, descuento_pct: pct, precio_unitario: unit, subtotal: unit * qty, subtotal_publico: price * qty };
  });
}

export async function computeQuote(env: Env, body: any): Promise<Quote> {
  let tierPct = Number(body.descuento_pct || 0), tierCode: string | null = null, tierName = String(body.tier || '');
  let variants = null;
  if (env.SHOPIFY_ADMIN_TOKEN && body.customer_id) {
    const tier = await fetchCustomerTier(env, String(body.customer_id));
    if (!tier) throw new Error('Cliente sin tier B2B aprobado');
    tierPct = tier.descuento; tierCode = tier.codigo; tierName = tier.nombre;
    variants = await fetchVariants(env, body.items.map((i: any) => String(i.variant_id)));
  }
  const items = computeItems(body.items, tierPct, tierCode, variants);
  const subtotal_publico = items.reduce((a, i) => a + i.subtotal_publico, 0);
  const total = items.reduce((a, i) => a + i.subtotal, 0);
  return {
    numero: '', estado: body.estado === 'borrador' ? 'borrador' : 'enviada',
    empresa: String(body.empresa || ''), email: String(body.email || ''), tier: tierName, descuento_pct: tierPct,
    validez_dias: Number(body.validez_dias || env.QUOTE_VALIDITY_DAYS || 15), observaciones: String(body.observaciones || '').slice(0, 1000),
    items, subtotal_publico, descuento: subtotal_publico - total, total, unidades: items.reduce((a, i) => a + i.cantidad, 0), creada_en: new Date().toISOString()
  };
}

/**
 * Consecutivo de cotización.
 *
 * El contador vive en KV, pero KV puede estar vacío aunque la tienda ya tenga cotizaciones: es lo que
 * pasó al sembrar datos de prueba directamente en Shopify sin pasar por el worker. El contador
 * arrancó en 0 y reemitió COT-2026-0001, 0002 y 0003, que ya existían. Shopify solo desambigua el
 * HANDLE (le agrega "-1"), no el campo `numero`, así que quedaron números duplicados entre empresas
 * distintas — inaceptable en un documento comercial.
 *
 * Por eso, cuando KV no tiene contador, se siembra a partir del número más alto que ya exista en la
 * tienda en vez de asumir cero.
 */
export async function nextQuoteNumber(env: Env): Promise<string> {
  const year = new Date().getFullYear();
  const key = `quote-seq:${year}`;
  let actual = Number((env.KV && (await env.KV.get(key))) || 0);
  if (!actual) actual = await maxQuoteNumberEnShopify(env, year);
  const n = actual + 1;
  if (env.KV) await env.KV.put(key, String(n));
  return `COT-${year}-${String(n).padStart(4, '0')}`;
}

async function maxQuoteNumberEnShopify(env: Env, year: number): Promise<number> {
  if (!env.SHOPIFY_ADMIN_TOKEN) return 0;
  try {
    const data = await shopifyAdmin<{ metaobjects: { nodes: { numero: { value: string } | null }[] } }>(env,
      `query { metaobjects(type: "brenson_cotizacion_b2b", first: 250) { nodes { numero: field(key: "numero") { value } } } }`);
    return data.metaobjects.nodes.reduce((max, n) => {
      const m = /^COT-(\d{4})-(\d+)$/.exec(n.numero?.value || '');
      return m && Number(m[1]) === year ? Math.max(max, Number(m[2])) : max;
    }, 0);
  } catch (e) {
    console.error('[quote] no se pudo leer el consecutivo desde Shopify', e);
    return 0;
  }
}

// Paleta del manual de marca (mismos valores que brenson-theme/assets/brenson-tokens.css).
const BRAND = { verde: '#29a800', carbon: '#1e1e1e', font: "Ubuntu,'Helvetica Neue',Arial,sans-serif" };
const BRAND_FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap">';

/**
 * El sello "Certificado Brenson" es una promesa operativa (decisión B14, riesgo R-D3): solo sale si el
 * proceso de inspección está aprobado (CERTIFICACION_ACTIVA=true) Y el producto está marcado
 * explícitamente como certificado. Un metafield ausente ya no basta para mostrarlo.
 */
function certificacionActiva(env: Env) { return env.CERTIFICACION_ACTIVA === 'true'; }

export function quoteHtml(q: Quote, env: Env): string {
  const rows = q.items.map((l) => `<tr><td>${l.cantidad}</td><td>${esc(l.title)}<br><small>${esc(l.variant)}${l.sku ? ' · ' + esc(l.sku) : ''}</small></td><td class="r">${fmt(l.precio_publico)}</td><td class="r">${l.descuento_pct} %</td><td class="r">${fmt(l.precio_unitario)}</td><td class="r"><b>${fmt(l.subtotal)}</b></td></tr>`).join('');
  const vence = new Date(Date.parse(q.creada_en) + q.validez_dias * 864e5).toLocaleDateString('es-CO');
  const mock = env.ENVIRONMENT !== 'production' ? '<p class="mock">DOCUMENTO DE PRUEBA · brenson-services en modo simulación</p>' : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${BRAND_FONT}<title>${q.numero} · Brenson Empresas</title>
<style>body{font-family:${BRAND.font};color:${BRAND.carbon};padding:40px;max-width:900px;margin:auto}h1{margin:0;font-size:22px}.head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${BRAND.verde};padding-bottom:16px;margin-bottom:24px}.logo{font-weight:800;font-size:24px;letter-spacing:-.02em}.logo span{color:${BRAND.verde}}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:10px 8px;border-bottom:1px solid #e3e5e8;font-size:13px;vertical-align:top}th{text-align:left;font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:.06em}.r{text-align:right}.tot{font-size:26px;font-weight:800}.box{background:#f4f4f4;border-radius:8px;padding:16px;margin-top:16px;font-size:13px}.mock{background:#fef3c7;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700}small{color:#6b7280}.green{color:#1f8a4c}</style></head><body>
${mock}<div class="head"><div><div class="logo">BRENSON<span>.</span> Empresas</div><small>División corporativa y flotas · Colombia</small></div><div style="text-align:right"><h1>Cotización ${q.numero}</h1><small>Emitida ${new Date(q.creada_en).toLocaleDateString('es-CO')} · Válida hasta ${vence}</small></div></div>
<p><b>Cliente:</b> ${esc(q.empresa)} · ${esc(q.email)}<br><b>Tier:</b> ${esc(q.tier)} (${q.descuento_pct} % de descuento corporativo)</p>
<table><thead><tr><th>Cant.</th><th>Vehículo</th><th class="r">Precio público</th><th class="r">Dto.</th><th class="r">Precio corporativo</th><th class="r">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
<div style="text-align:right"><div>Subtotal precio público ${fmt(q.subtotal_publico)}</div><div class="green">Descuento corporativo − ${fmt(q.descuento)}</div><div class="tot">Total ${fmt(q.total)}</div><small>${q.unidades} unidades · IVA incluido</small></div>
<div class="box"><b>Observaciones:</b> ${esc(q.observaciones || '—')}<br><br><b>Modalidades de pago:</b> transferencia / PSE · crédito 30/60 días (sujeto a aprobación) · leasing con aliado · tarjeta en línea.<br><b>Garantía:</b> según ficha de cada modelo${certificacionActiva(env) ? ', con Certificación Brenson de 12 puntos' : ''}. <br><b>Condiciones:</b> precios sujetos a disponibilidad y a confirmación del asesor. Esta cotización no constituye orden de compra. [BORRADOR: condiciones legales pendientes]</div>
</body></html>`;
}

export async function specSheetHtml(env: Env, handle: string): Promise<string | null> {
  if (!env.SHOPIFY_ADMIN_TOKEN) return `<!doctype html><html lang="es"><body style="font-family:Arial;padding:40px"><p style="background:#fef3c7;padding:8px 12px;border-radius:8px">Ficha técnica de demostración · ${esc(handle)}</p><h1>Brenson · ${esc(handle)}</h1><p>La ficha real se genera desde los metafields del producto cuando brenson-services tiene acceso a la tienda.</p></body></html>`;
  const data = await shopifyAdmin<{ productByHandle: { title: string; description: string; metafields: { nodes: { key: string; value: string }[] }; featuredImage: { url: string } | null } | null }>(env,
    `query($h: String!) { productByHandle(handle: $h) { title description featuredImage { url } metafields(first: 40, namespace: "brenson") { nodes { key value } } } }`, { h: handle });
  const p = data.productByHandle; if (!p) return null;
  const mf = Object.fromEntries(p.metafields.nodes.map((m) => [m.key, m.value]));
  const row = (l: string, v?: string, u = '') => (v ? `<tr><td>${l}</td><td class="r"><b>${esc(v)}${u}</b></td></tr>` : '');
  // Una sección sin datos no se imprime: un título "Batería" vacío se lee como ficha incompleta.
  const section = (title: string, rows: string) => (rows ? `<h2>${title}</h2><table>${rows}</table>` : '');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">${BRAND_FONT}<title>${esc(p.title)} · Ficha técnica</title><style>body{font-family:${BRAND.font};color:${BRAND.carbon};padding:40px;max-width:800px;margin:auto}h1{margin:0}img{display:block;max-width:100%;max-height:300px;margin:12px auto;object-fit:contain;border-radius:12px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}td{padding:8px;border-bottom:1px solid #e3e5e8;font-size:13px}.r{text-align:right}h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:24px 0 0}.seal{display:inline-block;background:#e6f4ec;color:#1f8a4c;padding:6px 12px;border-radius:999px;font-weight:700;font-size:12px}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:800;font-size:22px">BRENSON<span style="color:${BRAND.verde}">.</span></div>${certificacionActiva(env) && mf.certificado === 'true' ? '<span class="seal">Certificado Brenson · 12 puntos de inspección</span>' : ''}</div>
<h1>${esc(p.title)}</h1><p>${esc(mf.descripcion_corta || '')}</p>${p.featuredImage ? `<img src="${p.featuredImage.url}&width=800" alt="">` : ''}
${section('Rendimiento', row('Autonomía', mf.autonomia_km, ' km') + row('Velocidad máxima', mf.velocidad_max_kmh, ' km/h') + row('Potencia del motor', mf.potencia_motor_w, ' W') + row('Pasajeros', mf.pasajeros))}
${section('Batería', row('Tipo', mf.bateria_tipo) + row('Capacidad', mf.bateria_capacidad) + row('Tiempo de carga', mf.tiempo_carga_h, ' h') + row('Garantía batería', mf.garantia_bateria_meses, ' meses'))}
${section('Dimensiones y carga', row('Peso', mf.peso_kg, ' kg') + row('Carga máxima', mf.capacidad_carga_kg, ' kg') + ((safe(mf.specs_adicionales) as any[]) || []).map((r) => row(r.label, r.value)).join(''))}
${section('Normativa', row('Requiere licencia', mf.requiere_licencia === 'true' ? 'Sí' : 'No') + row('Requiere SOAT', mf.requiere_soat === 'true' ? 'Sí' : 'No') + row('Garantía vehículo', mf.garantia_meses, ' meses'))}
<p style="font-size:11px;color:#6b7280">Especificaciones sujetas a cambios del fabricante. Brenson S.A.S. · brenson.co</p></body></html>`;
}

function esc(s: string) { return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string)); }
function safe(s?: string) { try { return s ? JSON.parse(s) : null; } catch { return null; } }
