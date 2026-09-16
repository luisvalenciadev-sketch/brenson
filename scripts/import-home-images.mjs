#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const IMG = {
  bicicletas: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGGh-YrKpcr8C-PSBnu3RWJMt4XHG6GBWja7p2ZLt-aVVUFofSA9_IPljb6W_dWHgPqEF5HQhhNYdWxUcRqagGNqVUznhN9FtZedrliX29nkgrdW8S3G6Kouwuoi1W7OPl9_326Iw7AzUG6WSKba653269cMneago4aP1PAsht1xzVJhmQse4UAf6l0eo4Tu4UDFJInScFPtnpegPhityV8Iiu8hxL5frYUDe3gLtp7GMet2rVy-LIeQ4k-4CcduONYeasRbFrP54',
  ciclomotores: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOfdQMreug0gQ1IkFPldYhfi_fLYCb_kD5-b3MB_GTywA1IHtppwFGH5jgKz2X0SC4pNbvEhiBOAnMm6X_6dlWlquSO5UOMcmS3QdaIcUqFMFS4EGu8W8zShA9s7kDsMPrcUMzX-sAdrHe4E05lLaVzBRASNTRFWHJbhOdMYQXd4rwQgMpwliD1BDS1HIj8XE59hCpsohbz4ZM3x3uqh_WsXKXS27Lt1i-dj3EiOxTpPOHPQhQ6NT69KmSBd5_s3i2nyS_NnJoeYo',
  motocarros: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8GSEBMWH0lns7yHIrABxzXRcCuOgOw72VMVn5pFy9_oF97e_fLBAQCAu4oLAEOTUa4ttrRf_i4bAi8k6XPQeQQlbFhcIsiHAIpFbI6x2dN9XjUiQyjN6jEhsOe7EU5Im-2c9W47PIT3CGdfMe5OIq8JIncSFxK7e5bir_uxvQPKuEOfjI_wQdiwE10ICIk8zynVeP1h2Id5gNuAxxFB7iWwdCO2__VxTK5cnFBSf03z7iSbIHRbpFvgzGdOufr5qoDPSuGifcc4M',
  cuadriciclos: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCK7R9N15bbeapPZQJw934I-QKjeP0ILRQXty_ZP7osNr97r0htq2WX0VuZxKEFNadn3d9LN1-FeCDZb8LAUo_IOlHwrI60bcI6dT9bifBnKlRnocPdJ6klDNDZSHe6u8TT2sG_q_POQZCyVbQ6_j8kKbKDh9MEQr_M4tO_O_Trvagdb_HZSPs15W9DfHw2pBIPXV3ty8V-NBkXGpfYqDH-90P8FQ_V53JualYWbkEizcIVUCkh1XpOS4VbzKTeTzVU6yv1t0rLMZ8',
  city1500: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbyQA9F5z5fg-VMardGjevlqqkH02Pcf1E-MiqwDu6fZ7aO0hlHcyFYlA1hRNfbKK_Mkm9s043SdgyUEroU5fhEWMGF5_12Czb8lisbw-0S2PNHAp0EzABtrj1mXH1woiMe4qLUIIEijtG9CRT-bH4xP3dG0LkWViCSLIPBfasNcA-czlLVpUD58VWJoV6jlZsuiyoo4nEBvyGUcxjUgmnnnc9t8MIA-yV4CdEAgwjjjSpIoEgzQdDs7CfKlbzxp3kwuhlgNH7GgI',
  carga500: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbcyxVVLYS8Hu9eHeatBrIWVqORpufRezZNkzIiBoHX17f1OtIC0-kTkZHzAzFlR8M5qYPMKwDrKoSHz9uTpy_gR1a9QvlV3AvTfhAyTn2VrHMtEp6WScw0PcpWb32twq7Mb8zUgENKfTcLdBWEyepS8A4vbVP20_hyRgAac2rDTwx8QwZItTMsjPRKS9PMGtZD0piaFVlIIZxmYBSJZv1KhQt7s_5fn8RCOfpcCdcqy1XxvBBtmllqxcxx8rTVMnbGCpxT41j2yU',
  urbanE250: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6trLt4NyD0nHZpOdpPykvUruXHdAX4ITaU92N3F16exqOWiJx1sIV3vCqRtg7feHa7TcW-0K1Bwxl_3Rx__5Z2vWAzKMXnH7vhQBMMW3d1LK_7xZ9a7hP9W0CapUO_xGNh35JNbYVSZAF8OHy6VivFroLi2o7JjE8RBLbm9peatIdNN__s0gYZwR4LAdbDLvhY_10Aqg-k1lGP-Jp8qE4Abs-W2248yI0e_MkKqClBKhJ46x7I27enfkoT1O_VBfMKdOlpQd2lgA',
  quadTour: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1MlvJUQixj7t2obD2kzIx5SOdldniw_RDqtyUA1LrmcdlefocsrUQU2pRZgziMNpa198ZCKnd3bmNLBKqKoI-sJayKyP1WBNNwiPiDNTm2MDHLeGVmcAbU1aepOQah4TIdrXzPPaPWsh5JFDhTvB5pv76qzaG8EBwTSNUIg6V_Uwu0K99eIYTyOrRVtfTtUEuAbkwuGcxegiEIrTdpmR_0NjWcl_VDYccZxPaL4EB1worKh-SjjlYtaEJu5So_JWXMd0xOMH0UCY',
  parqueNatural: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnbtOzMVPmMn8uvRD2Etf7MZGy0t8LQ70u5u8W2tl2WvtIOXWJd2Ac7_Ly1mlRsa3gimby2XeJbTgohld2GTPqhOMGY4tdoTEhM9ut5h97-8tWgzI_dn4l9Z_z9ARGHhZZTOV988T0tn7-Wxj_NEfauznHgh4FvBdSp3d__0m8_vTEYEMCJoGTEQ2RatUo701HY7oFbzu3wZIk_ftHT5PSraIU2dYD9mgnVLRmvwPzownpE6BWVfzgVuSetDOCfWrQq6eiRpT6RKs',
  ultimaMilla: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAddzSwndJXRoi51lrjcwXDYn2Al0gEemuFV6JLZ1oNcgaU8uyIdKfueGhze9E9z4PUqdtCE4xAvvlMk934wkj0a3RjIuHntn3Otp_DQ_nA8IYQWMm2sUmWNQmVdfjPIqQ1WhprUTc3jRjPzrkvijQ6_DTZ_KzmCdhWoofQY-bKB34e5IVIAciH6UXx5MkwoIb07Ddsg8VS9qr5P7y6jEqrKpD2fHpOlctCvM3pB3qJLA7hcoOm7zhtjwIpS0hgn-Pc3amW_vmuSR8',
  carlos: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFc1a6GBCSCHLbbX1FNgXHpq9b93sDwxAM5AtmIly2j5pBiOKq4CzIMIZMF2UgOyIXW2ByDOCsRrjZi66Bb78S58Uj_V9p37LJMqmDpN6T9m7CJbnDomT6310xId_NJAZL9RedVWzNZf9dwHkM-SEnlt6F20ux5-kmhUYMIcwKLKpKy2pF5CDA99cxTT0wegfs2fK7T6ovrdoNQWk8q6b2sUqh7QO_yf695sgrhXGoMDKVmQUjEQt8Yq0PDm1vGTttR9UKnE6nbGM',
  valentina: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAeaiDNIVZYzbdSxLYUR1ETxTA4bdmaNXKtIOBJapU6Vy1xPPFDzuZXJxGDI9lWwW-sNRvYgtDdZuYEaNNgw98tMZDo7efkSuSh0jQETYuqL4KNGVMik5GDQYkXXrVuM6aS4Ao0cND4kdCotjFAAYa2A-f035osxd5gQ-qxJ4BNxmjWWvQvUcUC-ha0IQB3NFLJ3ikfnrvZaQ17409miq3oAlo7SoKR474RaN6VoJ2O7UbyGQNIzuicg-ZmPI2MnYwq77amKGM6gGA',
  andres: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCV_uhq4S6hfB0irJVpQPR5fcJi45A1Ft7otJZ67uFzxk2Qs8qo2lIsoyuuQbx_FpgEtY08GuXeHhiEszOA2WimVnohNAWwuw6CJpCyqsz9BWj8QzD8r0xRakOQjsHNCZ1vRykKw8DPaqgMFPjyFo1GQ7sANHYxPoJMCTGp6F91nsGZaFcETpARp9sWSjGJBUMgM_ceAgZPSbAO8RzXtfQGReF5Ay13qxFrTGLosIs-tR9MBoaKvGf95P3jrsU67Rg1nESpnCqiiy4',
  blogReparto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbDbRGGZEeE_D4EFAZKVUfMIPKluWgxy5gTJXbWVLEjUxxLt4YoMC0Kj9_vW6ipR31ZhNYgxLYlaL2M_F7c3H6L1Rb8urHyuXmNjg-_Y1vjraKh9qlyVw8mP8vDnF5RX6KAabYE_oZW6s9uf38ORbXzptWy-Sg56D0P52P6NYHnzchA2-eyeMlGl1AFkTgZu52mAaeO4HylwqLi199xG_HNsW2Vcz9yHkrzeESgPzVTSy7x2UGDzlCYyFeun3LeA-n4joXu8hTcMw',
  blogNormativa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3ExZMzjeSvhz9wVuCiZZIQF4GXw789J09kAPkfZiOpGPmN70T_gBb5tB5DzYS8RGHbpptr8YGsEOjOXFU4ZTrz_Pmcbzv0hU7oYm-gX3mmp4HIXVNc4wJju7NEstPxq6NqPXQRN-FN1_LHkXypqYawVHh7IbLZ1PLFbElmQLOxM-s7EPTdVEyBiS1hrJSyeQ3fs9ZMvaUedy5GsMZCgZl1JulG1xANwdtCV08p8wKtE_1ZtxmMAGQ22emayxOPX7kwVosxCsNzXo',
  blogBateria: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvFMjnZHYsEMZGZlHg8eCgS0v2iVfDsp1nKZgokpjLcMOL3SLWnjNDZIjOxLuFXMIr0daZrFYsDy1k8DHfziz7vhOG42dFVWkxiEU4XQyqzl3cFhbD1mw65l-ow7YuL9ANObS4oAfIfT7VZjqmGd0r_dMa3SWNxnt09cPCdDsMa8r_9DrLlSwys64c9_YPsjObzMKmYbLDc1_soe4XAFYdpBCkx5KL8s5IjALtBnYeAK0f9jeXQv2zgfcDjDkiOXkVY9e0menuY_w',
};

