#!/usr/bin/env node
/**
 * clone-store — Copia el contenido de una tienda Shopify a otra (Admin GraphQL, Node 22, sin dependencias).
 *
 *   SRC_SHOP=brenson-0.myshopify.com SRC_TOKEN=shpat_... \
 *   DST_SHOP=entorno-de-prueba-brenson.myshopify.com DST_TOKEN=shpat_... \
 *   STATE_FILE=<ruta>/clone-state.json \
 *   node scripts/clone-store.mjs [--dry-run] [--only=definiciones,archivos,...]
 *
 * Pasos, en orden (los nombres sirven para --only):
 *   definiciones  definiciones de metaobjects y de metafields (sin las de apps ni las estándar de Shopify)
 *   archivos      Contenido → Archivos (imágenes, videos, genéricos) con el mismo nombre de archivo,
 *                 para que las referencias shopify://shop_images/<nombre> del tema sigan resolviendo
 *   colecciones   colecciones manuales y automáticas (las reglas por metafield se remapean)
 *   productos     productos con variantes, media y precios (productSet por handle), publicados en la tienda online
 *   metaobjects   entradas de todos los tipos copiados (dos pasadas para referencias entre metaobjects)
 *   paginas       páginas
 *   blogs         blogs y artículos
 *   menus         menús de navegación (los existentes se actualizan por handle)
 *   metafields    metafields de productos, variantes, colecciones, páginas, blogs, artículos y tienda
 *   redirecciones redirecciones de URL
 *
 * No copia clientes ni pedidos (datos personales reales de brenson-0), ni descuentos.
 * Es re-ejecutable: STATE_FILE guarda el mapa de IDs origen → destino y lo creado no se duplica.
 */
import fs from 'node:fs';

const API = process.env.SHOPIFY_API_VERSION || '2025-07';
const DRY = process.argv.includes('--dry-run');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const STATE_FILE = process.env.STATE_FILE || 'clone-state.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const v of ['SRC_SHOP', 'SRC_TOKEN', 'DST_SHOP', 'DST_TOKEN']) {
  if (!process.env[v]) { console.error(`Falta la variable de entorno ${v}`); process.exit(1); }
}

