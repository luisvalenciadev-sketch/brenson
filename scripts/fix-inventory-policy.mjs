#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const products = (await gql(
  `{ products(first: 50, query: "handle:brenson-*") { nodes { id handle variants(first: 10) { nodes { id inventoryPolicy } } } } }`
)).products.nodes;

for (const p of products) {
  const toFix = p.variants.nodes.filter((v) => v.inventoryPolicy !== 'CONTINUE');
  if (!toFix.length) { console.log('= ya ok', p.handle); continue; }
  console.log('+ fix', p.handle, toFix.length, 'variantes');
  const data = await gql(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } } }`,
    { productId: p.id, variants: toFix.map((v) => ({ id: v.id, inventoryPolicy: 'CONTINUE' })) }
  );
  userErrors(data.productVariantsBulkUpdate, p.handle);
  await sleep(300);
}
console.log('\nListo.');
