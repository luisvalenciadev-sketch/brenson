#!/usr/bin/env node
/**
 * sync-filter-tramos — Deja listos los datos de los filtros avanzados del catálogo (H05) y la colección
 * de repuestos (H04).
 *
 * 1. Para cada vehículo deriva brenson.autonomia_tramo / velocidad_tramo / carga_tramo de los valores
 *    numéricos (autonomia_km, velocidad_max_kmh, capacidad_carga_kg). Mismos cortes que import-mocks.mjs.
 *    Si falta el número, NO inventa el tramo: lo reporta como dato pendiente.
 * 2. Reporta vehículos sin brenson.uso ni brenson.categoria (también alimentan filtros).
 * 3. Crea (si no existe) la colección automática "Repuestos" (handle repuestos): título contiene
 *    "Cargador" o "Bater". La usa la miga de pan de las fichas de repuestos.
 *
 *   SHOPIFY_SHOP=entorno-de-prueba-brenson.myshopify.com SHOPIFY_ADMIN_TOKEN=... node scripts/sync-filter-tramos.mjs [--dry-run]
 *
 * Después: Search & Discovery → Filtros → agregar Autonomía (tramo), Velocidad (tramo), Carga (tramo), Uso.
 * Scopes: read/write_products.
 */
import { gql, userErrors, sleep, dryRun } from './lib/shopify-admin.mjs';

const DRY = dryRun();
const VEHICULOS = ['bicicleta', 'ciclomotor', 'motocarro', 'cuadriciclo', 'patineta', 'moto', 'furgon'];

// Misma regla que snippets/brenson-product-kind.liquid.
function kindOf(p) {
  const cat = (p.categoria?.value || '').toLowerCase().trim();
  const senal = `${cat} ${p.productType} ${p.tags.join(' ')}`.toLowerCase();
  const prefijo = p.handle.split('-')[0];
  if (cat && VEHICULOS.includes(cat)) return 'vehiculo';
  if (senal.includes('cargador') || prefijo === 'cargador') return 'cargador';
  if (senal.includes('bater') || prefijo === 'bateria') return 'bateria';
  if (p.templateSuffix === 'repuesto' || senal.includes('repuesto') || senal.includes('accesorio')) return 'repuesto';
  return 'vehiculo';
}

const tramo = {
  autonomia_tramo: (n) => (n <= 50 ? 'Hasta 50 km' : n <= 80 ? '50 a 80 km' : 'Más de 80 km'),
  velocidad_tramo: (n) => (n <= 25 ? 'Hasta 25 km/h (sin licencia)' : n <= 50 ? '25 a 50 km/h' : 'Más de 50 km/h'),
  carga_tramo: (n) => (n <= 150 ? 'Hasta 150 kg' : n <= 400 ? '150 a 400 kg' : 'Más de 400 kg')
};
const fuente = { autonomia_tramo: 'autonomia_km', velocidad_tramo: 'velocidad_max_kmh', carga_tramo: 'capacidad_carga_kg' };

const products = [];
let after = null;
do {
  const page = (await gql(
    `query($after: String) { products(first: 50, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id handle title productType tags templateSuffix status
        categoria: metafield(namespace: "brenson", key: "categoria") { value }
        uso: metafield(namespace: "brenson", key: "uso") { value }
        autonomia_km: metafield(namespace: "brenson", key: "autonomia_km") { value }
        velocidad_max_kmh: metafield(namespace: "brenson", key: "velocidad_max_kmh") { value }
        capacidad_carga_kg: metafield(namespace: "brenson", key: "capacidad_carga_kg") { value }
        autonomia_tramo: metafield(namespace: "brenson", key: "autonomia_tramo") { value }
        velocidad_tramo: metafield(namespace: "brenson", key: "velocidad_tramo") { value }
        carga_tramo: metafield(namespace: "brenson", key: "carga_tramo") { value }
      } } }`,
    { after }
  )).products;
  products.push(...page.nodes);
  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);

