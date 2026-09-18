// Compara las fotos ya subidas en Shopify vs las carpetas locales de los 12 vehículos legacy.
// Uso: SHOPIFY_SHOP=brenson-0.myshopify.com SHOPIFY_ADMIN_TOKEN=shpat_xxx node scripts/diff-legacy-media.mjs
import { gql } from './lib/shopify-admin.mjs';
import { readdirSync } from 'node:fs';

const BASE = new URL('../.tmp_extract/DOC PAGINA WEB/Fotografías de productos en alta resolución./', import.meta.url);

const products = [
  { name: 'Corato', folder: 'corato', id: '7431772307531', excluded: [] },
  { name: 'Dakota', folder: 'dakota', id: '7400617279563', excluded: ['Dakota Pro (1)_page-0001.jpg'] },
  { name: 'Dallas', folder: 'dallas', id: '7395042918475', excluded: [] },
  { name: 'Furgón', folder: 'furgon', id: '7400626159691', excluded: ['ficha tecnica.png'] },
  { name: 'Maxi', folder: 'maxi', id: '7400626618443', excluded: [] },
  { name: 'Milán', folder: 'milan', id: '7613873258571', excluded: ['Captura de pantalla 2026-03-12 082613.png'] },
  { name: 'Mobility', folder: 'mobility', id: '7400627273803', excluded: ['ficha tecnica sencilla.png'] },
  { name: 'Monaco', folder: 'monaco', id: '7431770112075', excluded: [] },
  { name: 'Platón', folder: 'platon', id: '7400566685771', excluded: ['Carry Platón_page-0001 (1).jpg'] },
  { name: 'Vera', folder: 'vera', id: '7549564420171', excluded: ['Captura de pantalla 2026-02-25 084502.png'] },
  { name: 'Verona', folder: 'verona', id: '7400026669131', excluded: [] },
  { name: 'Zero', folder: 'zero', id: '7468152455243', excluded: [] },
];

function norm(filename) {
  return filename
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[\s_\-().]/g, '')
    .replace(/copia$/, '');
}

const query = `
query($id: ID!) {
  product(id: $id) {
    media(first: 30) {
      nodes { ... on MediaImage { image { url } } }
    }
  }
}`;

for (const p of products) {
  const gid = `gid://shopify/Product/${p.id}`;
  const data = await gql(query, { id: gid });
  const uploaded = (data.product?.media?.nodes || [])
    .map(m => m.image?.url)
    .filter(Boolean)
    .map(url => decodeURIComponent(url.split('/').pop().split('?')[0]));
  const uploadedNorm = uploaded.map(norm);

  const localFiles = readdirSync(new URL(`${p.folder}/`, BASE)).filter(f => !p.excluded.includes(f));

  const missing = [];
  for (const f of localFiles) {
    const n = norm(f);
    const found = uploadedNorm.some(u => u === n || u.includes(n) || n.includes(u));
    if (!found) missing.push(f);
  }

  console.log(`\n=== ${p.name} === (${uploaded.length} subidas, ${localFiles.length} locales válidas, ${missing.length} posiblemente faltantes)`);
  for (const m of missing) console.log(`  FALTA: ${m}`);
}
