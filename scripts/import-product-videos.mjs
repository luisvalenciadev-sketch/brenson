#!/usr/bin/env node
// Sube como media nativa de producto los videos de `.tmp_extract/DOC PAGINA WEB/videos de productos /`
// cuyo nombre de archivo identifica el modelo con certeza (tarea 4, PROMPT_CONTINUACION_17SEP_PARTE2.md).
// Los archivos con solo código numérico (0202.mp4, 1200.mp4, etc.) NO se suben aquí —
// no se adivina el modelo, se le pregunta al usuario primero.
//
// Uso: SHOPIFY_SHOP=brenson-0.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/import-product-videos.mjs [--dry-run]
import { gql, sleep, dryRun } from './lib/shopify-admin.mjs';
import { readFileSync, statSync } from 'node:fs';

const BASE = new URL('../.tmp_extract/DOC PAGINA WEB/videos de productos /', import.meta.url);
const DRY = dryRun();

const VIDEOS = [
  { file: 'DAKOTA verde menta.mp4', product: 'Dakota', id: 'gid://shopify/Product/7400617279563' },
  { file: 'PLATON.mp4', product: 'Platón', id: 'gid://shopify/Product/7400566685771' },
  { file: 'platon en trocha e inclinacion.mp4', product: 'Platón', id: 'gid://shopify/Product/7400566685771' },
  { file: 'VERA.mp4', product: 'Vera', id: 'gid://shopify/Product/7549564420171' },
  { file: 'VERONA.mp4', product: 'Verona', id: 'gid://shopify/Product/7400026669131' },
  { file: 'furgon nuevo.mp4', product: 'Furgón', id: 'gid://shopify/Product/7400626159691' },
  { file: 'monaco.mp4', product: 'Monaco', id: 'gid://shopify/Product/7431770112075' },
  { file: 'zero.MOV', product: 'Zero', id: 'gid://shopify/Product/7468152455243', mime: 'video/quicktime' },
];

const STAGED_UPLOADS_CREATE = `
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const PRODUCT_CREATE_MEDIA = `
mutation($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { id status }
    mediaUserErrors { field message }
  }
}`;

async function uploadOne(v) {
  const fileUrl = new URL(v.file, BASE);
  const filePath = decodeURIComponent(fileUrl.pathname.slice(1)).replace(/\//g, '\\');
  const size = statSync(filePath).size;
  const mimeType = v.mime || 'video/mp4';

  if (DRY) {
    console.log(`  [dry-run] subiría ${v.file} -> ${v.product} (${size} bytes, ${mimeType})`);
    return;
  }

  const staged = await gql(STAGED_UPLOADS_CREATE, {
    input: [{ filename: v.file, mimeType, httpMethod: 'POST', resource: 'VIDEO', fileSize: String(size) }],
  });
  const errs = staged.stagedUploadsCreate.userErrors;
  if (errs?.length) { console.log(`  ! stagedUploadsCreate ${v.file}:`, JSON.stringify(errs)); return; }
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  const buffer = readFileSync(filePath);
  form.append('file', new Blob([buffer], { type: mimeType }), v.file);

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok) { console.log(`  ! upload HTTP ${uploadRes.status} para ${v.file}`); return; }

  const created = await gql(PRODUCT_CREATE_MEDIA, {
    productId: v.id,
    media: [{ originalSource: target.resourceUrl, mediaContentType: 'VIDEO' }],
  });
  const mediaErrs = created.productCreateMedia.mediaUserErrors;
  if (mediaErrs?.length) console.log(`  ! productCreateMedia ${v.file}:`, JSON.stringify(mediaErrs));
  else console.log(`  + ${v.file} -> ${v.product} -> ${created.productCreateMedia.media[0].id}`);
}

for (const v of VIDEOS) {
  console.log(`\n=== ${v.file} (${v.product}) ===`);
  await uploadOne(v);
  await sleep(500);
}
console.log('\nListo.');