const pendientes = [];
const sets = [];
const resumen = { vehiculo: 0, bateria: 0, cargador: 0, repuesto: 0 };
for (const p of products) {
  const kind = kindOf(p);
  resumen[kind]++;
  if (kind !== 'vehiculo') continue;
  for (const [key, calc] of Object.entries(tramo)) {
    const raw = p[fuente[key]]?.value;
    const n = raw != null && raw !== '' ? Number(raw) : NaN;
    if (Number.isNaN(n) || n <= 0) { pendientes.push(`${p.title}: falta ${fuente[key]}`); continue; }
    const value = calc(n);
    if (p[key]?.value !== value) sets.push({ ownerId: p.id, namespace: 'brenson', key, type: 'single_line_text_field', value, _t: p.title });
  }
  if (!p.uso?.value) pendientes.push(`${p.title}: falta uso (personal / comercial / logistica)`);
  if (!p.categoria?.value) pendientes.push(`${p.title}: falta categoria`);
}

console.log(`${products.length} productos · ${JSON.stringify(resumen)}`);
console.log(`\n${sets.length} tramos por escribir:`);
for (const s of sets) console.log(`  ${s._t} → ${s.key} = ${s.value}`);
if (!DRY) {
  for (let i = 0; i < sets.length; i += 25) {
    const chunk = sets.slice(i, i + 25).map(({ _t, ...m }) => m);
    const d = await gql(`mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`, { m: chunk });
    userErrors(d.metafieldsSet, `metafieldsSet lote ${i / 25 + 1}`);
    await sleep(300);
  }
}
console.log(`\n${pendientes.length} datos pendientes (no se inventan; los define Brenson):`);
for (const x of pendientes) console.log(`  · ${x}`);

// --- Colección automática de repuestos ---
const existe = (await gql(`{ collectionByHandle(handle: "repuestos") { id title ruleSet { appliedDisjunctively } productsCount { count }
  products(first: 100) { nodes { id } } } }`)).collectionByHandle;
if (existe && !existe.ruleSet) {
  // Colección manual (la trae el clon de brenson-0, vacía): se le agregan las baterías y cargadores que falten.
  const ya = new Set(existe.products.nodes.map((n) => n.id));
  const faltan = products.filter((p) => kindOf(p) !== 'vehiculo' && !ya.has(p.id));
  console.log(`\n= colección manual repuestos (${existe.productsCount?.count ?? '?'} productos) · ${faltan.length} por agregar`);
  for (const p of faltan) console.log(`  + ${p.title}`);
  if (!DRY && faltan.length) {
    const d = await gql(`mutation($id: ID!, $p: [ID!]!) { collectionAddProducts(id: $id, productIds: $p) { userErrors { field message } } }`, { id: existe.id, p: faltan.map((p) => p.id) });
    userErrors(d.collectionAddProducts, 'collectionAddProducts');
  }
} else if (existe) {
  console.log(`\n= colección automática repuestos ya existe (${existe.productsCount?.count ?? '?'} productos)`);
} else {
  console.log('\n+ colección automática "Repuestos" (título contiene Cargador o Bater)');
  if (!DRY) {
    const d = await gql(`mutation($c: CollectionInput!) { collectionCreate(input: $c) { collection { id handle } userErrors { field message } } }`, {
      c: {
        title: 'Repuestos', handle: 'repuestos',
        descriptionHtml: '<p>Baterías y cargadores originales para vehículos eléctricos Brenson.</p>',
        ruleSet: { appliedDisjunctively: true, rules: [
          { column: 'TITLE', relation: 'CONTAINS', condition: 'Cargador' },
          { column: 'TITLE', relation: 'CONTAINS', condition: 'Bater' }
        ] }
      }
    });
    if (userErrors(d.collectionCreate, 'collectionCreate')) {
      const id = d.collectionCreate.collection.id;
      const pubs = (await gql(`{ publications(first: 10) { nodes { id name } } }`)).publications.nodes;
      const online = pubs.find((x) => /online store|tienda online/i.test(x.name));
      if (online) {
        const r = await gql(`mutation($id: ID!, $p: [PublicationInput!]!) { publishablePublish(id: $id, input: $p) { userErrors { message } } }`, { id, p: [{ publicationId: online.id }] });
        userErrors(r.publishablePublish, 'publicar colección');
      }
    }
  }
}
console.log('\nSiguiente: Search & Discovery → Filtros → agregar Autonomía (tramo), Velocidad (tramo), Carga (tramo) y Uso.');
