#!/usr/bin/env node
import { gql, sleep } from './lib/shopify-admin.mjs';

const products = {
  // Trail E500 (bicicleta) -> foto de Urban E250 (misma categoría) como parecido temporal
  'gid://shopify/Product/8109860847691': 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6trLt4NyD0nHZpOdpPykvUruXHdAX4ITaU92N3F16exqOWiJx1sIV3vCqRtg7feHa7TcW-0K1Bwxl_3Rx__5Z2vWAzKMXnH7vhQBMMW3d1LK_7xZ9a7hP9W0CapUO_xGNh35JNbYVSZAF8OHy6VivFroLi2o7JjE8RBLbm9peatIdNN__s0gYZwR4LAdbDLvhY_10Aqg-k1lGP-Jp8qE4Abs-W2248yI0e_MkKqClBKhJ46x7I27enfkoT1O_VBfMKdOlpQd2lgA',
  // Pasajeros Tuk (cuadriciclo pasajeros) -> foto de Quad Tour (misma categoría)
  'gid://shopify/Product/8109861666891': 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1MlvJUQixj7t2obD2kzIx5SOdldniw_RDqtyUA1LrmcdlefocsrUQU2pRZgziMNpa198ZCKnd3bmNLBKqKoI-sJayKyP1WBNNwiPiDNTm2MDHLeGVmcAbU1aepOQah4TIdrXzPPaPWsh5JFDhTvB5pv76qzaG8EBwTSNUIg6V_Uwu0K99eIYTyOrRVtfTtUEuAbkwuGcxegiEIrTdpmR_0NjWcl_VDYccZxPaL4EB1worKh-SjjlYtaEJu5So_JWXMd0xOMH0UCY',
  // Quad Cargo 4x4 (cuadriciclo carga) -> foto de Quad Work 4x2 (misma categoría)
  'gid://shopify/Product/8109861896267': 'https://lh3.googleusercontent.com/aida-public/AB6AXuChUz1RketngNDqG36sRy0I0HeZs0FMeQqmryOTJ8S2p2R1pyGGWDCKDTbeOuPI-fJbrohkOaXot5Wi0EZeRh83c-_KLaqbbFf7SJ2PkMRTZpsIk7zsBoKtSWrU8N0bzEg2lc9KtTxthqIqAyLF1feHGb4YDrctHGGGnDdgOcUPf3kpnK0x0PdjwoZ9M6NBUrIHEJ9qB1WN7lKb_b0pz9lvOiOeCXyNaKNcZAj8f0TQVf5CQufeZBTEwj24jue5BcF71hK6Z2PW8Gw',
};

for (const [id, src] of Object.entries(products)) {
  console.log('product media (fallback)', id);
  const data = await gql(
    `mutation($productId: ID!, $media: [CreateMediaInput!]!) { productCreateMedia(productId: $productId, media: $media) { media { id } mediaUserErrors { field message } } }`,
    { productId: id, media: [{ originalSource: src, mediaContentType: 'IMAGE' }] }
  );
  if (data.productCreateMedia.mediaUserErrors?.length) console.log('  !', JSON.stringify(data.productCreateMedia.mediaUserErrors));
  await sleep(400);
}
console.log('\nListo.');
