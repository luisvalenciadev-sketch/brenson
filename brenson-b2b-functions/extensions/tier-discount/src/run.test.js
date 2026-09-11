import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from './run.js';

const tier2 = { codigo: { value: 'tier_2' }, descuento: { value: '12' }, minimo: { value: '20' }, nombre: { value: 'Flota Crecimiento' } };
const line = (id, qty, over = {}) => ({ id, quantity: qty, merchandise: { __typename: 'ProductVariant', id: `gid://shopify/ProductVariant/${id}`, product: { id: `gid://shopify/Product/${id}`, b2bDisponible: { value: 'true' }, minB2B: { value: '5' }, tierOverride: null, ...over } } });
const cart = (customer, lines) => ({ cart: { buyerIdentity: { customer }, lines } });

test('sin cliente → sin descuento', () => {
  assert.deepEqual(run(cart(null, [line('1', 10)])), { operations: [] });
});

test('cliente sin tag corporativo → sin descuento', () => {
  const c = { id: 'gid://shopify/Customer/1', hasTags: [{ tag: 'cliente-corporativo', hasTag: false }], tier: { reference: tier2 } };
  assert.deepEqual(run(cart(c, [line('1', 10)])), { operations: [] });
});

test('cliente aprobado con tier 2 → 12 % en líneas que cumplen el mínimo', () => {
  const c = { id: 'gid://shopify/Customer/1', hasTags: [{ tag: 'cliente-corporativo', hasTag: true }], tier: { reference: tier2 } };
  const r = run(cart(c, [line('1', 10), line('2', 3)]));
  const cands = r.operations[0].productDiscountsAdd.candidates;
  assert.equal(cands.length, 1);
  assert.equal(cands[0].targets[0].cartLine.id, '1');
  assert.equal(cands[0].value.percentage.value, '12');
});

test('override por producto tiene prioridad sobre el tier', () => {
  const c = { id: 'gid://shopify/Customer/1', hasTags: [{ tag: 'cliente-corporativo', hasTag: true }], tier: { reference: tier2 } };
  const r = run(cart(c, [line('1', 10, { tierOverride: { value: JSON.stringify({ tier_2: 15 }) } })]));
  assert.equal(r.operations[0].productDiscountsAdd.candidates[0].value.percentage.value, '15');
});

test('producto no disponible para B2B se ignora', () => {
  const c = { id: 'gid://shopify/Customer/1', hasTags: [{ tag: 'cliente-corporativo', hasTag: true }], tier: { reference: tier2 } };
  assert.deepEqual(run(cart(c, [line('1', 10, { b2bDisponible: { value: 'false' } })])), { operations: [] });
});
