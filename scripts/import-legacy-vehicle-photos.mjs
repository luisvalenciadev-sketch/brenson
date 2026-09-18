#!/usr/bin/env node
// Sube las fotos locales faltantes de los 12 vehículos legacy (ver docs/PROMPT_CONTINUACION_17SEP_PARTE3.md).
// Uso: SHOPIFY_SHOP=brenson-0.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/import-legacy-vehicle-photos.mjs [--dry-run]
import { gql, sleep, dryRun } from './lib/shopify-admin.mjs';
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const BASE = new URL('../.tmp_extract/DOC PAGINA WEB/Fotografías de productos en alta resolución./', import.meta.url);
const DRY = dryRun();

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
function mimeFor(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

// Solo los archivos confirmados como faltantes por scripts/diff-legacy-media.mjs (salida del 17-sep).
const products = [
  { name: 'Corato', folder: 'corato', id: 'gid://shopify/Product/7431772307531', files: [
    'baul.png', 'interior atras.png', 'Interior.png', 'lateral.png', 'vidrios.png',
  ]},
  { name: 'Dakota', folder: 'dakota', id: 'gid://shopify/Product/7400617279563', files: [
    'farola.png', 'frontal.png', 'llanta.png', 'tablero (1).png',
  ]},
  { name: 'Dallas', folder: 'dallas', id: 'gid://shopify/Product/7395042918475', files: [
    'Dallas (3) (1).png', 'Farola-Dallas.png', 'LlavesNegra.png', 'StopNegra.png',
    'Tablero-Negro.png', 'Trasera-Dallas.png', 'TraseraDiag-Dallas.png', 'TraseraDiag.png',
  ]},
  { name: 'Furgón', folder: 'furgon', id: 'gid://shopify/Product/7400626159691', files: [
    'Baúl.png', 'cargando.jpg', 'Frontal Diag.png', 'Lateral 2.png', 'Lateral.png',
    'MandosDer.png', 'Palancas.png', 'Puertas.png', 'Tablero.png', 'Trasera Diag.png',
  ]},
  { name: 'Maxi', folder: 'maxi', id: 'gid://shopify/Product/7400626618443', files: [
    'Tablero.png',
  ]},
  { name: 'Milán', folder: 'milan', id: 'gid://shopify/Product/7613873258571', files: [
    'Comandos.png', 'Direccional-MilánRoja.png', 'lateral blanca.jpeg', 'Lateral-MilánVerde.png',
    'Llaves.png', 'Posapies-MilánRoja.png', 'Posapiés-MilánVerde.png', 'superior blanca.jpeg',
    'Trasera-MilánVerde.png',
  ]},
  { name: 'Mobility', folder: 'mobility', id: 'gid://shopify/Product/7400627273803', files: [
    'M-Comando1.png', 'M-Diag Roja.png', 'M-Tablero.png', 'M-Trasera Roja.png',
    'MOBILITY neutral gray (2).jpg', 'MOBILITY neutral gray (3).jpg',
    'MOBILITY t-blue (5).jpg', 'MOBILITY t-blue (6).jpg',
  ]},
  { name: 'Monaco', folder: 'monaco', id: 'gid://shopify/Product/7431770112075', files: [
    'bajo.png', 'IMG_6269.JPG', 'interior1.png', 'lateral.png', 'techo.png',
  ]},
  { name: 'Platón', folder: 'platon', id: 'gid://shopify/Product/7400566685771', files: [] },
  { name: 'Vera', folder: 'vera', id: 'gid://shopify/Product/7549564420171', files: [
    'COMANDO DER.png', 'COMANDO IZQ.png', 'STOP.png', 'TRASERA.png', 'VeraPromo.png',
  ]},
  { name: 'Verona', folder: 'verona', id: 'gid://shopify/Product/7400026669131', files: [
    'Baúl (1).png', 'Frenos.png', 'Lateral.png', 'Llaves.png', 'Tablero.png', 'Verona (2).png',
  ]},
  { name: 'Zero', folder: 'zero', id: 'gid://shopify/Product/7468152455243', files: [
    'Diag Trasera.png', 'Farola.png', 'Lateral.png', 'Palancas.png', 'Tablero 2.png',
    'Trasera.png', 'Volante.png', 'WhatsApp Image 2025-10-03 at 12.18.17 PM.jpeg',
  ]},
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

async function uploadOne(product, filename) {
  const fileUrl = new URL(`${product.folder}/${encodeURIComponent(filename)}`, BASE);
  const filePath = decodeURIComponent(fileUrl.pathname.slice(1)).replace(/\//g, '\\');
  const size = statSync(filePath).size;
  const mimeType = mimeFor(filename);

  if (DRY) {
    console.log(`  [dry-run] subiría ${filename} (${size} bytes, ${mimeType})`);
    return;
  }

  const staged = await gql(STAGED_UPLOADS_CREATE, {
    input: [{ filename, mimeType, httpMethod: 'POST', resource: 'IMAGE', fileSize: String(size) }],
  });
  const errs = staged.stagedUploadsCreate.userErrors;
  if (errs?.length) { console.log(`  ! stagedUploadsCreate ${filename}:`, JSON.stringify(errs)); return; }
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  const buffer = readFileSync(filePath);
  form.append('file', new Blob([buffer], { type: mimeType }), filename);

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok) { console.log(`  ! upload HTTP ${uploadRes.status} para ${filename}`); return; }

  const created = await gql(PRODUCT_CREATE_MEDIA, {
    productId: product.id,
    media: [{ originalSource: target.resourceUrl, mediaContentType: 'IMAGE' }],
  });
  const mediaErrs = created.productCreateMedia.mediaUserErrors;
  if (mediaErrs?.length) console.log(`  ! productCreateMedia ${filename}:`, JSON.stringify(mediaErrs));
  else console.log(`  + ${filename} -> ${created.productCreateMedia.media[0].id}`);
}

for (const product of products) {
  if (!product.files.length) { console.log(`\n=== ${product.name}: nada pendiente ===`); continue; }
  console.log(`\n=== ${product.name} (${product.files.length} fotos) ===`);
  for (const filename of product.files) {
    await uploadOne(product, filename);
    await sleep(500);
  }
}
console.log('\nListo.');
