#!/usr/bin/env node
// Marca TODOS los productos como agotados: inventoryPolicy DENY + existencias en 0.
// Guarda un respaldo del estado previo (policy, tracked, cantidades) para poder revertir.
// Uso: node scripts/mark-all-sold-out.mjs --dry-run   (solo reporta)
//      node scripts/mark-all-sold-out.mjs --backup=<ruta.json>
// Requiere scopes: read/write_products, read/write_inventory, read_locations.
import { writeFileSync } from 'node:fs';
import { gql, userErrors, sleep, dryRun } from './lib/shopify-admin.mjs';

const DRY = dryRun();
const backupArg = process.argv.find((a) => a.startsWith('--backup='));
const backupPath = backupArg ? backupArg.slice('--backup='.length) : `sold-out-backup-${Date.now()}.json`;

const products = [];
let after = null;
do {
  const page = (await gql(
    `query($after: String) { products(first: 10, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes { id handle status variants(first: 25) { nodes {
        id title inventoryPolicy inventoryQuantity
        inventoryItem { id tracked inventoryLevels(first: 5) { nodes {
          location { id name } quantities(names: ["available", "on_hand"]) { name quantity }
        } } }
      } } }
    } }`,
    { after }
  )).products;
  products.push(...page.nodes);
  after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
} while (after);

console.log(`${products.length} productos encontrados.\n`);
if (!DRY) { writeFileSync(backupPath, JSON.stringify(products, null, 2)); console.log(`Respaldo: ${backupPath}\n`); }

for (const p of products) {
  const variants = p.variants.nodes;
  const toUpdate = variants.filter((v) => v.inventoryPolicy !== 'DENY' || !v.inventoryItem.tracked);
  const levels = variants.flatMap((v) => v.inventoryItem.inventoryLevels.nodes
    .filter((l) => (l.quantities.find((q) => q.name === 'on_hand')?.quantity ?? 0) !== 0)
    .map((l) => ({ inventoryItemId: v.inventoryItem.id, locationId: l.location.id, quantity: 0 })));

  const tag = `${p.handle} [${p.status}]`;
  if (!toUpdate.length && !levels.length) { console.log('= ya agotado', tag); continue; }
  console.log(`+ ${tag}: ${toUpdate.length}/${variants.length} variantes → DENY+tracked, ${levels.length} niveles → 0`);
  for (const v of variants) console.log(`    ${v.title}: policy=${v.inventoryPolicy} tracked=${v.inventoryItem.tracked} qty=${v.inventoryQuantity}`);
  if (DRY) continue;

  if (toUpdate.length) {
    const data = await gql(
      `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) { productVariantsBulkUpdate(productId: $productId, variants: $variants) { userErrors { field message } } }`,
      { productId: p.id, variants: toUpdate.map((v) => ({ id: v.id, inventoryPolicy: 'DENY', inventoryItem: { tracked: true } })) }
    );
    userErrors(data.productVariantsBulkUpdate, `${p.handle} policy`);
  }
  if (levels.length) {
    const data = await gql(
      `mutation($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }`,
      { input: { name: 'on_hand', reason: 'correction', ignoreCompareQuantity: true, quantities: levels } }
    );
    userErrors(data.inventorySetQuantities, `${p.handle} cantidades`);
  }
  await sleep(300);
}
console.log(DRY ? '\n(dry-run: no se cambió nada)' : '\nListo.');