function client(shop, token) {
  return async function gql(query, variables = {}, attempt = 0) {
    const res = await fetch(`https://${shop}/admin/api/${API}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 6) throw new Error(`${shop}: HTTP ${res.status}`);
      await sleep(2000 * (attempt + 1));
      return gql(query, variables, attempt + 1);
    }
    const json = await res.json();
    if (json.errors) {
      if (JSON.stringify(json.errors).includes('THROTTLED') && attempt <= 6) {
        await sleep(2000 * (attempt + 1));
        return gql(query, variables, attempt + 1);
      }
      throw new Error(`${shop}: ` + JSON.stringify(json.errors));
    }
    const cost = json.extensions?.cost;
    if (cost && cost.throttleStatus.currentlyAvailable < cost.requestedQueryCost * 2) await sleep(1500);
    return json.data;
  };
}
const src = client(process.env.SRC_SHOP, process.env.SRC_TOKEN);
const dst = client(process.env.DST_SHOP, process.env.DST_TOKEN);

// ---------- estado (mapa de IDs) ----------
const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : { map: {} };
const map = state.map;
const save = () => { if (!DRY) fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); };

function errs(payload, ctx) {
  const e = payload?.userErrors || [];
  if (e.length) console.warn(`  ⚠ ${ctx}:`, e.map((x) => `${(x.field || []).join('.')} ${x.message}`).join(' | '));
  return e.length === 0;
}

async function paginate(gql, query, path, vars = {}) {
  const out = [];
  let after = null;
  do {
    const data = await gql(query, { ...vars, after });
    const conn = path.split('.').reduce((o, k) => o[k], data);
    out.push(...conn.nodes);
    after = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (after);
  return out;
}

const skipNamespace = (ns) => ns.startsWith('app--') || ns.startsWith('$app') || ns === 'shopify' || ns.startsWith('shopify--');

/** Traduce los GID de un valor de metafield/campo al ID equivalente en destino. null = no se puede. */
function mapValue(type, value) {
  if (!type.includes('reference')) return value;
  if (type.startsWith('list.')) {
    const ids = JSON.parse(value).map((g) => map[g]).filter(Boolean);
    return ids.length ? JSON.stringify(ids) : null;
  }
  return map[value] || null;
}
const refsResolved = (type, value) => !type.includes('reference') ||
  (type.startsWith('list.') ? JSON.parse(value).every((g) => map[g]) : Boolean(map[value]));

const step = (name) => ONLY.length === 0 || ONLY.includes(name);

// =====================================================================
// 1. Definiciones
// =====================================================================
const OWNER_TYPES = ['PRODUCT', 'PRODUCTVARIANT', 'COLLECTION', 'CUSTOMER', 'SHOP', 'PAGE', 'BLOG', 'ARTICLE', 'ORDER', 'DRAFTORDER', 'COMPANY', 'LOCATION'];

const MO_DEF_FIELDS = `id type name description displayNameKey
  access { storefront }
  capabilities { publishable { enabled } translatable { enabled } renderable { enabled } onlineStore { enabled data { urlHandle } } }
  fieldDefinitions { key name description required type { name } validations { name value } }`;

async function srcMetaobjectDefinitions() {
  return paginate(src, `query($after: String) { metaobjectDefinitions(first: 50, after: $after) { nodes { ${MO_DEF_FIELDS} } pageInfo { hasNextPage endCursor } } }`, 'metaobjectDefinitions');
}

function mapValidations(validations) {
  return validations.map((v) => {
    if (v.name === 'metaobject_definition_id') return map[v.value] ? { name: v.name, value: map[v.value] } : null;
    if (v.name === 'metaobject_definition_ids') {
      const ids = JSON.parse(v.value).map((g) => map[g]);
      return ids.every(Boolean) ? { name: v.name, value: JSON.stringify(ids) } : null;
    }
    return { name: v.name, value: v.value };
  });
}

async function cloneDefinitions() {
  console.log('\n== Definiciones de metaobjects ==');
  const defs = (await srcMetaobjectDefinitions()).filter((d) => !d.type.startsWith('app--') && !d.type.startsWith('shopify--'));
  const dstDefs = await paginate(dst, `query($after: String) { metaobjectDefinitions(first: 50, after: $after) { nodes { id type fieldDefinitions { key } } pageInfo { hasNextPage endCursor } } }`, 'metaobjectDefinitions');
  const dstByType = Object.fromEntries(dstDefs.map((d) => [d.type, d]));
  console.log(`  origen: ${defs.length} tipos`);
  if (DRY) { defs.forEach((d) => console.log(`  - ${d.type} (${d.fieldDefinitions.length} campos)`)); }

  // Pasada 1: crea cada tipo con los campos cuyas validaciones ya se pueden traducir
  for (const d of defs) {
    if (dstByType[d.type]) { map[d.id] = dstByType[d.type].id; continue; }
    if (DRY) continue;
    const fields = d.fieldDefinitions
      .map((f) => ({ f, validations: mapValidations(f.validations) }))
      .filter(({ validations }) => validations.every(Boolean))
      .map(({ f, validations }) => ({ key: f.key, name: f.name, description: f.description, required: f.required, type: f.type.name, validations }));
    const caps = {
      publishable: { enabled: d.capabilities.publishable?.enabled || false },
      translatable: { enabled: d.capabilities.translatable?.enabled || false },
    };
    if (d.capabilities.renderable?.enabled) caps.renderable = { enabled: true };
    if (d.capabilities.onlineStore?.enabled) caps.onlineStore = { enabled: true, data: { urlHandle: d.capabilities.onlineStore.data.urlHandle } };
    const input = {
      type: d.type, name: d.name, description: d.description, fieldDefinitions: fields,
      access: { storefront: d.access.storefront }, capabilities: caps,
    };
    if (fields.some((f) => f.key === d.displayNameKey)) input.displayNameKey = d.displayNameKey;
    const r = await dst(`mutation($definition: MetaobjectDefinitionCreateInput!) { metaobjectDefinitionCreate(definition: $definition) { metaobjectDefinition { id type } userErrors { field message } } }`, { definition: input });
    if (errs(r.metaobjectDefinitionCreate, `metaobjectDefinition ${d.type}`)) {
      map[d.id] = r.metaobjectDefinitionCreate.metaobjectDefinition.id;
      dstByType[d.type] = { id: map[d.id], fieldDefinitions: fields.map((f) => ({ key: f.key })) };
      console.log(`  ✓ ${d.type}`);
    }
  }
  save();

  // Pasada 2: agrega los campos que referenciaban tipos que aún no existían
  for (const d of defs) {
    if (DRY || !dstByType[d.type]) continue;
    const have = new Set(dstByType[d.type].fieldDefinitions.map((f) => f.key));
    const missing = d.fieldDefinitions.filter((f) => !have.has(f.key));
    if (!missing.length) continue;
    const ops = missing.map((f) => {
      const validations = mapValidations(f.validations);
      if (!validations.every(Boolean)) { console.warn(`  ⚠ ${d.type}.${f.key}: referencia a un tipo no copiado`); return null; }
      return { create: { key: f.key, name: f.name, description: f.description, required: f.required, type: f.type.name, validations } };
    }).filter(Boolean);
    if (!ops.length) continue;
    const update = { fieldDefinitions: ops };
    if (ops.some((o) => o.create.key === d.displayNameKey)) update.displayNameKey = d.displayNameKey;
    const r = await dst(`mutation($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) { metaobjectDefinitionUpdate(id: $id, definition: $definition) { metaobjectDefinition { id } userErrors { field message } } }`, { id: map[d.id], definition: update });
    if (errs(r.metaobjectDefinitionUpdate, `metaobjectDefinition ${d.type} (campos de referencia)`)) console.log(`  ✓ ${d.type}: +${ops.length} campos de referencia`);
  }

  console.log('\n== Definiciones de metafields ==');
  for (const ownerType of OWNER_TYPES) {
    let srcDefs;
    try {
      srcDefs = await paginate(src, `query($after: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(first: 100, after: $after, ownerType: $ownerType) { nodes { id name namespace key description type { name } validations { name value } pinnedPosition access { storefront } capabilities { smartCollectionCondition { enabled } adminFilterable { enabled } } } pageInfo { hasNextPage endCursor } } }`, 'metafieldDefinitions', { ownerType });
    } catch (e) { console.warn(`  ⚠ ${ownerType}: ${e.message.slice(0, 160)}`); continue; }
    srcDefs = srcDefs.filter((d) => !skipNamespace(d.namespace));
    if (!srcDefs.length) continue;
    const existing = await paginate(dst, `query($after: String, $ownerType: MetafieldOwnerType!) { metafieldDefinitions(first: 100, after: $after, ownerType: $ownerType) { nodes { id namespace key } pageInfo { hasNextPage endCursor } } }`, 'metafieldDefinitions', { ownerType });
    const have = Object.fromEntries(existing.map((d) => [`${d.namespace}.${d.key}`, d.id]));
    console.log(`  ${ownerType}: ${srcDefs.length} en origen, ${srcDefs.filter((d) => have[`${d.namespace}.${d.key}`]).length} ya en destino`);
    for (const d of srcDefs) {
      const k = `${d.namespace}.${d.key}`;
      if (have[k]) { map[d.id] = have[k]; continue; }
      if (DRY) { console.log(`    - ${k} (${d.type.name})`); continue; }
      const validations = mapValidations(d.validations);
      if (!validations.every(Boolean)) { console.warn(`  ⚠ ${ownerType} ${k}: referencia a un tipo de metaobject no copiado`); continue; }
      const definition = {
        name: d.name, namespace: d.namespace, key: d.key, description: d.description, ownerType,
        type: d.type.name, validations, pin: d.pinnedPosition != null, access: { storefront: d.access.storefront },
        capabilities: {
          smartCollectionCondition: { enabled: d.capabilities.smartCollectionCondition?.enabled || false },
          adminFilterable: { enabled: d.capabilities.adminFilterable?.enabled || false },
        },
      };
      const r = await dst(`mutation($definition: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $definition) { createdDefinition { id } userErrors { field message } } }`, { definition });
      if (errs(r.metafieldDefinitionCreate, `metafieldDefinition ${ownerType} ${k}`)) map[d.id] = r.metafieldDefinitionCreate.createdDefinition.id;
    }
  }
  save();
}

// =====================================================================
// 2. Archivos
// =====================================================================
const baseName = (url) => decodeURIComponent(new URL(url).pathname.split('/').pop());
const ext = (name) => (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();

function fileSource(f) {
  if (f.__typename === 'MediaImage') return f.image?.url ? { url: f.image.url, contentType: 'IMAGE', name: baseName(f.image.url) } : {};
  if (f.__typename === 'Video') {
    // originalSource.url no sirve como origen para fileCreate ("Invalid video url"): se usa la versión MP4 más grande
    const mp4 = (f.sources || []).filter((s) => s.mimeType === 'video/mp4').sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    return mp4 ? { url: mp4.url, contentType: 'VIDEO', name: f.filename } : {};
  }
  if (f.__typename === 'GenericFile') return f.url ? { url: f.url, contentType: 'FILE', name: baseName(f.url) } : {};
  return {};
}

// Clave de emparejamiento: tipo + nombre (los videos sin extensión: un .MOV se sube como .mp4)
const fileKey = (f) => { const n = fileSource(f).name; return n ? `${f.__typename}:${f.__typename === 'Video' ? n.replace(/\.[a-z0-9]+$/i, '').toLowerCase() : n}` : null; };

const FILE_FIELDS = `id alt fileStatus __typename
  ... on MediaImage { image { url } }
  ... on Video { filename sources { url mimeType height } }
  ... on GenericFile { url }`;

async function cloneFiles() {
  console.log('\n== Archivos ==');
  const files = await paginate(src, `query($after: String) { files(first: 100, after: $after) { nodes { ${FILE_FIELDS} } pageInfo { hasNextPage endCursor } } }`, 'files');
  const byType = files.reduce((a, f) => ((a[f.__typename] = (a[f.__typename] || 0) + 1), a), {});
  console.log(`  origen: ${files.length} archivos ${JSON.stringify(byType)}`);

  // Empareja por tipo + nombre con lo que ya existe en destino (corrige mapeos previos y evita duplicados)
  const dstFiles = await paginate(dst, `query($after: String) { files(first: 100, after: $after) { nodes { ${FILE_FIELDS} } pageInfo { hasNextPage endCursor } } }`, 'files');
  const dstByName = {};
  const dstKeyById = {};
  for (const f of dstFiles) { const k = fileKey(f); if (k) { dstByName[k] ||= f.id; dstKeyById[f.id] = k; } }
  let rematched = 0;
  let unmapped = 0;
  for (const f of files) {
    const key = fileKey(f);
    const hit = dstByName[key];
    if (hit && map[f.id] !== hit) { map[f.id] = hit; rematched++; }
    // Mapeo apuntando a un archivo de otro nombre (lotes desalineados): se descarta
    else if (!hit && map[f.id] && dstKeyById[map[f.id]] && dstKeyById[map[f.id]] !== key) { delete map[f.id]; unmapped++; }
  }
  if (unmapped) console.log(`  mapeos incorrectos descartados: ${unmapped}`);
  const pending = files.filter((f) => !map[f.id] && f.fileStatus === 'READY');
  console.log(`  emparejados por nombre: ${rematched} · faltan por copiar: ${pending.length}`);
  if (DRY) { pending.forEach((f) => console.log(`    - ${f.__typename} ${fileSource(f).name || '(sin origen)'}`)); return; }
  save();

  // Uno por llamada: con lotes, un error desalinea la respuesta y el mapa por posición queda corrido
  let n = 0;
  for (const f of pending) {
    const s = fileSource(f);
    if (!s.url) { console.warn(`  ⚠ ${f.id}: sin URL de origen`); continue; }
    const input = { originalSource: s.url, contentType: s.contentType, alt: f.alt || '' };
    if (s.name && ext(s.name) === ext(baseName(s.url))) input.filename = s.name;
    if (s.contentType === 'VIDEO') {
      // fileCreate no acepta videos desde URL externa: hay que descargarlos y subirlos por staged upload
      try { input.originalSource = await stageVideo(s.url, s.name.replace(/\.[a-z0-9]+$/i, '') + '.mp4'); delete input.filename; }
      catch (e) { console.warn(`  ⚠ video ${s.name}: ${e.message}`); continue; }
    }
    const create = (file) => dst(`mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id } userErrors { field message } } }`, { files: [file] });
    let r = await create(input);
    if (r.fileCreate.userErrors.some((e) => e.message.includes('filename'))) { delete input.filename; r = await create(input); }
    if (errs(r.fileCreate, `archivo ${s.name}`) && r.fileCreate.files?.[0]?.id) map[f.id] = r.fileCreate.files[0].id;
    if (++n % 10 === 0) { save(); process.stdout.write(`  ${n}/${pending.length}\r`); }
  }
  save();
  console.log(`  ${n}/${pending.length} enviados`);
  await waitFilesReady();
}

async function stageVideo(url, filename) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`descarga HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const r = await dst(`mutation($input: [StagedUploadInput!]!) { stagedUploadsCreate(input: $input) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }`,
    { input: [{ resource: 'VIDEO', filename, mimeType: 'video/mp4', fileSize: String(buf.length), httpMethod: 'POST' }] });
  if (!errs(r.stagedUploadsCreate, `staged upload ${filename}`)) throw new Error('stagedUploadsCreate falló');
  const t = r.stagedUploadsCreate.stagedTargets[0];
  const form = new FormData();
  for (const p of t.parameters) form.append(p.name, p.value);
  form.append('file', new Blob([buf], { type: 'video/mp4' }), filename);
  const up = await fetch(t.url, { method: 'POST', body: form });
  if (!up.ok) throw new Error(`subida HTTP ${up.status}: ${(await up.text()).slice(0, 200)}`);
  return t.resourceUrl;
}

