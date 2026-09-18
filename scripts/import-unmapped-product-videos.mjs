#!/usr/bin/env node
// Sube los 7 videos de `.tmp_extract/DOC PAGINA WEB/videos de productos /` cuyo nombre NO
// identifica el modelo con certeza. Por indicación explícita de Luis se suben ya (no se dejan
// sin tocar), pero como archivos sueltos en Shopify Files (fileCreate) — SIN asociarlos a
// ningún producto, para no mostrar un video equivocado en la ficha de un vehículo real.
// Quedan pendientes de que alguien los reasigne al producto correcto desde Admin → Contenido → Archivos.
//
// Uso: SHOPIFY_SHOP=brenson-0.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/import-unmapped-product-videos.mjs [--dry-run]
import { gql, sleep, dryRun } from './lib/shopify-admin.mjs';
import { readFileSync, statSync } from 'node:fs';

const BASE = new URL('../.tmp_extract/DOC PAGINA WEB/videos de productos /', import.meta.url);
const DRY = dryRun();

const FILES = [
  { file: '0202.mp4' },
  { file: '1200.mp4' },
  { file: '1202.mp4' },
  { file: '130101.mp4' },
  { file: '2701.mp4' },
  { file: '3001.mp4' },
  { file: 'IMG_2931.MOV', mime: 'video/quicktime' },
];

const STAGED_UPLOADS_CREATE = `
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const FILE_CREATE = `
mutation($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id alt ... on Video { id fileStatus } }
    userErrors { field message }
  }
}`;

async function uploadOne(v) {
  const fileUrl = new URL(v.file, BASE);
  const filePath = decodeURIComponent(fileUrl.pathname.slice(1)).replace(/\//g, '\\');
  const size = statSync(filePath).size;
  const mimeType = v.mime || 'video/mp4';
  const alt = `SIN ASIGNAR — video de producto pendiente de identificar modelo (${v.file})`;

  if (DRY) {
    console.log(`  [dry-run] subiría ${v.file} como archivo suelto (${size} bytes, ${mimeType})`);
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

  const created = await gql(FILE_CREATE, { files: [{ originalSource: target.resourceUrl, contentType: 'VIDEO', alt }] });
  if (created.fileCreate.userErrors?.length) { console.log(`  ! fileCreate ${v.file}:`, JSON.stringify(created.fileCreate.userErrors)); return; }
  console.log(`  + ${v.file} -> ${created.fileCreate.files[0].id} (archivo suelto, sin producto)`);
}

for (const v of FILES) {
  console.log(`\n=== ${v.file} ===`);
  await uploadOne(v);
  await sleep(500);
}
console.log('\nListo. Los 7 quedaron en Admin → Contenido → Archivos, sin producto asignado.');
