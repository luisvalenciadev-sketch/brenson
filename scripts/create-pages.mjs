#!/usr/bin/env node
import { gql, userErrors } from './lib/shopify-admin.mjs';

const pages = [
  { handle: 'financiacion', title: 'Financiación', suffix: 'financiacion', body: '<p>Simula tu cuota y conoce nuestros aliados financieros.</p>' },
  { handle: 'garantia', title: 'Garantía', suffix: 'garantia', body: '<p>Conoce los términos de garantía Brenson.</p>' },
  { handle: 'empresas', title: 'Brenson Empresas', suffix: 'empresas', body: '<p>Soluciones de movilidad eléctrica para flotas corporativas.</p>' },
  { handle: 'empresas-acceso', title: 'Acceso corporativo', suffix: 'empresas-acceso', body: '<p>Solicita acceso al portal de empresas.</p>' },
  { handle: 'cotizador', title: 'Cotizador de flota', suffix: 'cotizador', body: '<p>Cotiza tu flota eléctrica.</p>' },
  { handle: 'contacto', title: 'Contacto', suffix: 'contacto', body: '<p>Escríbenos y te ayudamos a elegir tu vehículo eléctrico.</p>' },
];

const existing = (await gql(`{ pages(first: 50) { nodes { handle id } } }`)).pages.nodes;
const byHandle = Object.fromEntries(existing.map((p) => [p.handle, p.id]));

for (const p of pages) {
  if (byHandle[p.handle]) {
    console.log(`= page ${p.handle} ya existe, actualizando templateSuffix`);
    const data = await gql(
      `mutation($id: ID!, $page: PageUpdateInput!) { pageUpdate(id: $id, page: $page) { page { id } userErrors { field message } } }`,
      { id: byHandle[p.handle], page: { templateSuffix: p.suffix } }
    );
    userErrors(data.pageUpdate, p.handle);
    continue;
  }
  console.log(`+ page ${p.handle}`);
  const data = await gql(
    `mutation($page: PageCreateInput!) { pageCreate(page: $page) { page { id handle } userErrors { field message } } }`,
    { page: { title: p.title, handle: p.handle, body: p.body, templateSuffix: p.suffix, isPublished: true } }
  );
  userErrors(data.pageCreate, p.handle);
}
console.log('\nListo.');
