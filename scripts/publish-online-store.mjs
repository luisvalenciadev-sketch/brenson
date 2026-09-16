#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const ONLINE_STORE = 'gid://shopify/Publication/119092904011';

async function publish(id) {
  const data = await gql(
    `mutation($id: ID!, $input: [PublicationInput!]!) { publishablePublish(id: $id, input: $input) { userErrors { field message } } }`,
    { id, input: [{ publicationId: ONLINE_STORE }] }
  );
  if (data.publishablePublish.userErrors?.length) console.log('  !', id, JSON.stringify(data.publishablePublish.userErrors));
}

const products = (await gql(`{ products(first: 50) { nodes { id handle } } }`)).products.nodes;
for (const p of products) {
  console.log('product', p.handle);
  await publish(p.id);
  await sleep(200);
}

const collections = (await gql(`{ collections(first: 50) { nodes { id handle } } }`)).collections.nodes;
for (const c of collections) {
  console.log('collection', c.handle);
  await publish(c.id);
  await sleep(200);
}

console.log('\nListo.');