async function waitFilesReady() {
  const ids = Object.entries(map).filter(([k]) => /\/(MediaImage|Video|GenericFile)\//.test(k)).map(([, v]) => v);
  for (let round = 0; round < 60; round++) {
    let notReady = [];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await dst(`query($ids: [ID!]!) { nodes(ids: $ids) { id ... on File { fileStatus fileErrors { message } } } }`, { ids: ids.slice(i, i + 100) });
      for (const n of r.nodes) {
        if (!n) continue;
        if (n.fileStatus === 'FAILED') console.warn(`  ⚠ archivo ${n.id} falló: ${n.fileErrors.map((e) => e.message).join('; ')}`);
        else if (n.fileStatus !== 'READY') notReady.push(n.id);
      }
    }
    if (!notReady.length) { console.log('  archivos listos'); return; }
    process.stdout.write(`  procesando ${notReady.length} archivos...\r`);
    await sleep(10000);
  }
  console.warn('  ⚠ algunos archivos siguen procesándose; se continúa igual');
}

// =====================================================================
// 3. Colecciones
// =====================================================================
async function cloneCollections() {
  console.log('\n== Colecciones ==');
  const cols = await paginate(src, `query($after: String) { collections(first: 50, after: $after) { nodes { id handle title descriptionHtml templateSuffix sortOrder
      image { url altText } seo { title description }
      ruleSet { appliedDisjunctively rules { column relation condition conditionObject { ... on CollectionRuleMetafieldCondition { metafieldDefinition { id } } } } } } pageInfo { hasNextPage endCursor } } }`, 'collections');
  console.log(`  origen: ${cols.length}`);
  if (DRY) { cols.forEach((c) => console.log(`  - ${c.handle}${c.ruleSet ? ' (automática)' : ''}`)); return; }
  for (const c of cols) {
    if (map[c.id]) continue;
    const found = (await dst(`query($q: String!) { collections(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${c.handle}` })).collections.nodes.find((n) => n.handle === c.handle);
    if (found) { map[c.id] = found.id; console.log(`  = ${c.handle} (ya existía)`); continue; }
    const input = { title: c.title, handle: c.handle, descriptionHtml: c.descriptionHtml, templateSuffix: c.templateSuffix, sortOrder: c.sortOrder, seo: c.seo };
    if (c.image?.url) input.image = { src: c.image.url, altText: c.image.altText };
    if (c.ruleSet) {
      input.ruleSet = {
        appliedDisjunctively: c.ruleSet.appliedDisjunctively,
        rules: c.ruleSet.rules.map((r) => {
          const rule = { column: r.column, relation: r.relation, condition: r.condition };
          const defId = r.conditionObject?.metafieldDefinition?.id;
          if (defId) rule.conditionObjectId = map[defId];
          return rule;
        }),
      };
    }
    const r = await dst(`mutation($input: CollectionInput!) { collectionCreate(input: $input) { collection { id } userErrors { field message } } }`, { input });
    if (errs(r.collectionCreate, `colección ${c.handle}`)) { map[c.id] = r.collectionCreate.collection.id; console.log(`  ✓ ${c.handle}`); }
  }
  save();
  await publishAll(cols.map((c) => map[c.id]).filter(Boolean), 'colecciones');
}

