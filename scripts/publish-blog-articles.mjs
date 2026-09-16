#!/usr/bin/env node
import { gql, userErrors, sleep } from './lib/shopify-admin.mjs';

const arts = (await gql(`{ articles(first: 20, query: "blog_id:91281227851") { nodes { id handle } } }`)).articles.nodes;
for (const a of arts) {
  console.log('publish article', a.handle);
  const data = await gql(
    `mutation($id: ID!, $input: ArticleUpdateInput!) { articleUpdate(id: $id, article: $input) { article { id } userErrors { field message } } }`,
    { id: a.id, input: { isPublished: true } }
  );
  userErrors(data.articleUpdate, a.handle);
  await sleep(300);
}
console.log('Listo.');
