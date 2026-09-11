#!/usr/bin/env node
/**
 * Importa los datos simulados (mock-data/) a la tienda:
 *   1. Colecciones por categoría + destacados + empresas
 *   2. Productos (12 vehículos) con variantes y metafields brenson.*
 *   3. Entradas de metaobjects (financiación, tiers, asesores, certificación, FAQ, testimonios, aliados, contadores, casos, horario)
 *   4. Clientes B2B mock con tags y metafields; unidades; cotizaciones
 * Idempotente por handle. Todo queda marcado como demostración (títulos con [MOCK] donde aplica).
 *
 *   node scripts/import-mocks.mjs [--dry-run] [--only=productos|metaobjects|clientes|colecciones]
 *   Reemplazo real: exporta la plantilla Excel de Brenson a mock-data/vehiculos.json con el mismo esquema y vuelve a correr.
 */
import { readFileSync } from 'node:fs';
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const DRY = dryRun();
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const V = JSON.parse(readFileSync(new URL('../mock-data/vehiculos.json', import.meta.url), 'utf8'));
const M = JSON.parse(readFileSync(new URL('../mock-data/metaobjects.json', import.meta.url), 'utf8'));
const CAT_TITLES = { bicicleta: 'Bicicletas eléctricas', ciclomotor: 'Ciclomotores', motocarro: 'Motocarros', cuadriciclo: 'Cuadriciclos' };
const CAT_HANDLES = { bicicleta: 'bicicletas-electricas', ciclomotor: 'ciclomotores', motocarro: 'motocarros', cuadriciclo: 'cuadriciclos' };

const mf = (key, value, type) => ({ namespace: 'brenson', key, value: typeof value === 'string' ? value : JSON.stringify(value), type });

/* ---------- 1. Colecciones ---------- */
async function collections() {
  const wanted = [
    ...Object.entries(CAT_HANDLES).map(([cat, handle]) => ({ handle, title: CAT_TITLES[cat], rule: { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: cat, conditionObjectId: null, metafield: 'brenson.categoria' } })),
    { handle: 'destacados', title: 'Destacados', manual: true },
    { handle: 'empresas', title: 'Catálogo corporativo', rule: { column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: 'true', metafield: 'brenson.b2b_disponible' }, empresas: true }
  ];
  for (const c of wanted) {
    const ex = DRY ? null : (await gql(`query($h: String!) { collectionByHandle(handle: $h) { id } }`, { h: c.handle })).collectionByHandle;
    if (ex) { console.log(`= colección ${c.handle}`); continue; }
    console.log(`+ colección ${c.handle}`);
    if (DRY) continue;
    const input = { handle: c.handle, title: c.title, templateSuffix: c.empresas ? 'empresas' : null, metafields: c.empresas ? [{ namespace: 'brenson', key: 'solo_empresas', value: 'true', type: 'boolean' }] : [] };
    if (!c.manual) {
      // Regla por metafield: requiere la definición con smartCollectionCondition habilitada (create-definitions lo hace)
      const defId = await metafieldDefinitionId('PRODUCT', 'brenson', c.rule.metafield.split('.')[1]);
      input.ruleSet = { appliedDisjunctively: false, rules: [{ column: 'PRODUCT_METAFIELD_DEFINITION', relation: 'EQUALS', condition: c.rule.condition, conditionObjectId: defId }] };
    }
    const d = await gql(`mutation($i: CollectionInput!) { collectionCreate(input: $i) { collection { id } userErrors { field message } } }`, { i: input });
    userErrors(d.collectionCreate, c.handle);
    await sleep(300);
  }
}
async function metafieldDefinitionId(ownerType, namespace, key) {
  const d = await gql(`query($o: MetafieldOwnerType!, $ns: String!, $k: String!) { metafieldDefinitions(first: 1, ownerType: $o, namespace: $ns, key: $k) { nodes { id } } }`, { o: ownerType, ns: namespace, k: key });
  return d.metafieldDefinitions.nodes[0]?.id || null;
}

