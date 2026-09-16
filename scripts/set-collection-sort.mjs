#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const collections = [
  'gid://shopify/Collection/300125585483',
  'gid://shopify/Collection/300125618251',
  'gid://shopify/Collection/300125651019',
  'gid://shopify/Collection/285911875659',
];

for (const id of collections) {
  console.log('sort', id);
  const data = await gql(
    `mutation($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id } userErrors { field message } } }`,
    { input: { id, sortOrder: 'PRICE_ASC' } }
  );
  userErrors(data.collectionUpdate, id);
  await sleep(300);
}
console.log('\nListo.');
