#!/usr/bin/env node
import { gql, sleep } from './lib/shopify-admin.mjs';

const url = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnsAoTWqC9bnnsfxiwMZuwSVgJauzXebQU3SWrpEmZHZKTxlI3-7qubEjzb8RoH3DRjW5pYp9fd45MuhAK6OITRTiS7ivZai911zZfbj3quhnvkK2W0Z3h4seQUz1AEE1eVjoFfkNDcbMbHGx7QCZf5eNlA1Ks7LU18fJDxD6yeH0BYNm-rW4yocsMnWHYEGQNE_wDn3Y8zv9nay15h5oTl0f_DJWd7n5wn-1BcVCOSaU1Y5Mf4DshL9_7wuMJOwlPa_RxII7EuMs';

const data = await gql(
  `mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id ... on MediaImage { image { url } } } userErrors { field message } } }`,
  { files: [{ originalSource: url, contentType: 'IMAGE', alt: 'Brenson hero motocarro Barranquilla' }] }
);
console.log(JSON.stringify(data, null, 2));
const id = data.fileCreate.files[0].id;

for (let i = 0; i < 10; i++) {
  await sleep(1500);
  const check = await gql(`query($id: ID!) { node(id: $id) { ... on MediaImage { image { url } status } } }`, { id });
  console.log(JSON.stringify(check, null, 2));
  if (check.node.status === 'READY') break;
}
