#!/usr/bin/env node
/**
 * Pendiente 2e: "Mis unidades en flota" filtra por un campo de texto `cliente_id`, porque un
 * customer_reference (`cliente`) no resuelve de forma fiable en Liquid del storefront — el mismo bug
 * que ya se corrigió en las cotizaciones.
 *
 * 1. Crea el campo `cliente_id` en la definición `brenson_unidad` si no existe.
 * 2. Rellena `cliente_id` con el id numérico del cliente de `cliente` en cada unidad donde falte o no coincida.
 *
 * El equipo carga unidades en el Admin eligiendo el cliente con el selector (`cliente`); este script
 * completa el resto. Correrlo después de cargar unidades, hasta que un webhook de metaobjetos lo
 * automatice (Fase 4). Idempotente.
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/sync-unidades-cliente-id.mjs [--dry-run]
 */
import { gql, userErrors, dryRun } from './lib/shopify-admin.mjs';

const TYPE = 'brenson_unidad';
const def = (await gql(`query($t: String!) { metaobjectDefinitionByType(type: $t) { id fieldDefinitions { key } } }`, { t: TYPE })).metaobjectDefinitionByType;
if (!def) { console.error(`✗ ${TYPE} no existe en la tienda`); process.exit(1); }

if (!def.fieldDefinitions.some((f) => f.key === 'cliente_id')) {
  if (dryRun()) console.log(`(dry-run) crearía ${TYPE}.cliente_id`);
  else {
    const r = await gql(`mutation($id: ID!, $fd: [MetaobjectFieldDefinitionOperationInput!]!) { metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fd }) { metaobjectDefinition { id } userErrors { field message } } }`,
      { id: def.id, fd: [{ create: { key: 'cliente_id', name: 'ID del cliente (automático)', type: 'single_line_text_field' } }] });
    if (userErrors(r.metaobjectDefinitionUpdate, `${TYPE}.cliente_id`)) console.log(`+ ${TYPE}.cliente_id creado`);
  }
} else console.log(`= ${TYPE}.cliente_id ya existe`);

let after = null, revisadas = 0, actualizadas = 0, sinCliente = 0;
do {
  const d = await gql(`query($a: String) { metaobjects(type: "${TYPE}", first: 100, after: $a) { pageInfo { hasNextPage endCursor } nodes { id serie: field(key: "serie") { value } cliente: field(key: "cliente") { value } cid: field(key: "cliente_id") { value } } } }`, { a: after });
  for (const u of d.metaobjects.nodes) {
    revisadas++;
    const esperado = u.cliente?.value ? u.cliente.value.split('/').pop() : '';
    if (!esperado) { sinCliente++; console.warn(`  ⚠ ${u.serie?.value || u.id} sin cliente asignado`); continue; }
    if (u.cid?.value === esperado) continue;
    if (dryRun()) { console.log(`(dry-run) ${u.serie?.value}: cliente_id → ${esperado}`); continue; }
    const r = await gql(`mutation($id: ID!, $f: [MetaobjectFieldInput!]!) { metaobjectUpdate(id: $id, metaobject: { fields: $f }) { metaobject { id } userErrors { field message } } }`, { id: u.id, f: [{ key: 'cliente_id', value: esperado }] });
    if (userErrors(r.metaobjectUpdate, u.serie?.value || u.id)) actualizadas++;
  }
  after = d.metaobjects.pageInfo.hasNextPage ? d.metaobjects.pageInfo.endCursor : null;
} while (after);
console.log(`Unidades revisadas: ${revisadas} · actualizadas: ${actualizadas} · sin cliente: ${sinCliente}`);