/* ---------- 2. Productos ---------- */
async function products() {
  const destacados = [];
  for (const v of V.vehiculos) {
    const metafields = [
      mf('categoria', v.categoria, 'single_line_text_field'), mf('uso', v.uso, 'list.single_line_text_field'),
      mf('autonomia_km', String(v.autonomia_km), 'number_integer'), mf('velocidad_max_kmh', String(v.velocidad_max_kmh), 'number_integer'),
      mf('capacidad_carga_kg', String(v.capacidad_carga_kg), 'number_integer'), mf('potencia_motor_w', String(v.potencia_motor_w), 'number_integer'),
      mf('bateria_tipo', v.bateria_tipo, 'single_line_text_field'), mf('bateria_capacidad', v.bateria_capacidad, 'single_line_text_field'),
      mf('tiempo_carga_h', String(v.tiempo_carga_h), 'number_decimal'), mf('peso_kg', String(v.peso_kg), 'number_decimal'),
      mf('pasajeros', String(v.pasajeros), 'number_integer'), mf('requiere_licencia', String(v.requiere_licencia), 'boolean'), mf('requiere_soat', String(v.requiere_soat), 'boolean'),
      mf('specs_adicionales', v.specs_adicionales, 'json'), mf('garantia_meses', String(v.garantia_meses), 'number_integer'), mf('garantia_bateria_meses', String(v.garantia_bateria_meses), 'number_integer'),
      mf('certificado', String(v.certificado), 'boolean'), mf('badge', v.badge, 'single_line_text_field'), mf('financiable', String(v.financiable), 'boolean'),
      mf('b2b_disponible', String(v.b2b_disponible), 'boolean'), mf('b2b_minimo_unidades', String(v.b2b_minimo_unidades), 'number_integer'), mf('exclusivo_flota', String(v.exclusivo_flota), 'boolean'),
      mf('descripcion_corta', v.descripcion_corta, 'single_line_text_field'),
      // Tramos para facetas nativas (decisión filtros: tramos). Derivados de los valores numéricos.
      mf('autonomia_tramo', v.autonomia_km <= 50 ? 'Hasta 50 km' : v.autonomia_km <= 80 ? '50 a 80 km' : 'Más de 80 km', 'single_line_text_field'),
      mf('velocidad_tramo', v.velocidad_max_kmh <= 25 ? 'Hasta 25 km/h (sin licencia)' : v.velocidad_max_kmh <= 50 ? '25 a 50 km/h' : 'Más de 50 km/h', 'single_line_text_field'),
      mf('carga_tramo', v.capacidad_carga_kg <= 150 ? 'Hasta 150 kg' : v.capacidad_carga_kg <= 400 ? '150 a 400 kg' : 'Más de 400 kg', 'single_line_text_field')
    ];
    const ex = DRY ? null : (await gql(`query($h: String!) { productByHandle(handle: $h) { id } }`, { h: v.handle })).productByHandle;
    if (ex) { console.log(`= producto ${v.handle} (actualizo metafields)`); if (!DRY) { const d = await gql(`mutation($i: ProductInput!) { productUpdate(input: $i) { userErrors { field message } } }`, { i: { id: ex.id, metafields } }); userErrors(d.productUpdate, v.handle); } if (['mas_vendido'].includes(v.badge)) destacados.push(ex.id); continue; }
    console.log(`+ producto ${v.handle} (${v.variantes.length} variantes)`);
    if (DRY) continue;
    const d = await gql(`mutation($i: ProductInput!) { productCreate(input: $i) { product { id variants(first: 1) { nodes { id } } } userErrors { field message } } }`, {
      i: { handle: v.handle, title: v.titulo, descriptionHtml: `<p>${v.descripcion_corta}</p><p><em>[MOCK] Descripción de demostración. Reemplazar con el contenido real de Brenson.</em></p>`, vendor: 'Brenson', productType: CAT_TITLES[v.categoria], status: 'ACTIVE', tags: ['mock', v.categoria], productOptions: v.variantes.length > 1 ? [{ name: 'Configuración', values: v.variantes.map((x) => ({ name: x.titulo })) }] : undefined, metafields }
    });
    if (!userErrors(d.productCreate, v.handle)) continue;
    const pid = d.productCreate.product.id;
    if (['mas_vendido'].includes(v.badge)) destacados.push(pid);
    // Variantes con precio y SKU (bulk)
    const variants = v.variantes.map((x) => ({ price: String(x.precio), inventoryItem: { sku: x.sku, tracked: true }, optionValues: v.variantes.length > 1 ? [{ optionName: 'Configuración', name: x.titulo }] : undefined }));
    const vd = await gql(`mutation($pid: ID!, $v: [ProductVariantsBulkInput!]!) { productVariantsBulkCreate(productId: $pid, variants: $v, strategy: REMOVE_STANDALONE_VARIANT) { userErrors { field message } } }`, { pid, v: variants });
    userErrors(vd.productVariantsBulkCreate, v.handle + ' variantes');
    await sleep(500);
  }
  if (!DRY && destacados.length) {
    const col = (await gql(`query { collectionByHandle(handle: "destacados") { id } }`)).collectionByHandle;
    if (col) { const d = await gql(`mutation($id: ID!, $p: [ID!]!) { collectionAddProducts(id: $id, productIds: $p) { userErrors { field message } } }`, { id: col.id, p: destacados }); userErrors(d.collectionAddProducts, 'destacados'); }
  }
}

