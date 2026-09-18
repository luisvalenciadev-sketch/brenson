#!/usr/bin/env node
/**
 * Agrega el campo "video" (file_reference) a los metaobjects brenson_testimonio y
 * brenson_caso_uso, que ya existen en la tienda. create-definitions.mjs solo crea
 * definiciones nuevas, no agrega campos a una que ya existe — por eso este script aparte.
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/add-video-field.mjs
 */
import { gql, userErrors } from './lib/shopify-admin.mjs';

const TARGETS = ['brenson_testimonio', 'brenson_caso_uso'];

const { metaobjectDefinitions } = await gql(`{ metaobjectDefinitions(first: 100) { nodes { id type fieldDefinitions { key } } } }`);

for (const type of TARGETS) {
  const def = metaobjectDefinitions.nodes.find((d) => d.type === type);
  if (!def) { console.warn(`⚠ metaobject ${type} no existe todavía en la tienda`); continue; }
  if (def.fieldDefinitions.some((f) => f.key === 'video')) { console.log(`= ${type}.video ya existe`); continue; }
  const data = await gql(
    `mutation($id: ID!, $fd: [MetaobjectFieldDefinitionOperationInput!]!) {
      metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fd }) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    { id: def.id, fd: [{ create: { key: 'video', name: 'Video', type: 'file_reference' } }] }
  );
  if (userErrors(data.metaobjectDefinitionUpdate, `${type}.video`)) console.log(`+ ${type}.video creado`);
}
