#!/usr/bin/env node
import { gql, sleep } from './lib/shopify-admin.mjs';

const products = {
  'gid://shopify/Product/8109860945995': 'https://lh3.googleusercontent.com/aida-public/AB6AXuASb2MdTh2-Skj_Pev8hWQdqsDLMiNj2QG08VgVJ3_W200DMQ1lq2l-VMwNtJ-Dx3YIxkZxnPGEiYuNTKz80k_XjLoSXePVQjc1-J6zwzd6bUwJ1EqnEl5XoeFVhf7FTcEtxNaofRmkTD52Ee9vAvAOvQvXcvqREzuYEKJes9mqbcNeDkdpKcGBhjXlwjYlcngY3Ilv5j2_vraEJZNqjkIEekMuSVZxj5BqcjPk4bCInn4VPGV3oB0rYF9RJ9k1pWbux4hhLFtFWCo', // Cargo Bike E350
  'gid://shopify/Product/8109861568587': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCB2LEvu1AjnpwgsHG8P3kO6mQbvdVr62EOVb-UydMxdtqnI3Sxe-EHcCyJFi1TZOFhBe6mdgTR0oG-YSDjqP2GMRxnWZdnrMOOTih6MxEg4WfUuRfvixmpTBl67AZFtLryBnpU9-ofoxsMBDgShFEhELje-VhPT1TOQ73n4k1Dtw4UCHmpE7d25mW2rt5uoIOpM2APxEEyaCtOBLe3yUG9rDTyOFJ3KceqkuKXKVgNoEOBj2Xz8__3j9xSnEzsdBvGYcZNFuMy4rw', // Carga 800 Pro
  'gid://shopify/Product/8109861765195': 'https://lh3.googleusercontent.com/aida-public/AB6AXuChUz1RketngNDqG36sRy0I0HeZs0FMeQqmryOTJ8S2p2R1pyGGWDCKDTbeOuPI-fJbrohkOaXot5Wi0EZeRh83c-_KLaqbbFf7SJ2PkMRTZpsIk7zsBoKtSWrU8N0bzEg2lc9KtTxthqIqAyLF1feHGb4YDrctHGGGnDdgOcUPf3kpnK0x0PdjwoZ9M6NBUrIHEJ9qB1WN7lKb_b0pz9lvOiOeCXyNaKNcZAj8f0TQVf5CQufeZBTEwj24jue5BcF71hK6Z2PW8Gw', // Quad Work 4x2
};

for (const [id, src] of Object.entries(products)) {
  console.log('product media', id);
  const data = await gql(
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { media { id } mediaUserErrors { field message } } }`,
    { productId: id, media: [{ originalSource: src, mediaContentType: 'IMAGE' }] }
  );
  if (data.productCreateMedia.mediaUserErrors?.length) console.log('  !', JSON.stringify(data.productCreateMedia.mediaUserErrors));
  await sleep(400);
}
console.log('\nListo.');
