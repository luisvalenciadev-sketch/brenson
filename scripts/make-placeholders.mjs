#!/usr/bin/env node
/**
 * Genera imágenes placeholder SVG por categoría (S2) para usar mientras Brenson produce las fotos.
 * Salida: mock-data/img/<categoria>.svg (1200x900, 4:3) + hero.svg (1920x1080). Subir a Shopify Files o usar como imagen de colección.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'mock-data', 'img');
mkdirSync(out, { recursive: true });

const silhouettes = {
  bicicleta: 'M200 620a110 110 0 1 0 220 0 110 110 0 1 0-220 0Zm580 0a110 110 0 1 0 220 0 110 110 0 1 0-220 0ZM310 620l150-260h120l110 260M460 360l-40-90h120M580 360l160 260M890 620 720 340',
  ciclomotor: 'M230 640a95 95 0 1 0 190 0 95 95 0 1 0-190 0Zm560 0a95 95 0 1 0 190 0 95 95 0 1 0-190 0ZM325 640c40-140 130-200 260-200h120l70 200M520 440l-60-120h140M700 300h120v70M880 640l-60-200',
  motocarro: 'M180 650a80 80 0 1 0 160 0 80 80 0 1 0-160 0Zm300 0a80 80 0 1 0 160 0 80 80 0 1 0-160 0Zm420 0a80 80 0 1 0 160 0 80 80 0 1 0-160 0ZM260 650V400h340v250M600 400l-80-130H360l-100 130M640 380h300v270M940 380l60 90v180',
  cuadriciclo: 'M210 660a85 85 0 1 0 170 0 85 85 0 1 0-170 0Zm560 0a85 85 0 1 0 170 0 85 85 0 1 0-170 0ZM160 660V480l140-170h500l160 170v180M300 310v170h560M420 480v180M700 480v180'
};

for (const [cat, d] of Object.entries(silhouettes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
<rect width="1200" height="900" fill="#f4f4f4"/>
<path d="${d}" fill="none" stroke="#c4c8cf" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
<text x="600" y="820" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="34" font-weight="700" fill="#9aa0a8" letter-spacing="4">${cat.toUpperCase()} · IMAGEN DE DEMOSTRACIÓN</text>
</svg>`;
  writeFileSync(join(out, `${cat}.svg`), svg);
}

writeFileSync(join(out, 'hero.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="1920" height="1080">
<defs><radialGradient id="g" cx="80%" cy="20%" r="90%"><stop offset="0" stop-color="#2a2f38"/><stop offset="1" stop-color="#050709"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#g)"/>
<path d="m1000 300-260 400h190l-40 260 270-400h-200l40-260Z" fill="#ee0000" opacity=".9"/>
<text x="960" y="1020" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="28" fill="#6b7280" letter-spacing="4">HERO DE DEMOSTRACIÓN · REEMPLAZAR POR VIDEO</text>
</svg>`);

console.log('Placeholders en', out);
