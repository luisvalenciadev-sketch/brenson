// Crea (o actualiza) las 3 páginas del portal B2B que activan las plantillas
// page.empresas-beneficios / page.empresas-proceso / page.empresas-flotas.
//
// Una plantilla `templates/page.<handle>.json` solo se renderiza si existe una página
// con ese handle y con el template suffix asignado. Este script garantiza ambas cosas.
//
// Uso:
//   node scripts/create-empresas-pages.mjs --dry-run    (no escribe nada, solo informa)
//   node scripts/create-empresas-pages.mjs              (crea/actualiza de verdad)
//
// Variables: SHOPIFY_SHOP, SHOPIFY_ADMIN_TOKEN, SHOPIFY_API_VERSION
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const PAGINAS = [
  {
    handle: 'empresas-beneficios',
    title: 'Beneficios y ROI de flota eléctrica',
    templateSuffix: 'empresas-beneficios',
    body: '<p>Rentabilidad, ahorro operativo e incentivos tributarios para flotas empresariales en Colombia.</p>'
  },
  {
    handle: 'empresas-proceso',
    title: 'Cómo funciona y respaldo B2B',
    templateSuffix: 'empresas-proceso',
    body: '<p>Metodología de electrificación de flota, SLA y soporte técnico de fábrica.</p>'
  },
  {
    handle: 'empresas-flotas',
    title: 'Flotas y catálogo industrial',
    templateSuffix: 'empresas-flotas',
    body: '<p>Gama industrial homologada para reparto intensivo y trabajo pesado.</p>'
  }
];

const Q_BUSCAR = `
  query BuscarPagina($query: String!) {
    pages(first: 1, query: $query) { nodes { id handle title templateSuffix } }
  }`;

const M_CREAR = `
  mutation CrearPagina($page: PageCreateInput!) {
    pageCreate(page: $page) {
      page { id handle templateSuffix }
      userErrors { field message }
    }
  }`;

const M_ACTUALIZAR = `
  mutation ActualizarPagina($id: ID!, $page: PageUpdateInput!) {
    pageUpdate(id: $id, page: $page) {
      page { id handle templateSuffix }
      userErrors { field message }
    }
  }`;

async function main() {
  const seco = dryRun();
  console.log(seco ? '— DRY RUN: no se escribe nada —\n' : '— Aplicando cambios —\n');

  for (const p of PAGINAS) {
    const data = await gql(Q_BUSCAR, { query: `handle:${p.handle}` });
    const existente = data.pages.nodes[0];

    if (existente) {
      if (existente.templateSuffix === p.templateSuffix) {
        console.log(`✓ /pages/${p.handle} ya existe con la plantilla correcta. Sin cambios.`);
        continue;
      }
      console.log(`↻ /pages/${p.handle} existe con plantilla "${existente.templateSuffix ?? '(por defecto)'}" → "${p.templateSuffix}"`);
      if (seco) continue;
      const r = await gql(M_ACTUALIZAR, {
        id: existente.id,
        page: { templateSuffix: p.templateSuffix }
      });
      userErrors(r.pageUpdate, `actualizar ${p.handle}`);
    } else {
      console.log(`+ crear /pages/${p.handle} — "${p.title}" [plantilla: ${p.templateSuffix}]`);
      if (seco) continue;
      const r = await gql(M_CREAR, {
        page: {
          handle: p.handle,
          title: p.title,
          body: p.body,
          templateSuffix: p.templateSuffix,
          isPublished: true
        }
      });
      userErrors(r.pageCreate, `crear ${p.handle}`);
    }
    await sleep(400);
  }

  console.log('\nListo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
