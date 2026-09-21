import puppeteer from '@cloudflare/puppeteer';
import type { Env } from '../types';

/**
 * PDF real desde el mismo HTML de marca (PDF_PROVIDER = "browser", Cloudflare Browser Rendering).
 *
 * Se genera al abrir el enlace, no al crear la cotización: así /quote sigue siendo rápido y una
 * falla del navegador nunca impide cotizar. El resultado se cachea en KV bajo `cacheKey`; quien
 * llama decide la vigencia (una cotización es inmutable, una ficha técnica cambia con las specs).
 *
 * Devuelve null si el renderizado no está disponible o falla: el endpoint sirve entonces el HTML,
 * que es exactamente lo que se veía antes de este proveedor.
 */
export async function htmlToPdf(env: Env, html: string, cacheKey: string, ttlSeconds: number): Promise<ArrayBuffer | null> {
  if (env.PDF_PROVIDER !== 'browser' || !env.BROWSER) return null;
  if (env.KV) {
    const cached = await env.KV.get(cacheKey, 'arrayBuffer');
    if (cached) return cached;
  }
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();
    // networkidle0: espera la fuente Ubuntu (Google Fonts) y las imágenes de producto de la ficha.
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 20000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
    const bytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    if (env.KV) await env.KV.put(cacheKey, bytes, { expirationTtl: ttlSeconds });
    return bytes;
  } catch (e) {
    console.error('[pdf:browser] no se pudo generar, se sirve HTML', cacheKey, e);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

export function pdfResponse(bytes: ArrayBuffer, filename: string) {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      // inline: se abre en el visor del navegador; el nombre sale al descargar o adjuntar.
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=300'
    }
  });
}
