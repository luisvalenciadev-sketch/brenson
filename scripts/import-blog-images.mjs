#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const articles = {
  'gid://shopify/Article/567694950475': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbDbRGGZEeE_D4EFAZKVUfMIPKluWgxy5gTJXbWVLEjUxxLt4YoMC0Kj9_vW6ipR31ZhNYgxLYlaL2M_F7c3H6L1Rb8urHyuXmNjg-_Y1vjraKh9qlyVw8mP8vDnF5RX6KAabYE_oZW6s9uf38ORbXzptWy-Sg56D0P52P6NYHnzchA2-eyeMlGl1AFkTgZu52mAaeO4HylwqLi199xG_HNsW2Vcz9yHkrzeESgPzVTSy7x2UGDzlCYyFeun3LeA-n4joXu8hTcMw',
  'gid://shopify/Article/567694983243': 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3ExZMzjeSvhz9wVuCiZZIQF4GXw789J09kAPkfZiOpGPmN70T_gBb5tB5DzYS8RGHbpptr8YGsEOjOXFU4ZTrz_Pmcbzv0hU7oYm-gX3mmp4HIXVNc4wJju7NEstPxq6NqPXQRN-FN1_LHkXypqYawVHh7IbLZ1PLFbElmQLOxM-s7EPTdVEyBiS1hrJSyeQ3fs9ZMvaUedy5GsMZCgZl1JulG1xANwdtCV08p8wKtE_1ZtxmMAGQ22emayxOPX7kwVosxCsNzXo',
  'gid://shopify/Article/567695048779': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvFMjnZHYsEMZGZlHg8eCgS0v2iVfDsp1nKZgokpjLcMOL3SLWnjNDZIjOxLuFXMIr0daZrFYsDy1k8DHfziz7vhOG42dFVWkxiEU4XQyqzl3cFhbD1mw65l-ow7YuL9ANObS4oAfIfT7VZjqmGd0r_dMa3SWNxnt09cPCdDsMa8r_9DrLlSwys64c9_YPsjObzMKmYbLDc1_soe4XAFYdpBCkx5KL8s5IjALtBnYeAK0f9jeXQv2zgfcDjDkiOXkVY9e0menuY_w',
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
