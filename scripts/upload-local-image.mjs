#!/usr/bin/env node
/**
 * Sube una imagen LOCAL a Contenido → Archivos de Shopify (upload-hero-image.mjs solo acepta una URL).
 * Imprime la URL del CDN y el valor `shopify://shop_images/<archivo>` que usa un image_picker del
 * tema (p. ej. `favicon` o `logo` en config/settings_data.json).
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/upload-local-image.mjs <ruta.png> "<alt>"
 */
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { gql, sleep, userErrors } from './lib/shopify-admin.mjs';

const [, , filePath, alt = ''] = process.argv;
if (!filePath) { console.error('Uso: node scripts/upload-local-image.mjs <ruta> "<alt>"'); process.exit(1); }
const bytes = await readFile(filePath);
const filename = basename(filePath);
const mimeType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[extname(filename).toLowerCase()];
if (!mimeType) { console.error('Formato no soportado:', filename); process.exit(1); }

// 1. Destino temporal de subida
const staged = await gql(`mutation($i: [StagedUploadInput!]!) { stagedUploadsCreate(input: $i) { stagedTargets { url resourceUrl parameters { name value } } userErrors { field message } } }`,
  { i: [{ resource: 'IMAGE', filename, mimeType, httpMethod: 'POST', fileSize: String(bytes.length) }] });
if (!userErrors(staged.stagedUploadsCreate, 'stagedUploadsCreate')) process.exit(1);
const target = staged.stagedUploadsCreate.stagedTargets[0];

// 2. Subir los bytes (los parámetros firmados van antes del archivo)
const form = new FormData();
for (const p of target.parameters) form.append(p.name, p.value);
form.append('file', new Blob([bytes], { type: mimeType }), filename);
const up = await fetch(target.url, { method: 'POST', body: form });
if (!up.ok) { console.error('Subida falló', up.status, await up.text()); process.exit(1); }

// 3. Registrar el archivo en Shopify y esperar a que esté listo
const created = await gql(`mutation($f: [FileCreateInput!]!) { fileCreate(files: $f) { files { id } userErrors { field message } } }`,
  { f: [{ originalSource: target.resourceUrl, contentType: 'IMAGE', alt }] });
if (!userErrors(created.fileCreate, 'fileCreate')) process.exit(1);
const id = created.fileCreate.files[0].id;

for (let i = 0; i < 20; i++) {
  await sleep(1500);
  const { node } = await gql(`query($id: ID!) { node(id: $id) { ... on MediaImage { fileStatus image { url } } } }`, { id });
  if (node?.fileStatus === 'READY' && node.image?.url) {
    const cdnName = decodeURIComponent(new URL(node.image.url).pathname.split('/').pop());
    console.log('id:', id);
    console.log('url:', node.image.url);
    console.log('valor para settings_data:', `shopify://shop_images/${cdnName}`);
    process.exit(0);
  }
  if (node?.fileStatus === 'FAILED') { console.error('Shopify no pudo procesar la imagen'); process.exit(1); }
}
console.error('La imagen no quedó lista a tiempo; revisar en Contenido → Archivos:', id);
process.exit(1);
