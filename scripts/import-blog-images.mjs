#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const articles = {
  'gid://shopify/Article/567694950475': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbDbRGGZEeE_D4EFAZKVUfMIPKluWgxy5gTJXbWVLEjUxxLt4YoMC0Kj9_vW6ipR31ZhNYgxLYlaL2M_F7c3H6L1Rb8urHyuXmNjg-_Y1vjraKh9qlyVw8mP8vDnF5RX6KAabYE_oZW6s9uf38ORbXzptWy-Sg56D0P52P6NYHnzchA2-eyeMlGl1AFkTgZu52mAaeO4HylwqLi199xG_HNsW2Vcz9yHkrzeESgPzVTSy7x2UGDzlCYyFeun3LeA-n4joXu8hTcMw',
  'gid://shopify/Article/567694983243': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3ExZMzjeSvhz9wVuCiZZIQF4GXw789J09kAPkfZiOpGPmN70T_gBb5tB5DzYS8RGHbpptr8YGsEOjOXFU4ZTrz_Pmcbzv0hU7oYm-gX3mmp4HIXVNc4wJju7NEstPxq6NqPXQRN-FN1_LHkXypqYawVHh7IbLZ1PLFbElmQLOxM-s7EPTdVEyBiS1hrJSyeQ3fs9ZMvaUedy5GsMZCgZl1JulG1xANwdtCV08p8wKtE_1ZtxmMAGQ22emayxOPX7kwVosxCsNzXo',
  'gid://shopify/Article/567695048779': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvFMjnZHYsEMZGZlHg8eCgS0v2iVfDsp1nKZgokpjLcMOL3SLWnjNDZIjOxLuFXMIr0daZrFYsDy1k8DHfziz7vhOG42dFVWkxiEU4XQyqzl3cFhbD1mw65l-ow7YuL9ANObS4oAfIfT7VZjqmGd0r_dMa3SWNxnt09cPCdDsMa8r_9DrLlSwys64c9_YPsjObzMKmYbLDc1_soe4XAFYdpBCkx5KL8s5IjALtBnYeAK0f9jeXQv2zgfcDjDkiOXkVY9e0menuY_w',
  // Los 3 restantes no tenían imagen (detectado en validación visual de home, sesión 2026-09-16).
  // Sin mockup propio para reutilizar como fuente: se reutiliza una imagen ya aprobada del mismo tema
  // en vez de inventar una URL nueva. "Caso 15 unidades" = misma nota que el caso de uso del home;
  // los otros dos usan la foto del producto de la categoría que tratan (mismo criterio que los 3
  // productos con "foto prestada" documentado en el pendiente de fotografía del catálogo).
  'gid://shopify/Article/567695114315': 'https://cdn.shopify.com/s/files/1/0622/1974/7403/files/AB6AXuAddzSwndJXRoi51lrjcwXDYn2Al0gEemuFV6JLZ1oNcgaU8uyIdKfueGhze9E9z4PUqdtCE4xAvvlMk934wkj0a3RjIuHntn3Otp_DQ_nA8IYQWMm2sUmWNQmVdfjPIqQ1WhprUTc3jRjPzrkvijQ6_DTZ_KzmCdhWoofQY-bKB34e5IV.jpg', // Caso: 15 unidades eléctricas última milla Caribe (= foto del caso de uso brenson_caso_uso)
  'gid://shopify/Article/567695081547': 'https://cdn.shopify.com/s/files/1/0622/1974/7403/files/AB6AXuCbcyxVVLYS8Hu9eHeatBrIWVqORpufRezZNkzIiBoHX17f1OtIC0-kTkZHzAzFlR8M5qYPMKwDrKoSHz9uTpy_gR1a9QvlV3AvTfhAyTn2VrHMtEp6WScw0PcpWb32twq7Mb8zUgENKfTcLdBWEyepS8A4vbVP20_hyRgAac2rDTwx8Qw.jpg', // SOAT y matrícula motocarros → foto Brenson Carga 500
  'gid://shopify/Article/567695016011': 'https://cdn.shopify.com/s/files/1/0622/1974/7403/files/AB6AXuCbyQA9F5z5fg-VMardGjevlqqkH02Pcf1E-MiqwDu6fZ7aO0hlHcyFYlA1hRNfbKK_Mkm9s043SdgyUEroU5fhEWMGF5_12Czb8lisbw-0S2PNHAp0EzABtrj1mXH1woiMe4qLUIIEijtG9CRT-bH4xP3dG0LkWViCSLIPBfasNcA-czl.jpg', // Cuánto cuesta cargar un ciclomotor → foto Brenson City 1500
};

for (const [id, url] of Object.entries(articles)) {
  console.log('article image', id);
  const data = await gql(
    `mutation($input: ArticleUpdateInput!) { articleUpdate(id: "${id}", article: $input) { article { id } userErrors { field message } } }`,
    { input: { image: { url } } }
  );
  userErrors(data.articleUpdate, id);
  await sleep(400);
}
console.log('\nListo.');
