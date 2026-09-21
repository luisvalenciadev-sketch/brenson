#!/usr/bin/env node
/**
 * Crea (si no existe) el descuento automático "Descuento corporativo por tier" que usa la Function
 * brenson-tier-discount, y sincroniza su configuración con los metaobjects brenson_tier_b2b.
 *
 * Por qué hace falta: el input de Shopify Functions no resuelve referencias a metaobjects. El cliente
 * trae en brenson_b2b.tier solo el GID del tier; el % sale de este mapa, guardado en el metafield
 * $app:brenson.config del propio descuento:
 *   {"tiers": {"gid://shopify/Metaobject/1": {"codigo": "tier_1", "pct": 8, "nombre": "…"}}}
 *
 * **Correrlo cada vez que se cambie un % o se cree/borre un tier en el Admin**; si no, el checkout
 * sigue aplicando el % anterior (el tema y las cotizaciones leen el metaobject directo).
 *
 * El token debe ser de la app "Brenson Admin Scripts" (la dueña de la Function): el namespace $app:
 * se resuelve contra la app que hace la llamada.
 *
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/sync-tier-discount-config.mjs [--dry-run]
 */
import { gql, userErrors, dryRun } from './lib/shopify-admin.mjs';

const TITLE = 'Descuento corporativo por tier';
const FUNCTION_HANDLE = 'brenson-tier-discount';

const { metaobjects } = await gql(`{ metaobjects(type: "brenson_tier_b2b", first: 50) { nodes { id fields { key value } } } }`);
const tiers = {};
for (const m of metaobjects.nodes) {
  const f = Object.fromEntries(m.fields.map((x) => [x.key, x.value]));
  const pct = parseFloat(f.descuento_pct);
  if (!(pct > 0)) { console.warn(`  ⚠ ${m.id} (${f.codigo || 'sin código'}) sin descuento_pct válido — se omite`); continue; }
  tiers[m.id] = { codigo: f.codigo || '', pct, nombre: f.nombre || '' };
}
const config = { tiers };
console.log(`Tiers a sincronizar (${Object.keys(tiers).length}):`);
for (const [id, t] of Object.entries(tiers)) console.log(`  ${t.codigo.padEnd(8)} ${String(t.pct).padStart(5)} %  ${t.nombre}  (${id})`);
if (!Object.keys(tiers).length) { console.error('✗ No hay tiers con descuento: no se crea un descuento vacío.'); process.exit(1); }

const { shopifyFunctions } = await gql(`{ shopifyFunctions(first: 25) { nodes { id title apiType app { title } } } }`);
const fn = shopifyFunctions.nodes.find((n) => n.title?.includes('tier') || n.title?.includes(FUNCTION_HANDLE));
if (!fn) { console.error('✗ La Function no aparece en la tienda. ¿Se desplegó la app (shopify app deploy)?', shopifyFunctions.nodes); process.exit(1); }
console.log(`Function: ${fn.title} (${fn.id}, ${fn.apiType})`);

const { automaticDiscountNodes } = await gql(`{ automaticDiscountNodes(first: 50) { nodes { id automaticDiscount { __typename ... on DiscountAutomaticApp { title status appDiscountType { functionId } } } } } }`);
const existing = automaticDiscountNodes.nodes.find((n) => n.automaticDiscount.__typename === 'DiscountAutomaticApp' && n.automaticDiscount.appDiscountType?.functionId === fn.id.split('/').pop());
if (dryRun()) { console.log(`(dry-run) ${existing ? `actualizaría ${existing.id}` : 'crearía el descuento'}`); process.exit(0); }

const metafield = { namespace: '$app:brenson', key: 'config', type: 'json', value: JSON.stringify(config) };
if (existing) {
  const data = await gql(`mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { metafields { id } userErrors { field message } } }`,
    { m: [{ ownerId: existing.id, ...metafield }] });
  if (userErrors(data.metafieldsSet, 'config')) console.log(`= ${existing.id} (${existing.automaticDiscount.status}) → configuración actualizada`);
} else {
  const data = await gql(`mutation($d: DiscountAutomaticAppInput!) { discountAutomaticAppCreate(automaticAppDiscount: $d) { automaticAppDiscount { discountId status } userErrors { field message } } }`, {
    d: {
      title: TITLE,
      functionId: fn.id.split('/').pop(),
      startsAt: new Date().toISOString(),
      discountClasses: ['PRODUCT'],
      // Una empresa con precio corporativo no debería sumar además un cupón de temporada.
      combinesWith: { productDiscounts: false, orderDiscounts: false, shippingDiscounts: true },
      metafields: [metafield]
    }
  });
  if (userErrors(data.discountAutomaticAppCreate, 'crear descuento')) {
    const d = data.discountAutomaticAppCreate.automaticAppDiscount;
    console.log(`+ Descuento creado: ${d.discountId} (${d.status})`);
  }
}
