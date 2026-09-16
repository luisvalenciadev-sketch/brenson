#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const badges = {
  'gid://shopify/Product/8109861109835': 'flota', // Delivery 2000
  'gid://shopify/Product/8109861306443': 'nuevo', // Sport 3000
};

for (const [productId, value] of Object.entries(badges)) {
  console.log('badge', productId, value);
  const data = await gql(
    `mutation($metafields: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $metafields) { userErrors { field message } } }`,
    { metafields: [{ ownerId: productId, namespace: 'brenson', key: 'badge', type: 'single_line_text_field', value }] }
  );
  userErrors({ userErrors: data.metafieldsSet.userErrors }, productId);
  await sleep(300);
}
console.log('\nListo.');