/* ---------- 3. Metaobjects ---------- */
const F = (key, value) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
async function upsertMo(type, handle, fields) {
  console.log(`~ metaobject ${type}/${handle}`);
  if (DRY) return;
  const d = await gql(`mutation($h: MetaobjectHandleInput!, $m: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $h, metaobject: $m) { metaobject { id } userErrors { field message } } }`, { h: { type, handle }, m: { fields } });
  userErrors(d.metaobjectUpsert, `${type}/${handle}`);
  await sleep(200);
  return d.metaobjectUpsert.metaobject?.id;
}
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function metaobjects() {
  const p = M.parametros_financiacion;
  await upsertMo('brenson_parametros_financiacion', 'principal', [F('tasa_mensual', String(p.tasa_mensual)), F('plazos', p.plazos.map(String)), F('iniciales_pct', p.iniciales_pct.map(String)), F('plazo_default', String(p.plazo_default)), F('inicial_default', String(p.inicial_default)), F('aliado_nombre', p.aliado_nombre), F('disclaimer', rt(p.disclaimer)), F('costos_no_incluidos', p.costos_no_incluidos)]);
  const tierIds = {};
  for (const t of M.tiers_b2b) tierIds[t.codigo] = await upsertMo('brenson_tier_b2b', t.codigo.replace('_', '-'), [F('codigo', t.codigo), F('nombre', t.nombre), F('minimo_unidades', String(t.minimo_unidades)), F('descuento_pct', String(t.descuento_pct)), F('descripcion', t.descripcion), F('beneficios', t.beneficios)]);
  const asesorIds = {};
  for (const a of M.asesores) asesorIds[a.handle] = await upsertMo('brenson_asesor', a.handle, [F('nombre', a.nombre), F('cargo', a.cargo), F('canal', a.canal), F('whatsapp', a.whatsapp), F('email', a.email), F('horario', a.horario)]);
  await upsertMo('brenson_horario_atencion', 'principal', [F('zona_horaria', M.horario_atencion.zona_horaria), F('horario_json', M.horario_atencion.dias), F('mensaje_fuera_horario', M.horario_atencion.mensaje_fuera_horario)]);
  const c = M.certificacion;
  await upsertMo('brenson_certificacion', 'certificado-brenson', [F('nombre', c.nombre), F('puntos_inspeccion', String(c.puntos_inspeccion)), F('descripcion', c.descripcion), F('checklist', c.checklist)]);
  for (const q of M.faq) await upsertMo('brenson_faq', slug(q.pregunta).slice(0, 60), [F('pregunta', q.pregunta), F('respuesta', rt(q.respuesta)), F('categoria', q.categoria)]);
  for (const a of M.aliados) await upsertMo('brenson_aliado', slug(a.nombre), [F('nombre', a.nombre), F('tipo', a.tipo), F('verificado', String(!!a.verificado))]);
  for (const t of M.testimonios) await upsertMo('brenson_testimonio', slug(t.nombre + '-' + t.ciudad), [F('nombre', t.nombre), F('empresa', t.empresa), F('ciudad', t.ciudad), F('texto', t.texto), F('verificado', String(!!t.verificado))]);
  for (const k of M.contadores) await upsertMo('brenson_contador', slug(k.label), [F('label', k.label), F('valor', String(k.valor)), F('sufijo', k.sufijo), F('icono', k.icono), F('verificado', String(!!k.verificado))]);
  for (const cs of M.casos_uso) await upsertMo('brenson_caso_uso', slug(cs.titulo).slice(0, 60), [F('titulo', cs.titulo), F('cliente', cs.cliente), F('resumen', cs.resumen), F('metricas', cs.metricas), F('verificado', String(!!cs.verificado))]);
  return { tierIds, asesorIds };
}
const rt = (text) => JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] });

