import type { DraftOrderResult, Env, QuoteItem } from '../types';

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

export async function findCustomerByEmail(env: Env, email: string): Promise<{ id: string; tags: string[]; note: string | null; firstName: string | null; lastName: string | null } | null> {
  const data = await shopifyAdmin<{ customers: { nodes: { id: string; tags: string[]; note: string | null; firstName: string | null; lastName: string | null }[] } }>(env,
    `query($q: String!) { customers(first: 1, query: $q) { nodes { id tags note firstName lastName } } }`, { q: `email:${email}` });
  return data.customers.nodes[0] || null;
}

/**
 * `extra` permite completar el nombre del contacto en la conversión de una cuenta existente: las
 * cuentas nuevas de Shopify no piden nombre al registrarse, así que el cliente llega sin él y el
 * admin mostraría "null null" en la lista de solicitudes. Solo se envía lo que venga definido, para
 * no pisar un nombre que el cliente ya tuviera.
 */
export async function updateCustomerNoteAndTags(env: Env, id: string, note: string, addTags: string[], extra: { firstName?: string; lastName?: string } = {}) {
  await shopifyAdmin(env, `mutation($input: CustomerInput!) { customerUpdate(input: $input) { customer { id } userErrors { message } } }`, { input: { id, note, ...extra } });
  await shopifyAdmin(env, `mutation($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { userErrors { message } } }`, { id, tags: addTags });
}

/**
 * Crea el cliente corporativo por Admin API.
 *
 * Con cuentas NUEVAS de cliente el tema ya no puede usar `form 'create_customer'`, así que la cuenta
 * la crea este worker a partir de la solicitud de acceso. No se envía contraseña: el acceso es por
 * código de un solo uso al correo, y Shopify no acepta contraseñas en cuentas nuevas.
 */
export async function createCustomer(env: Env, input: { email: string; firstName?: string; lastName?: string; phone?: string; note?: string; tags?: string[] }): Promise<string> {
  const data = await shopifyAdmin<{ customerCreate: { customer: { id: string } | null; userErrors: { field: string[] | null; message: string }[] } }>(env,
    `mutation($input: CustomerInput!) { customerCreate(input: $input) { customer { id } userErrors { field message } } }`, { input });
  const { customer, userErrors } = data.customerCreate;
  if (!customer) throw new Error(userErrors.map((e) => e.message).join('; ') || 'customerCreate sin resultado');
  return customer.id;
}

export async function setCustomerMetafield(env: Env, ownerId: string, namespace: string, key: string, value: string, type: string) {
  await setCustomerMetafields(env, ownerId, [{ key, value, type }], namespace);
}

