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

/* ---------- Enlaces firmados (PDF de cotizaciones y documentos B2B) ---------- */
async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function signingSecret(env: Env) { return env.QUOTE_SIGNING_SECRET || 'dev-only-secret-change-me'; }

/** Devuelve `?exp=…&sig=…` para el recurso `path` (ej. "/quotes/COT-2026-0001"), válido `ttlSeconds`. */
export async function signPath(env: Env, path: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await hmacHex(signingSecret(env), `${path}|${exp}`);
  return `${path}?exp=${exp}&sig=${sig}`;
}

export async function verifySignedPath(env: Env, path: string, exp: string | undefined, sig: string | undefined) {
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmacHex(signingSecret(env), `${path}|${exp}`);
  if (expected.length !== sig.length) return false;
  let r = 0; for (let i = 0; i < expected.length; i++) r |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return r === 0;
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
