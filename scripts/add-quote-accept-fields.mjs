#!/usr/bin/env node
/**
 * Agrega los campos accept_token, pedido_borrador_id y pedido_borrador_url a
 * brenson_cotizacion_b2b, que ya existe en la tienda. create-definitions.mjs solo crea
 * definiciones nuevas, no agrega campos a una que ya existe — por eso este script aparte
 * (mismo patrón que add-video-field.mjs). Necesarios para el flujo "Aceptar cotización"
 * (docs/FLUJO_COTIZACION_A_PEDIDO.md).
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/add-quote-accept-fields.mjs
 */
import { gql, userErrors } from './lib/shopify-admin.mjs';

const TYPE = 'brenson_cotizacion_b2b';
const FIELDS = [
  { key: 'accept_token', name: 'Token de aceptación', type: 'single_line_text_field' },
  { key: 'pedido_borrador_id', name: 'Draft order', type: 'single_line_text_field' },
  { key: 'pedido_borrador_url', name: 'URL pedido borrador', type: 'url' }
];

const { metaobjectDefinitions } = await gql(`{ metaobjectDefinitions(first: 100) { nodes { id type fieldDefinitions { key } } } }`);
const def = metaobjectDefinitions.nodes.find((d) => d.type === TYPE);
if (!def) { console.error(`✗ metaobject ${TYPE} no existe todavía en la tienda`); process.exit(1); }

for (const f of FIELDS) {
  if (def.fieldDefinitions.some((existing) => existing.key === f.key)) { console.log(`= ${TYPE}.${f.key} ya existe`); continue; }
  const data = await gql(
    `mutation($id: ID!, $fd: [MetaobjectFieldDefinitionOperationInput!]!) {
      metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fd }) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    { id: def.id, fd: [{ create: { key: f.key, name: f.name, type: f.type } }] }
  );
  if (userErrors(data.metaobjectDefinitionUpdate, `${TYPE}.${f.key}`)) console.log(`+ ${TYPE}.${f.key} creado`);
}