let onlineStorePub;
async function publishAll(ids, label) {
  if (!onlineStorePub) {
    const pubs = (await dst(`{ publications(first: 20) { nodes { id name } } }`)).publications.nodes;
    onlineStorePub = pubs.find((p) => p.name === 'Online Store' || p.name === 'Tienda online')?.id;
    if (!onlineStorePub) { console.warn('  ⚠ no se encontró la publicación "Online Store"'); return; }
  }
  for (const id of ids) {
    const r = await dst(`mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`, { id, input: [{ publicationId: onlineStorePub }] });
    errs(r.publishablePublish, `publicar ${id}`);
  }
  console.log(`  ${ids.length} ${label} publicadas en la tienda online`);
}

// =====================================================================
// 4. Productos
// =====================================================================
async function cloneProducts() {
  console.log('\n== Productos ==');
  const products = await paginate(src, `query($after: String) { products(first: 10, after: $after) { nodes { id handle title descriptionHtml vendor productType tags status templateSuffix
      seo { title description }
      options { name position optionValues { name } }
      media(first: 50) { nodes { id alt mediaContentType
        ... on MediaImage { image { url } }
        ... on Video { filename sources { url mimeType height } }
        ... on ExternalVideo { originUrl }
        ... on Model3d { originalSource { url } } } }
      variants(first: 100) { nodes { id sku price compareAtPrice taxable inventoryPolicy barcode inventoryQuantity
        selectedOptions { name value } media(first: 1) { nodes { id } }
        inventoryItem { tracked requiresShipping measurement { weight { unit value } } } } }
      collections(first: 50) { nodes { id } } } pageInfo { hasNextPage endCursor } } }`, 'products');
  console.log(`  origen: ${products.length} (${products.filter((p) => p.status === 'ACTIVE').length} activos)`);
  if (DRY) return;

  const location = (await dst(`{ locations(first: 1) { nodes { id name } } }`)).locations.nodes[0];
  const created = [];
  for (const p of products) {
    const mediaInput = (m) => {
      if (map[m.id]) return { id: map[m.id] };
      if (m.mediaContentType === 'IMAGE' && m.image?.url) return { originalSource: m.image.url, contentType: 'IMAGE', alt: m.alt || '' };
      // Video sin equivalente en destino: se omite (una URL externa haría fallar todo el productSet)
      if (m.mediaContentType === 'VIDEO') { console.warn(`  ⚠ ${p.handle}: video ${m.filename || m.id} sin copiar, se omite`); return null; }
      if (m.mediaContentType === 'EXTERNAL_VIDEO' && m.originUrl) return { originalSource: m.originUrl, contentType: 'EXTERNAL_VIDEO', alt: m.alt || '' };
      if (m.mediaContentType === 'MODEL_3D' && m.originalSource?.url) return { originalSource: m.originalSource.url, contentType: 'MODEL_3D', alt: m.alt || '' };
      return null;
    };
    const input = {
      handle: p.handle, title: p.title, descriptionHtml: p.descriptionHtml, vendor: p.vendor, productType: p.productType,
      tags: p.tags, status: p.status, templateSuffix: p.templateSuffix, seo: p.seo,
      productOptions: p.options.map((o) => ({ name: o.name, position: o.position, values: o.optionValues.map((v) => ({ name: v.name })) })),
      files: p.media.nodes.map(mediaInput).filter(Boolean),
      variants: p.variants.nodes.map((v) => {
        const vi = {
          optionValues: v.selectedOptions.map((so) => ({ optionName: so.name, name: so.value })),
          price: v.price, compareAtPrice: v.compareAtPrice, sku: v.sku, barcode: v.barcode, taxable: v.taxable,
          inventoryPolicy: v.inventoryPolicy,
          inventoryItem: { tracked: v.inventoryItem.tracked, requiresShipping: v.inventoryItem.requiresShipping },
        };
        const w = v.inventoryItem.measurement?.weight;
        if (w) vi.inventoryItem.measurement = { weight: { unit: w.unit, value: w.value } };
        if (v.inventoryItem.tracked && location) vi.inventoryQuantities = [{ locationId: location.id, name: 'available', quantity: Math.max(0, v.inventoryQuantity ?? 0) }];
        const vm = v.media.nodes[0];
        if (vm) { const fi = p.media.nodes.find((m) => m.id === vm.id); const inp = fi && mediaInput(fi); if (inp) vi.file = inp; }
        return vi;
      }),
    };
    const r = await dst(`mutation($input: ProductSetInput!, $identifier: ProductSetIdentifiers) { productSet(synchronous: true, input: $input, identifier: $identifier) {
        product { id variants(first: 100) { nodes { id selectedOptions { name value } } } } userErrors { field message } } }`, { input, identifier: { handle: p.handle } });
    if (!errs(r.productSet, `producto ${p.handle}`)) continue;
    const np = r.productSet.product;
    map[p.id] = np.id;
    const key = (so) => so.map((o) => `${o.name}=${o.value}`).join('|');
    const dstVariants = Object.fromEntries(np.variants.nodes.map((v) => [key(v.selectedOptions), v.id]));
    for (const v of p.variants.nodes) if (dstVariants[key(v.selectedOptions)]) map[v.id] = dstVariants[key(v.selectedOptions)];
    created.push({ p, id: np.id });
    console.log(`  ✓ ${p.handle} (${input.files.length} media)`);
    save();
  }

  // Colecciones manuales: agrega los productos
  const manualMembers = {};
  for (const { p, id } of created) for (const c of p.collections.nodes) (manualMembers[c.id] ||= []).push(id);
  for (const [srcCol, ids] of Object.entries(manualMembers)) {
    if (!map[srcCol]) continue;
    const info = (await dst(`query($id: ID!) { collection(id: $id) { handle ruleSet { rules { column } } } }`, { id: map[srcCol] })).collection;
    if (!info || info.ruleSet) continue; // automática: se llena sola
    for (let i = 0; i < ids.length; i += 250) {
      const r = await dst(`mutation($id: ID!, $productIds: [ID!]!) { collectionAddProductsV2(id: $id, productIds: $productIds) { job { id } userErrors { field message } } }`, { id: map[srcCol], productIds: ids.slice(i, i + 250) });
      errs(r.collectionAddProductsV2, `colección ${info.handle}`);
    }
    console.log(`  colección ${info.handle}: +${ids.length} productos`);
  }
  await publishAll(created.map((c) => c.id), 'productos');
}

