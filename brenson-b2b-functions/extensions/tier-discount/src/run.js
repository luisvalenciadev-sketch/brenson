// @ts-check
/**
 * Shopify Function — Product Discount (cart.lines.discounts.generate.run)
 * Descuento por tier B2B (Módulo 08, decisiones D1/D2/D5).
 *
 * Reglas:
 *  1. Solo aplica si el cliente tiene el tag `cliente-corporativo` y un tier asignado (metafield brenson_b2b.tier).
 *  2. El % del tier viene de la configuración del descuento ($app:brenson.config), porque el input de
 *     Functions no resuelve la referencia al metaobject: el metafield del cliente solo trae su GID.
 *     Forma: {"tiers": {"gid://shopify/Metaobject/1": {"codigo": "tier_2", "pct": 12, "nombre": "…"}}}
 *     La escribe scripts/sync-tier-discount-config.mjs a partir de los metaobjects brenson_tier_b2b.
 *     Un producto puede sobrescribir el % con brenson.b2b_precio_tier (JSON {"tier_1": 8, "tier_2": 12, "tier_3": 18}).
 *  3. Solo líneas de productos con brenson.b2b_disponible = true y cantidad >= brenson.b2b_minimo_unidades (default 1).
 *  4. Esta es la ÚNICA validación real de precio: lo que el tema muestra como "precio corporativo" es display.
 *
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} RunResult
 */

/** @type {RunResult} */
const EMPTY = { operations: [] };

/**
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function run(input) {
  // Si el descuento no se creó con la clase PRODUCT, devolver operaciones de producto es un error.
  if (!(input.discount?.discountClasses || []).includes('PRODUCT')) return EMPTY;
  const customer = input.cart.buyerIdentity?.customer;
  if (!customer) return EMPTY;
  const approved = (customer.hasTags || []).some((t) => t.tag === 'cliente-corporativo' && t.hasTag);
  const tierId = customer.tier?.value;
  if (!approved || !tierId) return EMPTY;
  const tier = input.discount.config?.jsonValue?.tiers?.[tierId];
  if (!tier) return EMPTY;

  const tierCode = tier.codigo || '';
  const tierPct = parseFloat(tier.pct);
  const tierName = tier.nombre || 'Tier corporativo';
  if (!(tierPct > 0)) return EMPTY;

  const candidates = [];
  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== 'ProductVariant') continue;
    const p = line.merchandise.product;
    if (p.b2bDisponible?.value !== 'true') continue;
    const min = parseInt(p.minB2B?.value || '1', 10) || 1;
    if (line.quantity < min) continue;

    let pct = tierPct;
    if (p.tierOverride?.value) {
      try { const o = JSON.parse(p.tierOverride.value); if (o && o[tierCode] != null) pct = parseFloat(o[tierCode]); } catch (_) { /* ignorar JSON inválido */ }
    }
    if (!(pct > 0)) continue;

    candidates.push({
      message: `${tierName} · ${pct} % descuento corporativo`,
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: String(pct) } }
    });
  }

  if (!candidates.length) return EMPTY;
  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: 'ALL',
          candidates
        }
      }
    ]
  };
}
