// Cliente mínimo Admin GraphQL para scripts de importación (Node 22, sin dependencias).
// Variables: SHOPIFY_SHOP=brenson-co.myshopify.com  SHOPIFY_ADMIN_TOKEN=shpat_...  SHOPIFY_API_VERSION=2025-07
export function envOrDie(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (!v) { console.error(`Falta la variable de entorno ${name}`); process.exit(1); }
  return v;
}

export async function gql(query, variables = {}) {
  const shop = envOrDie('SHOPIFY_SHOP');
  const token = envOrDie('SHOPIFY_ADMIN_TOKEN');
  const version = process.env.SHOPIFY_API_VERSION || '2025-07';
  const res = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error('GraphQL: ' + JSON.stringify(json.errors));
  // Respeta el throttle
  const cost = json.extensions?.cost;
  if (cost && cost.throttleStatus.currentlyAvailable < cost.requestedQueryCost * 2) await sleep(1500);
  return json.data;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function userErrors(obj, ctx) {
  const errs = obj?.userErrors || [];
  if (errs.length) console.warn(`  ⚠ ${ctx}:`, errs.map((e) => `${(e.field || []).join('.')} ${e.message}`).join(' | '));
  return errs.length === 0;
}

export function dryRun() { return process.argv.includes('--dry-run'); }