// =====================================================================
// 5. Metaobjects
// =====================================================================
async function cloneMetaobjects() {
  console.log('\n== Metaobjects ==');
  const defs = (await srcMetaobjectDefinitions()).filter((d) => !d.type.startsWith('app--') && !d.type.startsWith('shopify--'));
  const all = [];
  for (const d of defs) {
    const entries = await paginate(src, `query($after: String, $type: String!) { metaobjects(type: $type, first: 50, after: $after) { nodes { id handle type capabilities { publishable { status } } fields { key type value } } pageInfo { hasNextPage endCursor } } }`, 'metaobjects', { type: d.type });
    console.log(`  ${d.type}: ${entries.length}`);
    all.push(...entries.map((e) => ({ ...e, publishable: d.capabilities.publishable?.enabled })));
  }
  if (DRY) return;
  const upsert = async (e, onlyResolved) => {
    const fields = e.fields
      .filter((f) => f.value != null && (!onlyResolved || refsResolved(f.type, f.value)))
      .map((f) => ({ key: f.key, value: mapValue(f.type, f.value) }))
      .filter((f) => f.value != null);
    const metaobject = { fields };
    if (e.publishable && e.capabilities.publishable) metaobject.capabilities = { publishable: { status: e.capabilities.publishable.status } };
    const r = await dst(`mutation($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $handle, metaobject: $metaobject) { metaobject { id } userErrors { field message } } }`, { handle: { type: e.type, handle: e.handle }, metaobject });
    const ok = errs(r.metaobjectUpsert, `${e.type}/${e.handle}`);
    if (ok) map[e.id] = r.metaobjectUpsert.metaobject.id;
    return ok;
  };
  // Pasada 1: crea todo con las referencias ya resolubles (archivos, productos, colecciones…)
  for (const e of all) await upsert(e, true);
  save();
  // Pasada 2: completa las referencias entre metaobjects
  let completed = 0;
  for (const e of all) if (e.fields.some((f) => f.value != null && !refsResolved(f.type, f.value) || /metaobject_reference/.test(f.type))) { await upsert(e, false); completed++; }
  save();
  console.log(`  ✓ ${all.filter((e) => map[e.id]).length}/${all.length} copiados (${completed} con referencias completadas en la 2ª pasada)`);
}

