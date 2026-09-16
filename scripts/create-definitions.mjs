#!/usr/bin/env node
/**
 * Crea las definiciones de metaobjects y metafields de Brenson a partir de docs/metafield-definitions.json.
 * Idempotente: si la definición ya existe, la omite.
 *
 *   SHOPIFY_SHOP=brenson-co.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/create-definitions.mjs [--dry-run]
 *
 * Scopes del token: write_metaobject_definitions, write_products, write_customers (para definiciones de metafields).
 */
import { readFileSync } from 'node:fs';
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const defs = JSON.parse(readFileSync(new URL('../docs/metafield-definitions.json', import.meta.url), 'utf8'));
const DRY = dryRun();

// --- Metaobjects primero (los metafields de tipo metaobject_reference los necesitan) ---
const existingMo = DRY ? [] : (await gql(`{ metaobjectDefinitions(first: 100) { nodes { type id } } }`)).metaobjectDefinitions.nodes;
const moIds = Object.fromEntries(existingMo.map((d) => [d.type, d.id]));

for (const mo of defs.metaobjects) {
  if (moIds[mo.type]) { console.log(`= metaobject ${mo.type} ya existe`); continue; }
  const fieldDefinitions = mo.fields.map((f) => ({
    key: f.key, name: f.name, type: f.type, required: !!f.required,
    validations: f.validations || (f.metaobject ? [{ name: 'metaobject_definition_id', value: moIds[f.metaobject] || `PENDING:${f.metaobject}` }] : [])
  }));
  const input = {
    type: mo.type, name: mo.name,
    access: { storefront: mo.storefront ? 'PUBLIC_READ' : 'NONE' },
    capabilities: { publishable: { enabled: false }, translatable: { enabled: true } },
    fieldDefinitions
  };
  if (mo.single_entry) input.capabilities.publishable = { enabled: false };
  console.log(`+ metaobject ${mo.type} (${fieldDefinitions.length} campos)`);
  if (DRY) continue;
  const data = await gql(`mutation($d: MetaobjectDefinitionCreateInput!) { metaobjectDefinitionCreate(definition: $d) { metaobjectDefinition { id type } userErrors { field message code } } }`, { d: input });
  if (userErrors(data.metaobjectDefinitionCreate, mo.type)) moIds[mo.type] = data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  await sleep(300);
}

// Segunda pasada: referencias entre metaobjects que quedaron PENDING (ej. cotizacion → asesor)
// Se resuelve en Admin manualmente si aparece el aviso; es raro porque el orden del JSON ya respeta dependencias.

// --- Metafields de producto, colección, cliente y tienda ---
const owners = [
  ['PRODUCT', defs.product], ['COLLECTION', defs.collection], ['CUSTOMER', defs.customer], ['CUSTOMER', defs.customer_b2c], ['SHOP', defs.shop]
];
const existingMf = {};
for (const [ownerType] of owners) {
  if (DRY || existingMf[ownerType]) continue;
  const d = await gql(`query($o: MetafieldOwnerType!) { metafieldDefinitions(first: 250, ownerType: $o) { nodes { namespace key } } }`, { o: ownerType });
  existingMf[ownerType] = new Set(d.metafieldDefinitions.nodes.map((n) => `${n.namespace}.${n.key}`));
}

for (const [ownerType, group] of owners) {
  for (const f of group.definitions) {
    const full = `${group.namespace}.${f.key}`;
    if (existingMf[ownerType]?.has(full)) { console.log(`= ${ownerType} ${full} ya existe`); continue; }
    const validations = [...(f.validations || [])];
    if (f.metaobject) validations.push({ name: 'metaobject_definition_id', value: moIds[f.metaobject] || '' });
    const input = {
      ownerType, namespace: group.namespace, key: f.key, name: f.name, type: f.type, validations,
      access: { storefront: 'PUBLIC_READ' },
      pin: true
    };
    if (f.filterable && ownerType === 'PRODUCT') input.capabilities = { smartCollectionCondition: { enabled: true }, adminFilterable: { enabled: true } };
    console.log(`+ ${ownerType} ${full} (${f.type})`);
    if (DRY) continue;
    const data = await gql(`mutation($d: MetafieldDefinitionInput!) { metafieldDefinitionCreate(definition: $d) { createdDefinition { id } userErrors { field message code } } }`, { d: input });
    userErrors(data.metafieldDefinitionCreate, full);
    await sleep(250);
  }
}

console.log('\nListo. Siguiente: node scripts/import-mocks.mjs');
console.log('Recuerda en Search & Discovery activar las facetas:', defs.facetas_search_discovery.join(', '));
