// node --test test/  (requiere compilar TS o usar tsx; aquí se prueban las fórmulas puras reimplementadas en JS)
import { test } from 'node:test';
import assert from 'node:assert/strict';

function cuotaMensual(precio, inicialPct, plazo, tasaPct) {
  const P = precio * (1 - inicialPct / 100); const i = tasaPct / 100;
  if (plazo <= 0) return 0; if (i === 0) return Math.round(P / plazo);
  const f = Math.pow(1 + i, plazo); return Math.round((P * i * f) / (f - 1));
}

test('cuota City 1500: 7.990.000, 10 % inicial, 36 meses, 1,9 % mensual ≈ 277.6k', () => {
  const c = cuotaMensual(7990000, 10, 36, 1.9);
  assert.ok(c > 270000 && c < 285000, `cuota fuera de rango: ${c}`);
});

test('cuota con tasa 0 es división simple', () => {
  assert.equal(cuotaMensual(12000000, 0, 12, 0), 1000000);
});

test('descuento por tier sobre subtotal público', () => {
  const items = [{ price: 11290000, qty: 10, pct: 12 }, { price: 6990000, qty: 5, pct: 12 }];
  const sub = items.reduce((a, i) => a + i.price * i.qty, 0);
  const total = items.reduce((a, i) => a + Math.round(i.price * (1 - i.pct / 100)) * i.qty, 0);
  assert.equal(sub, 147850000);
  assert.equal(sub - total, 17742000);
});
