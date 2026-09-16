#!/usr/bin/env node
import { gql, userErrors } from './lib/shopify-admin.mjs';

const COL = {
  bicicletas: 'gid://shopify/Collection/300125585483',
  ciclomotores: 'gid://shopify/Collection/300125618251',
  motocarros: 'gid://shopify/Collection/300125651019',
  cuadriciclos: 'gid://shopify/Collection/285911875659',
};
const PAGE = {
  financiacion: 'gid://shopify/Page/324059725899',
  garantia: 'gid://shopify/Page/324059758667',
  empresas: 'gid://shopify/Page/324059791435',
  contacto: 'gid://shopify/Page/324059889739',
};
const BLOG = 'gid://shopify/Blog/91281227851';

function item(title, type, resourceId) {
  return { title, type, resourceId };
}

const mainMenuItems = [
  item('Inicio', 'FRONTPAGE', null),
  {
    title: 'Vehículos', type: 'HTTP', url: '#',
    items: [
      item('Bicicletas eléctricas', 'COLLECTION', COL.bicicletas),
      item('Ciclomotores', 'COLLECTION', COL.ciclomotores),
      item('Motocarros', 'COLLECTION', COL.motocarros),
      item('Cuadriciclos', 'COLLECTION', COL.cuadriciclos),
    ],
  },
  item('Financiación', 'PAGE', PAGE.financiacion),
  item('Empresas', 'PAGE', PAGE.empresas),
  item('Garantía', 'PAGE', PAGE.garantia),
  item('Blog', 'BLOG', BLOG),
  item('Contacto', 'PAGE', PAGE.contacto),
];

function toInput(items) {
  return items.map((i) => {
    const out = { title: i.title, type: i.type };
    if (i.resourceId) out.resourceId = i.resourceId;
    if (i.url) out.url = i.url;
    if (i.items) out.items = toInput(i.items);
    return out;
  });
}

const existing = (await gql(`{ menus(first: 20) { nodes { id handle } } }`)).menus.nodes;
const byHandle = Object.fromEntries(existing.map((m) => [m.handle, m.id]));

// main-menu: update
{
  const id = byHandle['main-menu'];
  console.log('actualizando main-menu...');
  const data = await gql(
    `mutation($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, items: $items) { menu { id } userErrors { field message } } }`,
    { id, title: 'Menú Principal', items: toInput(mainMenuItems) }
  );
  userErrors(data.menuUpdate, 'main-menu');
}

const footerMenus = {
  'footer-vehiculos': {
    title: 'Footer · Vehículos',
    items: [
      item('Bicicletas eléctricas', 'COLLECTION', COL.bicicletas),
      item('Ciclomotores', 'COLLECTION', COL.ciclomotores),
      item('Motocarros', 'COLLECTION', COL.motocarros),
      item('Cuadriciclos', 'COLLECTION', COL.cuadriciclos),
    ],
  },
  'footer-empresa': {
    title: 'Footer · Empresa',
    items: [
      item('Empresas B2B', 'PAGE', PAGE.empresas),
      item('Garantía', 'PAGE', PAGE.garantia),
      item('Blog', 'BLOG', BLOG),
    ],
  },
  'footer-ayuda': {
    title: 'Footer · Ayuda',
    items: [
      item('Financiación', 'PAGE', PAGE.financiacion),
      item('Contacto', 'PAGE', PAGE.contacto),
    ],
  },
};

for (const [handle, def] of Object.entries(footerMenus)) {
  if (byHandle[handle]) {
    console.log(`actualizando ${handle}...`);
    const data = await gql(
      `mutation($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) { menuUpdate(id: $id, title: $title, items: $items) { menu { id } userErrors { field message } } }`,
      { id: byHandle[handle], title: def.title, items: toInput(def.items) }
    );
    userErrors(data.menuUpdate, handle);
    continue;
  }
  console.log(`creando ${handle}...`);
  const data = await gql(
    `mutation($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) { menuCreate(title: $title, handle: $handle, items: $items) { menu { id handle } userErrors { field message } } }`,
    { title: def.title, handle, items: toInput(def.items) }
  );
  userErrors(data.menuCreate, handle);
}

console.log('\nListo.');