/* ---------- 4. Clientes B2B, unidades, cotizaciones ---------- */
async function customers(ids) {
  const custIds = {};
  for (const c of M.clientes_b2b) {
    const ex = DRY ? null : (await gql(`query($q: String!) { customers(first: 1, query: $q) { nodes { id } } }`, { q: `email:${c.email}` })).customers.nodes[0];
    const metafields = [
      { namespace: 'brenson_b2b', key: 'tipo_cliente', value: 'empresa', type: 'single_line_text_field' }, { namespace: 'brenson_b2b', key: 'nit', value: c.nit, type: 'single_line_text_field' },
      { namespace: 'brenson_b2b', key: 'razon_social', value: c.razon_social, type: 'single_line_text_field' }, { namespace: 'brenson_b2b', key: 'sector', value: c.sector, type: 'single_line_text_field' },
      { namespace: 'brenson_b2b', key: 'flota_estimada', value: String(c.flota_estimada), type: 'number_integer' }, { namespace: 'brenson_b2b', key: 'cargo_contacto', value: c.cargo_contacto, type: 'single_line_text_field' },
      { namespace: 'brenson_b2b', key: 'estado_b2b', value: c.estado_b2b, type: 'single_line_text_field' }
    ];
    if (c.tier && ids?.tierIds?.[c.tier]) metafields.push({ namespace: 'brenson_b2b', key: 'tier', value: ids.tierIds[c.tier], type: 'metaobject_reference' });
    if (c.asesor && ids?.asesorIds?.[c.asesor]) metafields.push({ namespace: 'brenson_b2b', key: 'asesor', value: ids.asesorIds[c.asesor], type: 'metaobject_reference' });
    console.log(`${ex ? '=' : '+'} cliente ${c.email}`);
    if (DRY) continue;
    const input = { email: c.email, firstName: c.nombre, lastName: c.apellido, tags: c.tags, note: `B2B ${JSON.stringify({ razon_social: c.razon_social, nit: c.nit, sector: c.sector })} [MOCK]`, metafields };
    const d = ex ? await gql(`mutation($i: CustomerInput!) { customerUpdate(input: $i) { customer { id } userErrors { field message } } }`, { i: { id: ex.id, ...input } })
                 : await gql(`mutation($i: CustomerInput!) { customerCreate(input: $i) { customer { id } userErrors { field message } } }`, { i: input });
    const res = d.customerUpdate || d.customerCreate; userErrors(res, c.email); custIds[c.email] = res.customer?.id || ex?.id;
    await sleep(400);
  }
  if (DRY) return;
  for (const u of M.unidades) {
    const prod = (await gql(`query($h: String!) { productByHandle(handle: $h) { id } }`, { h: u.producto })).productByHandle;
    await upsertMo('brenson_unidad', slug(u.serie), [F('serie', u.serie), F('producto', prod?.id || ''), F('cliente', custIds[u.cliente] || ''), F('pedido', u.pedido), F('fecha_entrega', u.fecha_entrega), F('fin_garantia', u.fin_garantia), F('fin_garantia_bateria', u.fin_garantia_bateria), F('estado', u.estado)].filter((f) => f.value));
  }
  for (const q of M.cotizaciones) {
    const sub = q.items.reduce((a, i) => a + i.precio_unitario * i.cantidad, 0), total = Math.round(sub * (1 - q.descuento_pct / 100));
    await upsertMo('brenson_cotizacion_b2b', q.numero.toLowerCase(), [F('numero', q.numero), F('cliente', custIds[q.cliente] || ''), F('asesor', ids?.asesorIds?.[q.asesor] || ''), F('items', q.items), F('subtotal', { amount: String(sub), currency_code: 'COP' }), F('descuento_pct', String(q.descuento_pct)), F('total', { amount: String(total), currency_code: 'COP' }), F('validez_dias', String(q.validez_dias)), F('estado', q.estado), F('observaciones', q.observaciones), F('creada_en', new Date(q.creada_en).toISOString())].filter((f) => f.value));
  }
}

/* ---------- run ---------- */
console.log(DRY ? '— DRY RUN —' : `Importando a ${process.env.SHOPIFY_SHOP}`);
let ids;
if (!only || only === 'colecciones') await collections();
if (!only || only === 'productos') await products();
if (!only || only === 'metaobjects') ids = await metaobjects();
if (!only || only === 'clientes') await customers(ids);
console.log('\nListo. Verifica en Admin → Contenido → Metaobjects y Productos. Recuerda: todo lo importado es [MOCK] hasta que Brenson entregue datos reales.');
