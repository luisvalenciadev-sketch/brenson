#!/usr/bin/env node
/**
 * Publica los artículos de mock-data/blog.json como BORRADOR en el blog "movilidad-electrica" (lo crea si no existe).
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/import-blog.mjs [--dry-run]
 * Scopes: write_content.
 */
import { readFileSync } from 'node:fs';
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const B = JSON.parse(readFileSync(new URL('../mock-data/blog.json', import.meta.url), 'utf8'));
const DRY = dryRun();

let blogId = null;
if (!DRY) {
  const d = await gql(`query($q: String!) { blogs(first: 1, query: $q) { nodes { id handle } } }`, { q: `handle:${B.blog_handle}` });
  blogId = d.blogs.nodes[0]?.id;
  if (!blogId) {
    console.log(`+ blog ${B.blog_handle}`);
    const c = await gql(`mutation($b: BlogCreateInput!) { blogCreate(blog: $b) { blog { id } userErrors { field message } } }`, { b: { title: 'Movilidad eléctrica', handle: B.blog_handle, commentPolicy: 'CLOSED' } });
    userErrors(c.blogCreate, 'blog'); blogId = c.blogCreate.blog?.id;
  }
}

for (const a of B.articulos) {
  console.log(`+ artículo (borrador) ${a.handle}`);
  if (DRY) continue;
  const d = await gql(`mutation($a: ArticleCreateInput!) { articleCreate(article: $a) { article { id } userErrors { field message } } }`, {
    a: { blogId, title: a.titulo, handle: a.handle, summary: a.extracto, body: a.cuerpo_html, tags: [a.categoria, 'mock'], isPublished: false, author: { name: 'Equipo Brenson' } }
  });
  userErrors(d.articleCreate, a.handle);
  await sleep(300);
}
console.log('\nListo. Los artículos quedan como borrador hasta que Brenson valide las cifras [VALIDAR].');
