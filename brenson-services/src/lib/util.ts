import type { Context } from 'hono';
import type { Env, Lead } from '../types';

export function jsonError(c: Context, status: number, message: string) {
  return c.json({ ok: false, error: message }, status as 400);
}

// Rate limit simple por clave en KV (ventana fija). Suficiente para formularios.
export async function rateLimit(env: Env, key: string, max: number, windowSec: number) {
  if (!env.KV) return true;
  const k = `rl:${key}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const cur = Number((await env.KV.get(k)) || 0) + 1;
  await env.KV.put(k, String(cur), { expirationTtl: windowSec });
  return cur <= max;
}

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string) {
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip }) });
  const j = await res.json() as { success: boolean };
  return !!j.success;
}

// Scoring de leads (decisión J3): +10 ficha, +20 simulador, +30 cotización/prueba, +40 acceso B2B, +50 PDF flota.
export function scoreFor(l: Lead): number {
  let s = 10;
  if (l.simulacion) s += 20;
  if (l.tipo === 'cotizacion' || l.tipo === 'financiamiento' || (l.prueba_modalidad && l.prueba_modalidad !== 'no')) s += 30;
  if (l.tipo === 'b2b_solicitud' || l.tipo === 'b2b_aprobado') s += 40;
  if (l.tipo === 'b2b_cotizacion') s += 50;
  return s;
}