// =====================================================================
// 6. Páginas
// =====================================================================
async function clonePages() {
  console.log('\n== Páginas ==');
  const pages = await paginate(src, `query($after: String) { pages(first: 50, after: $after) { nodes { id handle title body isPublished templateSuffix } pageInfo { hasNextPage endCursor } } }`, 'pages');
  console.log(`  origen: ${pages.length}`);
  if (DRY) { pages.forEach((p) => console.log(`  - ${p.handle}${p.templateSuffix ? ` [${p.templateSuffix}]` : ''}`)); return; }
  const existing = await paginate(dst, `query($after: String) { pages(first: 50, after: $after) { nodes { id handle } pageInfo { hasNextPage endCursor } } }`, 'pages');
  const byHandle = Object.fromEntries(existing.map((p) => [p.handle, p.id]));
  for (const p of pages) {
    const page = { title: p.title, handle: p.handle, body: p.body, isPublished: p.isPublished, templateSuffix: p.templateSuffix };
    const id = map[p.id] || byHandle[p.handle];
    const r = id
      ? await dst(`mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id } userErrors { field message } } }`, { id, page })
      : await dst(`mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id } userErrors { field message } } }`, { page });
    const payload = id ? r.pageUpdate : r.pageCreate;
    if (errs(payload, `página ${p.handle}`)) { map[p.id] = payload.page.id; console.log(`  ✓ ${p.handle}`); }
  }
  save();
}

