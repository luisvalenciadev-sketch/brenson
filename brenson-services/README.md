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

## `/b2b/request` es el único camino de alta corporativa

Desde el 18/09/2026 la tienda usa **cuentas nuevas de cliente**, así que el tema ya no puede crear
cuentas con `form 'create_customer'`. Este endpoint crea el cliente con Admin API (`customerCreate`)
o convierte el existente, y escribe los metafields `brenson_b2b.*` más el tag `b2b-pendiente`.

Dos secretos dejan de ser opcionales para que el flujo funcione de verdad:

| Secreto | Si falta |
|---|---|
| `SHOPIFY_ADMIN_TOKEN` | No se crea ninguna cuenta: el endpoint solo registra en consola y devuelve un id falso. Necesita scope `write_customers` |
| `QUOTE_SIGNING_SECRET` | El `upload_token` que ata el documento del paso 2 a su cliente se firma con la clave de desarrollo que está en el código, o sea que deja de proteger nada |

`TURNSTILE_SECRET` sigue siendo opcional: sin él se omite la verificación anti-spam, pero el rate
limit por IP (5 solicitudes por hora, vía KV) se mantiene.

Del lado del tema hay que pegar la URL del worker en el ajuste `brenson_services_url`. Con ese campo
vacío el formulario corre en modo simulación: valida y muestra el mensaje de éxito sin enviar nada.

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
