#!/usr/bin/env node
// Sube los videos de testimonios/casos de éxito y crea las entradas de metaobject
// brenson_caso_uso con el campo "video". Ver docs/PROMPT_CONTINUACION_17SEP_PARTE4.md, tarea 3.
//
// Los 3 videos de testimonios/ no traen nombre de cliente identificable en el material
// entregado (solo describen la escena) — no se inventa nombre ni empresa. Los de
// CASOS DE EXITO/ usan el pie de foto real de Brenson, tomado del nombre de archivo
// (truncado por el sistema de archivos en algunos casos).
//
// Uso: SHOPIFY_SHOP=brenson-0.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/import-video-testimonials.mjs [--dry-run]
import { gql, sleep, dryRun } from './lib/shopify-admin.mjs';
import { readFileSync, statSync } from 'node:fs';

const TESTIMONIOS = new URL('../.tmp_extract/DOC PAGINA WEB/testimonios/', import.meta.url);
const CASOS = new URL('../.tmp_extract/DOC PAGINA WEB/CASOS DE EXITO/', import.meta.url);
const DRY = dryRun();

const ENTRIES = [
  // testimonios/ — sin nombre ni empresa identificable en el material recibido.
  { base: TESTIMONIOS, file: 'Furgon panaderia.mp4', titulo: 'Furgón de reparto eléctrico en panadería' },
  { base: TESTIMONIOS, file: 'perruqueria.mp4', titulo: 'Peluquería canina a domicilio' },
  { base: TESTIMONIOS, file: 'silla de ruedas.mp4', titulo: 'Movilidad accesible con silla de ruedas' },

  // CASOS DE EXITO/ — pie de foto real de Brenson (nombre de archivo), truncado donde el
  // sistema de archivos cortó el nombre.
  { base: CASOS, file: 'Gracias a nuestros clientes por compartir sus opiniones y testimonios con nosotros ✨🥰.mp4',
    titulo: 'Gracias a nuestros clientes', resumen: 'Gracias a nuestros clientes por compartir sus opiniones y testimonios con nosotros ✨🥰' },
  { base: CASOS, file: 'Hoy conocimos una historia que nos motiva cada día a seguir apostando por un futuro más limpio, .mp4',
    titulo: 'Una historia que nos motiva', resumen: 'Hoy conocimos una historia que nos motiva cada día a seguir apostando por un futuro más limpio…' },
  { base: CASOS, file: 'Hoy queremos compartirles una historia de vida, donde brenson ha sido parte de ella🥺 nos sentim.mp4',
    titulo: 'Una historia de vida', resumen: 'Hoy queremos compartirles una historia de vida, donde Brenson ha sido parte de ella 🥺 nos sentimos…' },
  { base: CASOS, file: 'VIDEO PERRUQUERIA .mp4', titulo: 'Peluquería aliada de Brenson' },
  { base: CASOS, file: 'WhatsApp Video 2025-04-29 at 8.44.18 AM.mp4', titulo: 'Cliente Brenson en operación' },
  { base: CASOS, file: '¡Una abuelita sobre ruedas!😍 Nuestra mobility un vehículo seguro, estable y cómodo✨.mp4',
    titulo: 'Una abuelita sobre ruedas', resumen: '¡Una abuelita sobre ruedas!😍 Nuestra mobility, un vehículo seguro, estable y cómodo✨',
    vehiculos: ['gid://shopify/Product/7400627273803'] }, // Ciclomotor Eléctrico Brenson Mobility
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
    files { id fileStatus ... on Video { id fileStatus } }
    userErrors { field message }
  }
}`;

const NODE_STATUS = `
query($id: ID!) { node(id: $id) { ... on Video { id fileStatus } } }`;

const METAOBJECT_CREATE = `
mutation($input: MetaobjectCreateInput!) {
  metaobjectCreate(metaobject: $input) {
    metaobject { id handle }
    userErrors { field message code }
  }
}`;

async function uploadVideo(base, filename) {
  const fileUrl = new URL(filename, base);
  const filePath = decodeURIComponent(fileUrl.pathname.slice(1)).replace(/\//g, '\\');
  const size = statSync(filePath).size;

  const staged = await gql(STAGED_UPLOADS_CREATE, {
    input: [{ filename, mimeType: 'video/mp4', httpMethod: 'POST', resource: 'VIDEO', fileSize: String(size) }],
  });
  const errs = staged.stagedUploadsCreate.userErrors;
  if (errs?.length) throw new Error(`stagedUploadsCreate: ${JSON.stringify(errs)}`);
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  const buffer = readFileSync(filePath);
  form.append('file', new Blob([buffer], { type: 'video/mp4' }), filename);

  const uploadRes = await fetch(target.url, { method: 'POST', body: form });
  if (!uploadRes.ok) throw new Error(`upload HTTP ${uploadRes.status}`);

  const created = await gql(FILE_CREATE, { files: [{ originalSource: target.resourceUrl, contentType: 'VIDEO' }] });
  if (created.fileCreate.userErrors?.length) throw new Error(`fileCreate: ${JSON.stringify(created.fileCreate.userErrors)}`);
  const fileId = created.fileCreate.files[0].id;

  // Espera a que Shopify termine de procesar el video (fileStatus READY).
  for (let i = 0; i < 20; i++) {
    const { node } = await gql(NODE_STATUS, { id: fileId });
    if (node?.fileStatus === 'READY') return fileId;
    if (node?.fileStatus === 'FAILED') throw new Error(`fileStatus FAILED para ${filename}`);
    await sleep(3000);
  }
  console.warn(`  ⚠ ${filename}: no llegó a READY tras 60s, se usa el id igual (puede tardar más en propagarse)`);
  return fileId;
}

for (const entry of ENTRIES) {
  console.log(`\n=== ${entry.file} ===`);
  if (DRY) {
    console.log(`  [dry-run] subiría video y crearía brenson_caso_uso: "${entry.titulo}"`);
    continue;
  }
  try {
    const fileId = await uploadVideo(entry.base, entry.file);
    console.log(`  video subido -> ${fileId}`);

    const fields = [
      { key: 'titulo', value: entry.titulo },
      { key: 'video', value: fileId },
      { key: 'verificado', value: 'true' },
    ];
    if (entry.resumen) fields.push({ key: 'resumen', value: entry.resumen });
    if (entry.vehiculos) fields.push({ key: 'vehiculos', value: JSON.stringify(entry.vehiculos) });

    const data = await gql(METAOBJECT_CREATE, { input: { type: 'brenson_caso_uso', fields } });
    if (data.metaobjectCreate.userErrors?.length) {
      console.log(`  ! metaobjectCreate:`, JSON.stringify(data.metaobjectCreate.userErrors));
    } else {
      console.log(`  + metaobject creado -> ${data.metaobjectCreate.metaobject.id}`);
    }
  } catch (e) {
    console.log(`  ! error: ${e.message}`);
  }
  await sleep(500);
}
console.log('\nListo.');
