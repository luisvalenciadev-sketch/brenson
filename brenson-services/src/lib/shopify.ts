import type { Env } from '../types';

export async function shopifyAdmin<T = unknown>(env: Env, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (!env.SHOPIFY_ADMIN_TOKEN) throw new Error('SHOPIFY_ADMIN_TOKEN no configurado');
  const res = await fetch(`https://${env.SHOPIFY_SHOP}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_TOKEN },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json() as { data: T; errors?: unknown };
  if (json.errors) { console.error('[shopify] errors', JSON.stringify(json.errors)); throw new Error('Shopify GraphQL error'); }
  return json.data;
}

export async function findCustomerByEmail(env: Env, email: string): Promise<{ id: string; tags: string[]; note: string | null } | null> {
  const data = await shopifyAdmin<{ customers: { nodes: { id: string; tags: string[]; note: string | null }[] } }>(env,
    `query($q: String!) { customers(first: 1, query: $q) { nodes { id tags note } } }`, { q: `email:${email}` });
  return data.customers.nodes[0] || null;
}

export async function updateCustomerNoteAndTags(env: Env, id: string, note: string, addTags: string[]) {
  await shopifyAdmin(env, `mutation($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { message } } }`, { input: { id, note } });
  await shopifyAdmin(env, `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`, { id, tags: addTags });
}

export async function setCustomerMetafield(env: Env, ownerId: string, namespace: string, key: string, value: string, type: string) {
  await shopifyAdmin(env, `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`, { m: [{ ownerId, namespace, key, value, type }] });
}

// Precios y datos reales de variantes para recalcular una cotización (R-A3)
export async function fetchVariants(env: Env, variantIds: string[]): Promise<Record<string, { price: number; title: string; productTitle: string; handle: string; sku: string; tierOverride: Record<string, number> | null; minB2B: number }>> {
  const ids = variantIds.map((v) => (v.startsWith('gid://') ? v : `gid://shopify/ProductVariant/${v}`));
  const data = await shopifyAdmin<{ nodes: ({ id: string; price: string; title: string; sku: string | null; product: { title: string; handle: string; tier: { value: string } | null; min: { value: string } | null } } | null)[] }>(env,
    `query($ids: [ID!]!) { nodes(ids: $ids) { ... on ProductVariant { id price title sku product { title handle tier: metafield(namespace: "brenson", key: "b2b_precio_tier") { value } min: metafield(namespace: "brenson", key: "b2b_minimo_unidades") { value } } } } }`, { ids });
  const out: Record<string, any> = {};
  for (const n of data.nodes) {
    if (!n) continue;
    const numeric = n.id.split('/').pop()!;
    out[numeric] = { price: Math.round(parseFloat(n.price)), title: n.title, productTitle: n.product.title, handle: n.product.handle, sku: n.sku || '', tierOverride: n.product.tier ? JSON.parse(n.product.tier.value) : null, minB2B: n.product.min ? parseInt(n.product.min.value, 10) : 1 };
  }
  return out;
}

export async function fetchCustomerTier(env: Env, customerId: string): Promise<{ codigo: string; descuento: number; nombre: string } | null> {
  const data = await shopifyAdmin<{ customer: { tags: string[]; tier: { reference: { fields: { key: string; value: string }[] } | null } | null } | null }>(env,
    `query($id: ID!) { customer(id: $id) { tags tier: metafield(namespace: "brenson_b2b", key: "tier") { reference { ... on Metaobject { fields { key value } } } } } }`, { id: `gid://shopify/Customer/${customerId}` });
  const c = data.customer;
  if (!c || !c.tags.includes('cliente-corporativo') || !c.tier?.reference) return null;
  const f = Object.fromEntries(c.tier.reference.fields.map((x) => [x.key, x.value]));
  return { codigo: f.codigo, descuento: parseFloat(f.descuento_pct || '0'), nombre: f.nombre };
}

export async function verifyShopifyHmac(rawBody: string, hmacHeader: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return timingSafeEqual(b64, hmacHeader);
}
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