/** Varios metafields del mismo namespace en una sola mutación (metafieldsSet acepta hasta 25). */
export async function setCustomerMetafields(env: Env, ownerId: string, fields: { key: string; value: string; type: string }[], namespace = 'brenson_b2b') {
  const m = fields.filter((f) => f.value !== '' && f.value != null).map((f) => ({ ownerId, namespace, key: f.key, value: f.value, type: f.type }));
  if (!m.length) return;
  const data = await shopifyAdmin<{ metafieldsSet: { userErrors: { field: string[] | null; message: string }[] } }>(env,
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`, { m });
  if (data.metafieldsSet.userErrors.length) console.error('[shopify] metafieldsSet', JSON.stringify(data.metafieldsSet.userErrors));
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

/** Lee una cotización por su handle (numero en minúsculas) para el flujo de aceptación. */
export async function fetchQuoteByHandle(env: Env, handle: string): Promise<{
  id: string;
  estado: string;
  clienteId: string | null;
  items: QuoteItem[];
  total: number;
  creadaEn: string;
  validezDias: number;
  acceptToken: string | null;
  pedidoBorradorId: string | null;
  asesorEmail: string | null;
} | null> {
  const data = await shopifyAdmin<{ metaobjectByHandle: {
    id: string;
    estado: { value: string } | null;
    clienteId: { value: string } | null;
    items: { value: string } | null;
    total: { value: string } | null;
    creadaEn: { value: string } | null;
    validezDias: { value: string } | null;
    acceptToken: { value: string } | null;
    pedidoBorradorId: { value: string } | null;
    asesor: { reference: { fields: { key: string; value: string }[] } | null } | null;
  } | null }>(env,
    `query($handle: MetaobjectHandleInput!) { metaobjectByHandle(handle: $handle) {
      id
      estado: field(key: "estado") { value }
      clienteId: field(key: "cliente_id") { value }
      items: field(key: "items") { value }
      total: field(key: "total") { value }
      creadaEn: field(key: "creada_en") { value }
      validezDias: field(key: "validez_dias") { value }
      acceptToken: field(key: "accept_token") { value }
      pedidoBorradorId: field(key: "pedido_borrador_id") { value }
      asesor: field(key: "asesor") { reference { ... on Metaobject { fields { key value } } } }
    } }`, { handle: { type: 'brenson_cotizacion_b2b', handle } });
  const m = data.metaobjectByHandle;
  if (!m) return null;
  let total = 0;
  try { total = Number(JSON.parse(m.total?.value || '{}').amount || 0); } catch { total = 0; }
  const asesorFields = m.asesor?.reference ? Object.fromEntries(m.asesor.reference.fields.map((f) => [f.key, f.value])) : null;
  return {
    id: m.id,
    estado: m.estado?.value || 'borrador',
    clienteId: m.clienteId?.value || null,
    items: m.items?.value ? JSON.parse(m.items.value) : [],
    total,
    creadaEn: m.creadaEn?.value || new Date().toISOString(),
    validezDias: Number(m.validezDias?.value || 15),
    acceptToken: m.acceptToken?.value || null,
    pedidoBorradorId: m.pedidoBorradorId?.value || null,
    asesorEmail: asesorFields?.email || null
  };
}

/** Actualiza campos puntuales de una cotización ya creada (aceptar, marcar vencida, etc). */
export async function updateQuoteMetaobject(env: Env, id: string, fields: { key: string; value: string }[]): Promise<void> {
  const data = await shopifyAdmin<{ metaobjectUpdate: { userErrors: { field: string[] | null; message: string }[] } }>(env,
    `mutation($id: ID!, $m: MetaobjectUpdateInput!) { metaobjectUpdate(id: $id, metaobject: $m) { userErrors { field message } } }`, { id, m: { fields } });
  if (data.metaobjectUpdate.userErrors.length) throw new Error(data.metaobjectUpdate.userErrors.map((e) => e.message).join('; '));
}

/**
 * Crea el pedido borrador con el precio negociado congelado línea por línea (`originalUnitPrice`):
 * Shopify no debe recalcular contra el precio de catálogo, porque el total del draft order tiene que
 * coincidir centavo a centavo con lo que ya se le facturó al cliente en el PDF de la cotización.
 */
export async function createDraftOrder(env: Env, input: { customerId: string; items: QuoteItem[]; note: string; tags: string[] }): Promise<DraftOrderResult> {
  const lineItems = input.items.map((i) => ({
    variantId: i.variant_id.startsWith('gid://') ? i.variant_id : `gid://shopify/ProductVariant/${i.variant_id}`,
    quantity: i.cantidad,
    originalUnitPrice: String(i.precio_unitario)
  }));
  const data = await shopifyAdmin<{ draftOrderCreate: { draftOrder: { id: string; name: string; invoiceUrl: string | null } | null; userErrors: { field: string[] | null; message: string }[] } }>(env,
    `mutation($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { id name invoiceUrl } userErrors { field message } } }`,
    // Sin `email`: al dar `customerId`, Shopify usa el correo del cliente. No lo tenemos persistido en
    // el metaobject de la cotización (solo viaja en el correo de aviso, no se guarda).
    { input: { customerId: input.customerId, note2: input.note, tags: input.tags, useCustomerDefaultAddress: true, lineItems } });
  const { draftOrder, userErrors } = data.draftOrderCreate;
  if (!draftOrder) throw new Error(userErrors.map((e) => e.message).join('; ') || 'draftOrderCreate sin resultado');
  return draftOrder;
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
