# brenson-services

Backend serverless de Brenson en Cloudflare Workers (Hono + TypeScript).

## Qué hace

| Endpoint | Función | Módulo |
|---|---|---|
| `POST /lead` | Recibe leads B2C (cotización, financiamiento, contacto, prueba de manejo), valida, puntúa y envía al CRM | 09, 11 |
| `POST /b2b/request` | Convierte una cuenta personal en solicitud corporativa (nota + tag pendiente + metafield) | 07 |
| `POST /upload` | Recibe cámara de comercio / RUT, lo guarda en R2 y enlaza en el cliente | 07, 18 |
| `POST /quote` | Recalcula la cotización con precios reales y tier del cliente, genera PDF, crea metaobject y notifica | 08 |
| `GET /ficha/:handle.pdf` | Ficha técnica generada desde metafields | 04, 09 |
| `POST /webhooks/shopify/:topic` | Webhooks verificados por HMAC → CRM (clientes, carritos, pedidos) | 11 |

## Modo simulación

Sin cuentas externas todo funciona con proveedores mock (ver `wrangler.toml`):

```
CRM_PROVIDER=mock      # leads a KV + consola          → ghl cuando exista GoHighLevel
MAIL_PROVIDER=console  # correos a consola             → resend
PDF_PROVIDER=html      # HTML imprimible servido en /quotes/:id.pdf → pdfmonkey
STORAGE_PROVIDER=local # solo log                      → r2
```

Sin `SHOPIFY_ADMIN_TOKEN`, `/quote` usa los precios enviados por el cliente (solo para demo). Con token, **recalcula con Admin API** y el tier real del cliente: el frontend nunca define el precio (riesgo R-A3).

## Puesta en marcha

```bash
npm install
cp .dev.vars.example .dev.vars   # y completar secretos
npm run dev                      # http://127.0.0.1:8787/health
npm test
npm run deploy
```

Crear KV y R2 antes del deploy:

```bash
wrangler kv namespace create KV
wrangler r2 bucket create brenson-b2b-docs
```

## Webhooks de Shopify a registrar

`customers/create`, `customers/update`, `checkouts/create`, `orders/create`, `orders/fulfilled` → `https://<worker>/webhooks/shopify/<topic-con-guion>`.

## Scopes del token Admin (app custom)

`read_customers`, `write_customers`, `read_products`, `read_metaobjects`, `write_metaobjects`, `read_orders`.
