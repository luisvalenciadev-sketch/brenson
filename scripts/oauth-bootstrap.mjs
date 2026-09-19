#!/usr/bin/env node
/**
 * oauth-bootstrap — Obtiene un Admin API access token nuevo para la app personalizada
 * "Brenson Admin Scripts" vía el flujo OAuth de Shopify (Authorization Code Grant).
 * Levanta un servidor local en :8787, abre la URL de autorización, recibe el callback
 * con el code y lo intercambia por el access_token.
 *
 *   SHOPIFY_SHOP=brenson-0.myshopify.com \
 *   SHOPIFY_CLIENT_ID=... \
 *   SHOPIFY_CLIENT_SECRET=... \
 *   node scripts/oauth-bootstrap.mjs
 *
 * Requiere que la URL de redirect "http://localhost:8787/callback" esté en la whitelist
 * de la app (Dev Dashboard → Brenson Admin Scripts → Configuración → URLs de redirección).
 */
import http from 'node:http';
import crypto from 'node:crypto';

const SHOP = process.env.SHOPIFY_SHOP;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const PORT = 8787;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
  console.error('Faltan SHOPIFY_SHOP, SHOPIFY_CLIENT_ID o SHOPIFY_CLIENT_SECRET.');
  process.exit(1);
}

const SCOPES = [
  'read_products', 'write_products',
  'read_customers', 'write_customers',
  'read_content', 'write_content',
  'read_online_store_pages', 'write_online_store_pages',
  'read_online_store_navigation', 'write_online_store_navigation',
  'read_files', 'write_files',
  'read_metaobjects', 'write_metaobjects',
  'read_metaobject_definitions', 'write_metaobject_definitions',
  'read_orders', 'write_orders',
  'read_draft_orders', 'write_draft_orders',
  'read_publications', 'write_publications',
  'read_themes', 'write_themes',
  'read_discounts', 'write_discounts',
].join(',');

const state = crypto.randomBytes(16).toString('hex');
const authUrl = `https://${SHOP}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

console.log('\nAbre esta URL en tu navegador (con sesión activa como admin de la tienda) y autoriza la app:\n');
console.log(authUrl + '\n');
console.log(`Esperando el callback en ${REDIRECT_URI} ...\n`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') {
    res.writeHead(404); res.end(); return;
  }
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const shop = url.searchParams.get('shop');

  if (returnedState !== state) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('State inválido. Cierra esto e intenta de nuevo.');
    console.error('State no coincide, posible CSRF. Abortando.');
    server.close();
    process.exitCode = 1;
    return;
  }
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('No llegó el parámetro "code".');
    return;
  }

  try {
    const tokenRes = await fetch(`https://${shop || SHOP}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(JSON.stringify(tokenJson));

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Listo.</h2><p>Revisa la terminal: ahí quedó el token. Puedes cerrar esta pestaña.</p>');

    console.log('\n=== Token obtenido ===');
    console.log('SHOPIFY_ADMIN_TOKEN=' + tokenJson.access_token);
    console.log('Scopes concedidos: ' + tokenJson.scope);
    console.log('======================\n');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error intercambiando el code. Revisa la terminal.');
    console.error('Error en el intercambio:', err.message);
  } finally {
    server.close();
  }
});

server.listen(PORT);