// =====================================================================
// 7. Blogs y artículos
// =====================================================================
async function cloneBlogs() {
  console.log('\n== Blogs ==');
  const blogs = await paginate(src, `query($after: String) { blogs(first: 20, after: $after) { nodes { id handle title templateSuffix commentPolicy
      articles(first: 100) { nodes { id handle title body summary tags isPublished publishedAt templateSuffix author { name } image { url altText } } } } pageInfo { hasNextPage endCursor } } }`, 'blogs');
  console.log(`  origen: ${blogs.length} blogs, ${blogs.reduce((n, b) => n + b.articles.nodes.length, 0)} artículos`);
  if (DRY) return;
  const dstBlogs = await paginate(dst, `query($after: String) { blogs(first: 20, after: $after) { nodes { id handle articles(first: 250) { nodes { id handle } } } pageInfo { hasNextPage endCursor } } }`, 'blogs');
  for (const b of blogs) {
    let target = dstBlogs.find((x) => x.handle === b.handle);
    if (!target) {
      const r = await dst(`mutation($blog: BlogCreateInput!) { blogCreate(blog: $blog) { blog { id } userErrors { field message } } }`, { blog: { title: b.title, handle: b.handle, templateSuffix: b.templateSuffix, commentPolicy: b.commentPolicy } });
      if (!errs(r.blogCreate, `blog ${b.handle}`)) continue;
      target = { id: r.blogCreate.blog.id, articles: { nodes: [] } };
    }
    map[b.id] = target.id;
    const have = Object.fromEntries(target.articles.nodes.map((a) => [a.handle, a.id]));
    for (const a of b.articles.nodes) {
      if (have[a.handle]) { map[a.id] = have[a.handle]; continue; }
      const article = {
        blogId: target.id, title: a.title, handle: a.handle, body: a.body, summary: a.summary, tags: a.tags,
        isPublished: a.isPublished, templateSuffix: a.templateSuffix, author: { name: a.author?.name || 'Brenson' },
      };
      if (a.isPublished && a.publishedAt) article.publishDate = a.publishedAt;
      if (a.image?.url) article.image = { url: a.image.url, altText: a.image.altText };
      const r = await dst(`mutation($article: ArticleCreateInput!) { articleCreate(article: $article) { article { id } userErrors { field message } } }`, { article });
      if (errs(r.articleCreate, `artículo ${a.handle}`)) { map[a.id] = r.articleCreate.article.id; console.log(`  ✓ ${b.handle}/${a.handle}`); }
    }
  }
  save();
}

// =====================================================================
// 8. Menús
// =====================================================================
async function cloneMenus() {
  console.log('\n== Menús ==');
  const ITEM = 'title type url resourceId tags';
  const menus = (await src(`{ menus(first: 50) { nodes { id handle title items { ${ITEM} items { ${ITEM} items { ${ITEM} } } } } } }`)).menus.nodes;
  console.log(`  origen: ${menus.map((m) => m.handle).join(', ')}`);
  if (DRY) return;
  const dstMenus = Object.fromEntries((await dst(`{ menus(first: 50) { nodes { id handle } } }`)).menus.nodes.map((m) => [m.handle, m.id]));
  const toInput = (items) => items.map((i) => {
    const out = { title: i.title, type: i.type, tags: i.tags };
    if (i.resourceId) {
      if (map[i.resourceId]) out.resourceId = map[i.resourceId];
      else { out.type = 'HTTP'; out.url = i.url; console.warn(`  ⚠ "${i.title}": ${i.resourceId} sin equivalente, queda como enlace ${i.url}`); }
    } else if (i.url) out.url = i.url;
    if (i.items?.length) out.items = toInput(i.items);
    return out;
  });
  for (const m of menus) {
    const items = toInput(m.items);
    const id = dstMenus[m.handle];
    const r = id
      ? await dst(`mutation($id: ID!, $title: String!, $handle: String, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`, { id, title: m.title, handle: m.handle, items })
      : await dst(`mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $title, handle: $handle, items: $items) { menu { id } userErrors { field message } } }`, { title: m.title, handle: m.handle, items });
    if (errs(id ? r.menuUpdate : r.menuCreate, `menú ${m.handle}`)) console.log(`  ✓ ${m.handle}`);
  }
}

