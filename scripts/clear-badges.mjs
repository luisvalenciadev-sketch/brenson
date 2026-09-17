import { gql, userErrors } from './lib/shopify-admin.mjs';
const ids = [
  'gid://shopify/Product/8109860749387', // Urban E250
  'gid://shopify/Product/8109861437515', // Carga 500
  'gid://shopify/Product/8109862060107', // Quad Tour
];
const metafields = ids.map((ownerId) => ({ ownerId, namespace: 'brenson', key: 'badge' }));
const d = await gql(
  `mutation($m: [MetafieldIdentifierInput!]!) { metafieldsDelete(metafields: $m) { deletedMetafields { key } userErrors { field message } } }`,
  { m: metafields }
);
console.log(JSON.stringify(d, null, 2));
