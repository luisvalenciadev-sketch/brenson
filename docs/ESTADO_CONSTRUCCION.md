# Estado de construcción — Brenson Ecosistema

Actualizado: 11 de septiembre de 2026. Todo construido con datos simulados según `ESTRATEGIA_SIMULACION.md`. Nada desplegado aún: falta acceso a la tienda Shopify (verificaciones Sprint 1).

## Diseño (Stitch)

Proyecto `projects/6680964782534882674` · design system `assets/7471924313442223255`. Capturas y HTML en `stitch-design/`.

| # | Pantalla | Estado |
|---|---|---|
| 01 | Homepage desktop | ✅ revisada |
| 02 | Catálogo Ciclomotores desktop | ✅ revisada |
| 03 | Ficha City 1500 desktop | ✅ revisada |
| 04 | Dashboard Empresas | ✅ revisada |
| 05 | Crear cuenta / login | ✅ |
| 06 | Financiación | ✅ |
| 07 | Landing Empresas (sin sesión) | ✅ |
| 08 | Cotizador de flota | ✅ |
| 09 | Homepage mobile | ✅ |
| 10 | Ficha mobile con sticky bar | ✅ |

Pendientes de diseño: catálogo mobile, Empresas mobile, cotizador mobile, estados pendiente/rechazado, página de garantía, blog. Notas de corrección en `stitch-design/REVIEWS.md` (Stitch inventa marcas y datos: nada de eso pasa al tema).

## Tema `brenson-theme` (Dawn 16 + `brenson-*`)

Theme Check: 0 errores, 0 warnings.

| Módulo | Implementado | Archivos clave |
|---|---|---|
| 01 Homepage | ✅ | `templates/index.json`, `brenson-hero`, `brenson-trust-bar`, `brenson-category-grid`, `brenson-financing-banner`, `brenson-case-studies`, `brenson-social-proof`, `brenson-empresas-cta` |
| 02 Catálogo | ✅ base | `templates/collection.json`, `card-product` extendido (badge, 3 specs, cuota) |
| 03 Filtros | ✅ nativo | Facetas de Dawn (Search & Discovery). Falta configurar filtros por metafield en Admin |
| 04 Ficha | ✅ | `templates/product.json`, bloques `brenson_*` en `main-product`, `brenson-product-specs`, `-certification`, `-warranty`, `brenson-faq`, `brenson-sticky-cta` |
| 05 Simulador | ✅ | `brenson-simulator` (Web Component), `brenson-price` (cálculo Liquid), `page.financiacion.json` |
| 06 Confianza | ✅ | Sello certificado, checklist, garantía, envíos, contadores, aliados, testimonios (solo verificados en producción) |
| 07 Cuentas | ✅ | Templates clásicos de Dawn 14, `main-register` (Persona/Empresa, ciudad, uso), `main-account` (unidades y garantías), `brenson-b2b-request-access` con validación NIT |
| 08 Portal Empresas | ✅ | `layout/theme.empresas.liquid`, `page.empresas.json`, `brenson-b2b-gate` (4 estados), `-dashboard`, `-header/-footer`, `-collection-grid` (gating server-side), `-quoter` + JS, `page.cotizador.json`, `page.empresas-acceso.json` |
| 09 Leads | ✅ | `brenson-lead-form` + JS (endpoint o simulación), exit intent ❌ pendiente |
| 10 WhatsApp | ✅ | `brenson-whatsapp-link`, `brenson-whatsapp-float` + horario, mensajes por contexto |
| 11 CRM | ✅ backend | Adaptador GHL + mock en `brenson-services` |
| 12 Admin | ✅ | 4 grupos de settings Brenson, metaobjects definidos en `docs/metafield-definitions.json` |
| 13 SEO | ✅ base | `brenson-json-ld` (Organization, Product, Breadcrumb), FAQPage, noindex Empresas. Redirecciones y blog ❌ |
| 14 Performance | ⏳ | Sin jQuery, JS por módulo con `defer`. Medición pendiente |
| 15 Analytics | ✅ base | `brenson-datalayer` (Consent Mode v2, GTM, eventos custom en todos los JS) |
| 16 Remarketing | ❌ | Klaviyo/Meta se configuran en Admin (Sprint 6) |
| 17 Mobile | ✅ | Sticky bar, chips apilados, grids responsivos |
| 18 Seguridad | ✅ | Gating Liquid, Function como validación real, HMAC, Turnstile, rate limit |

## `brenson-services` (Cloudflare Worker)

Endpoints `/lead`, `/b2b/request`, `/upload`, `/quote`, `/ficha/:handle.pdf`, `/quotes/:id.pdf`, `/webhooks/shopify/:topic`, `/health`. Proveedores mock/real por variable de entorno. Test de fórmulas en `test/`. Sin desplegar (falta cuenta Cloudflare de Brenson).

## `brenson-b2b-functions` (Shopify Function)

`extensions/tier-discount`: descuento por tier con override por producto y mínimo de unidades. 5 tests pasan. Sin desplegar (falta app custom en la tienda).

## Datos simulados

`mock-data/vehiculos.json` (12 vehículos) y `mock-data/metaobjects.json` (financiación, tiers, asesores, certificación, FAQ, testimonios, aliados, contadores, casos, regiones, clientes B2B, unidades, cotizaciones). Falta el script de importación `scripts/import-*.mjs` (requiere token Admin).

## Siguiente paso operativo

1. Acceso colaborador a la tienda → verificaciones Sprint 1 (cuentas clásicas, plan, apps, GHL).
2. Crear metafields/metaobjects con `docs/metafield-definitions.json` e importar mocks.
3. `shopify theme push --unpublished` como "Brenson Staging" y revisar en el editor.
4. Cuenta Cloudflare → `wrangler deploy` y poner la URL en Ajustes → Brenson · Empresas.
5. App custom → `shopify app deploy` y activar el descuento automático.