// =====================================================================
// 9. Metafields de los recursos ya copiados
// =====================================================================
async function cloneMetafields() {
  console.log('\n== Metafields ==');
  const MF = `metafields(first: 100) { nodes { namespace key type value } }`;
  const owners = [];
  owners.push(...await paginate(src, `query($after: String) { products(first: 20, after: $after) { nodes { id ${MF} variants(first: 100) { nodes { id ${MF} } } } pageInfo { hasNextPage endCursor } } }`, 'products'));
  for (const p of [...owners]) owners.push(...p.variants.nodes);
  owners.push(...await paginate(src, `query($after: String) { collections(first: 50, after: $after) { nodes { id ${MF} } pageInfo { hasNextPage endCursor } } }`, 'collections'));
  owners.push(...await paginate(src, `query($after: String) { pages(first: 50, after: $after) { nodes { id ${MF} } pageInfo { hasNextPage endCursor } } }`, 'pages'));
  const blogs = await paginate(src, `query($after: String) { blogs(first: 20, after: $after) { nodes { id ${MF} articles(first: 100) { nodes { id ${MF} } } } pageInfo { hasNextPage endCursor } } }`, 'blogs');
  for (const b of blogs) owners.push(b, ...b.articles.nodes);
  const shop = (await src(`{ shop { id ${MF} } }`)).shop;
  const dstShop = (await dst(`{ shop { id } }`)).shop.id;
  map[shop.id] = dstShop;
  owners.push(shop);

  const inputs = [];
  let dropped = 0;
  for (const o of owners) {
    if (!map[o.id]) continue;
    for (const m of o.metafields.nodes) {
      if (skipNamespace(m.namespace)) continue;
      const value = mapValue(m.type, m.value);
      if (value == null) { dropped++; continue; }
      inputs.push({ ownerId: map[o.id], namespace: m.namespace, key: m.key, type: m.type, value });
    }
  }
  console.log(`  ${inputs.length} metafields a copiar (${dropped} omitidos por referencias sin equivalente)`);
  if (DRY) return;
  let ok = 0;
  for (let i = 0; i < inputs.length; i += 25) {
    const r = await dst(`mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { metafields { id } userErrors { field message } } }`, { m: inputs.slice(i, i + 25) });
    errs(r.metafieldsSet, `metafieldsSet lote ${i / 25 + 1}`);
    ok += r.metafieldsSet.metafields?.length || 0;
  }
  console.log(`  ✓ ${ok}/${inputs.length}`);
  save();
}

// =====================================================================
// 10. Redirecciones
// =====================================================================
async function cloneRedirects() {
  console.log('\n== Redirecciones ==');
  const reds = await paginate(src, `query($after: String) { urlRedirects(first: 250, after: $after) { nodes { path target } pageInfo { hasNextPage endCursor } } }`, 'urlRedirects');
  console.log(`  origen: ${reds.length}`);
  if (DRY) return;
  const have = new Set((await paginate(dst, `query($after: String) { urlRedirects(first: 250, after: $after) { nodes { path } pageInfo { hasNextPage endCursor } } }`, 'urlRedirects')).map((r) => r.path));
  for (const red of reds) {
    if (have.has(red.path)) continue;
    const r = await dst(`mutation($urlRedirect: UrlRedirectInput!) { urlRedirectCreate(urlRedirect: $urlRedirect) { urlRedirect { id } userErrors { field message } } }`, { urlRedirect: red });
    errs(r.urlRedirectCreate, `redirección ${red.path}`);
  }
}

// =====================================================================
console.log(`${process.env.SRC_SHOP} → ${process.env.DST_SHOP}${DRY ? '  [dry-run]' : ''}`);
if (step('definiciones')) await cloneDefinitions();
if (step('archivos')) await cloneFiles();
if (step('colecciones')) await cloneCollections();
if (step('productos')) await cloneProducts();
if (step('metaobjects')) await cloneMetaobjects();
if (step('paginas')) await clonePages();
if (step('blogs')) await cloneBlogs();
if (step('menus')) await cloneMenus();
if (step('metafields')) await cloneMetafields();
if (step('redirecciones')) await cloneRedirects();
save();
console.log('\nListo.');