// 1) Imágenes de colección (native collection.image)
const collections = {
  'gid://shopify/Collection/300125585483': IMG.bicicletas,
  'gid://shopify/Collection/300125618251': IMG.ciclomotores,
  'gid://shopify/Collection/300125651019': IMG.motocarros,
  'gid://shopify/Collection/285911875659': IMG.cuadriciclos,
};
for (const [id, src] of Object.entries(collections)) {
  console.log('collection image', id);
  const data = await gql(
    `mutation($input: CollectionInput!) { collectionUpdate(input: $input) { collection { id } userErrors { field message } } }`,
    { input: { id, image: { src } } }
  );
  userErrors(data.collectionUpdate, id);
  await sleep(400);
}

// 2) Imágenes de producto (best-sellers home)
const products = {
  'gid://shopify/Product/8109861044299': IMG.city1500,
  'gid://shopify/Product/8109861437515': IMG.carga500,
  'gid://shopify/Product/8109860749387': IMG.urbanE250,
  'gid://shopify/Product/8109862060107': IMG.quadTour,
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

// 3) Subir fotos de testimonios y casos de uso via fileCreate, luego setear metaobject fields
async function uploadFile(src, alt) {
  const data = await gql(
    `mutation($files: [FileCreateInput!]!) { fileCreate(files: $files) { files { id ... on MediaImage { image { url } } } userErrors { field message } } }`,
    { files: [{ originalSource: src, alt, contentType: 'IMAGE' }] }
  );
  if (data.fileCreate.userErrors?.length) console.log('  ! fileCreate', JSON.stringify(data.fileCreate.userErrors));
  return data.fileCreate.files[0]?.id;
}

async function waitReady(fileId) {
  for (let i = 0; i < 10; i++) {
    const data = await gql(`query($id: ID!) { node(id: $id) { ... on MediaImage { status } } }`, { id: fileId });
    if (data.node?.status === 'READY') return;
    await sleep(1000);
  }
}

const testimonioFotos = {
  'gid://shopify/Metaobject/282577666123': { src: IMG.carlos, alt: 'Carlos Mendoza' }, // carlos-p-barranquilla
  'gid://shopify/Metaobject/282577698891': { src: IMG.valentina, alt: 'Valentina Restrepo' }, // maria-f-santa-marta
  'gid://shopify/Metaobject/282577731659': { src: IMG.andres, alt: 'Andrés Giraldo' }, // jorge-l-cartagena
};
for (const [moId, { src, alt }] of Object.entries(testimonioFotos)) {
  console.log('testimonio foto', moId);
  const fileId = await uploadFile(src, alt);
  await waitReady(fileId);
  const data = await gql(
    `mutation($metaobject: MetaobjectUpdateInput!, $id: ID!) { metaobjectUpdate(id: $id, metaobject: $metaobject) { metaobject { id } userErrors { field message } } }`,
    { id: moId, metaobject: { fields: [{ key: 'foto', value: fileId }] } }
  );
  userErrors(data.metaobjectUpdate, moId);
  await sleep(400);
}

const casoUsoImagenes = {
  'gid://shopify/Metaobject/282577993803': { src: IMG.parqueNatural, alt: 'Parque Natural Colombia' }, // recorridos-ecologicos
  'gid://shopify/Metaobject/282578026571': { src: IMG.ultimaMilla, alt: 'Última Milla Caribe' }, // ultima-milla-electrica
};
for (const [moId, { src, alt }] of Object.entries(casoUsoImagenes)) {
  console.log('caso_uso imagen', moId);
  const fileId = await uploadFile(src, alt);
  await waitReady(fileId);
  const data = await gql(
    `mutation($metaobject: MetaobjectUpdateInput!, $id: ID!) { metaobjectUpdate(id: $id, metaobject: $metaobject) { metaobject { id } userErrors { field message } } }`,
    { id: moId, metaobject: { fields: [{ key: 'imagen', value: fileId }] } }
  );
  userErrors(data.metaobjectUpdate, moId);
  await sleep(400);
}

// 4) Imágenes destacadas de artículos de blog
const articles = {
  'gid://shopify/Article/567694950475': IMG.blogReparto, // ahorrar-80...
  'gid://shopify/Article/567694983243': IMG.blogNormativa, // licencia-bicicleta...
};
for (const [id, src] of Object.entries(articles)) {
  console.log('article image', id);
  const data = await gql(
    `mutation($input: ArticleUpdateInput!) { articleUpdate(id: "${id}", article: $input) { article { id } userErrors { field message } } }`,
    { input: { image: { url: src } } }
  );
  userErrors(data.articleUpdate, id);
  await sleep(400);
}

console.log('\nListo.');
