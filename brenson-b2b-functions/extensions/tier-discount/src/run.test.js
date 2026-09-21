import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './run.js';

const TIER2 = 'gid://shopify/Metaobject/2';
const config = { tiers: { [TIER2]: { codigo: 'tier_2', pct: 12, nombre: 'Flota Crecimiento' } } };
const discount = (over = {}) => ({ discountClasses: ['PRODUCT'], config: { jsonValue: config }, ...over });
const line = (id, qty, over = {}) => ({ id, quantity: qty, merchandise: { __typename: 'ProductVariant', id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, b2bDisponible: { value: 'true' }, minB2B: { value: '5' }, tierOverride: null, ...over } } });
const input = (customer, lines, d = discount()) => ({ discount: d, cart: { buyerIdentity: { customer }, lines } });
const aprobado = (tier = TIER2) => ({ id: 'gid://shopify/Customer/1', hasTags: [{ tag: 'cliente-corporativo', hasTag: true }], tier: { value: tier } });

test('sin cliente → sin descuento', () => {
  assert.deepEqual(run(input(null, [line('1', 10)])), { operations: [] });
});

test('cliente sin tag corporativo → sin descuento', () => {
  const c = { ...aprobado(), hasTags: [{ tag: 'cliente-corporativo', hasTag: false }] };
  assert.deepEqual(run(input(c, [line('1', 10)])), { operations: [] });
});

test('cliente aprobado con tier 2 → 12 % en líneas que cumplen el mínimo', () => {
  const r = run(input(aprobado(), [line('1', 10), line('2', 3)]));
  const cands = r.operations[0].productDiscountsAdd.candidates;
  assert.equal(cands.length, 1);
  assert.equal(cands[0].targets[0].cartLine.id, '1');
  assert.equal(cands[0].value.percentage.value, '12');
});

test('override por producto tiene prioridad sobre el tier', () => {
  const r = run(input(aprobado(), [line('1', 10, { tierOverride: { value: JSON.stringify({ tier_2: 15 }) } })]));
  assert.equal(r.operations[0].productDiscountsAdd.candidates[0].value.percentage.value, '15');
});

test('producto no disponible para B2B se ignora', () => {
  assert.deepEqual(run(input(aprobado(), [line('1', 10, { b2bDisponible: { value: 'false' } })])), { operations: [] });
});

test('tier que no está en la configuración (sin sincronizar) → sin descuento', () => {
  assert.deepEqual(run(input(aprobado('gid://shopify/Metaobject/999'), [line('1', 10)])), { operations: [] });
});

test('descuento sin configuración → sin descuento, sin error', () => {
  assert.deepEqual(run(input(aprobado(), [line('1', 10)], discount({ config: null }))), { operations: [] });
});

test('descuento sin clase PRODUCT → sin operaciones de producto', () => {
  assert.deepEqual(run(input(aprobado(), [line('1', 10)], discount({ discountClasses: ['ORDER'] }))), { operations: [] });
});
