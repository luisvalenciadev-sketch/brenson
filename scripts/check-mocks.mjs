#!/usr/bin/env node
/**
 * Verificación pre-lanzamiento (ESTRATEGIA_SIMULACION.md): falla si quedan marcadores de simulación
 * en el tema o en los datos que se van a publicar.
 *   node scripts/check-mocks.mjs            → revisa brenson-theme/ (templates, sections, snippets, config, locales) y mock-data/
 *   node scripts/check-mocks.mjs --strict   → además falla si settings_data.json tiene brenson_modo_simulacion=true
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MARKERS = [/\[BORRADOR[^\]]*\]/g, /\[VALIDAR[^\]]*\]/g, /\[MOCK\]/g, /"_mock"\s*:\s*true/g];
const SCAN = ['brenson-theme/templates', 'brenson-theme/sections', 'brenson-theme/snippets', 'brenson-theme/config', 'brenson-theme/locales', 'mock-data'];
const strict = process.argv.includes('--strict');
let hits = 0;

function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(liquid|json|md)$/.test(f)) {
      const txt = readFileSync(p, 'utf8');
      for (const re of MARKERS) {
        const m = txt.match(re);
        if (m) { hits += m.length; console.log(`  ${p.replace(ROOT, '')}: ${m.length} × ${re.source}`); }
      }
    }
  }
}
for (const d of SCAN) { try { walk(join(ROOT, d)); } catch {} }

if (strict) {
  try {
    const sd = JSON.parse(readFileSync(join(ROOT, 'brenson-theme/config/settings_data.json'), 'utf8'));
    if (sd.current?.brenson_modo_simulacion) { hits++; console.log('  settings_data.json: brenson_modo_simulacion = true'); }
  } catch {}
}

if (hits) { console.error(`\n✗ ${hits} marcadores de simulación encontrados. No publicar hasta reemplazarlos (ver docs/ESTRATEGIA_SIMULACION.md).`); process.exit(1); }
console.log('✓ Sin marcadores de simulación.');
