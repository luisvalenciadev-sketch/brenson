#!/usr/bin/env node
/**
 * Agrega los campos de vocero (nombre, cargo, foto) al metaobject brenson_caso_uso.
 * Tarea 7 de docs/PROMPT_CONTINUACION_17SEP_PARTE2.md — solo estructura, sin contenido:
 * el nombre/cargo real del vocero nunca se inventa, se carga aparte cuando el usuario lo confirme.
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/add-vocero-fields.mjs
 */
import { gql, userErrors } from './lib/shopify-admin.mjs';

const NEW_FIELDS = [
  { key: 'vocero_nombre', name: 'Vocero: nombre', type: 'single_line_text_field' },
  { key: 'vocero_cargo', name: 'Vocero: cargo', type: 'single_line_text_field' },
  { key: 'vocero_foto', name: 'Vocero: foto', type: 'file_reference' },
];

const { metaobjectDefinitions } = await gql(`{ metaobjectDefinitions(first: 100) { nodes { id type fieldDefinitions { key } } } }`);
const def = metaobjectDefinitions.nodes.find((d) => d.type === 'brenson_caso_uso');
if (!def) { console.error('brenson_caso_uso no existe todavía'); process.exit(1); }

const toCreate = NEW_FIELDS.filter((f) => !def.fieldDefinitions.some((existing) => existing.key === f.key));
if (!toCreate.length) { console.log('= todos los campos de vocero ya existen'); process.exit(0); }

const data = await gql(
  `mutation($id: ID!, $fd: [MetaobjectFieldDefinitionOperationInput!]!) {
    metaobjectDefinitionUpdate(id: $id, definition: { fieldDefinitions: $fd }) {
      metaobjectDefinition { id }
      userErrors { field message code }
    }
  }`,
  { id: def.id, fd: toCreate.map((f) => ({ create: f })) }
);
if (userErrors(data.metaobjectDefinitionUpdate, 'brenson_caso_uso vocero')) {
  console.log(`+ campos creados: ${toCreate.map((f) => f.key).join(', ')}`);
}
