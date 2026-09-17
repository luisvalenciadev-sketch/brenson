# Estado del proyecto — Brenson Ecosistema

Actualizado: 11 de septiembre de 2026, cierre de la sesión 1 de construcción.
Regla: **todo lo que no dependía de accesos externos está hecho.** Lo pendiente requiere la tienda Shopify, Cloudflare, una app custom o contenido de Brenson. Cómo publicar: `docs/GUIA_PUBLICACION.md`.

## Resumen en una tabla

| Componente | Estado | Verificación |
|---|---|---|
| Diseño (Stitch) | ✅ 14 pantallas desktop y mobile | `stitch-design/SCREENS.md`, correcciones en `REVIEWS.md` |
| Tema `brenson-theme` | ✅ código completo, sin desplegar | Theme Check 0 errores / 0 warnings |
| Backend `brenson-services` | ✅ código completo, sin desplegar | `tsc` sin errores, 3 tests |
| Function `brenson-b2b-functions` | ✅ código completo, sin desplegar | 5 tests |
| Scripts de datos | ✅ listos, probados en dry-run | `npm run definitions:dry`, `npm run import:mocks:dry` |
| Datos simulados | ✅ 12 vehículos + 11 metaobjects + blog + políticas + placeholders | `mock-data/` |
| Documentación | ✅ plan, decisiones, simulación, Flows, QA, manual, copy, publicación, prompt | `docs/` |
| Despliegue en Shopify | ❌ requiere acceso | Guía §1 a §3 |
| Despliegue Worker | ❌ requiere Cloudflare | Guía §4 |
| Despliegue Function | ❌ requiere app custom | Guía §6 |
| Flows y webhooks | ❌ requiere Admin | Guía §5 |
| GTM, Meta, Klaviyo, Junip, inglés | ❌ Sprint 6 y Fase 5 | Guía §7 y §8 |
| Contenido real de Brenson | ❌ ver entregables | `DECISIONES_BRENSON.md` |

## Tema: módulos de la propuesta

| Módulo | Estado | Archivos clave |
|---|---|---|
| 01 Homepage | ✅ | `templates/index.json`; `brenson-hero`, `-trust-bar`, `-category-grid`, `-financing-banner`, `-case-studies`, `-social-proof`, `-empresas-cta` |
| 02 Catálogo | ✅ | `templates/collection.json`; `card-product` (badge, 3 specs, cuota, vista rápida); `brenson-quick-view` + modal + JS; chips en `main-collection-banner` |
| 03 Filtros | ✅ por tramos | Facetas nativas + metafields `autonomia_tramo`, `velocidad_tramo`, `carga_tramo` (decisión: tramos, no slider). Configurar en Search & Discovery |
| 04 Ficha | ✅ | `templates/product.json`; bloques `brenson_*` en `main-product`; `brenson-product-specs`, `-certification`, `-warranty`, `brenson-faq`, `-sticky-cta`, `-exit-intent` |
| 05 Simulador | ✅ | `brenson-simulator` + JS; `brenson-price` (cálculo en Liquid); `page.financiacion.json` |
| 06 Confianza | ✅ | Sello, checklist, garantía, envíos, contadores, aliados, testimonios (solo verificados en producción) |
| 07 Cuentas | ✅ | Templates clásicos (Dawn 14); header con enlace clásico; `main-register` (Persona/Empresa, ciudad, uso); `main-account` (unidades); `brenson-b2b-request-access` con NIT |
| 08 Empresas | ✅ | `theme.empresas.liquid`; `brenson-b2b-gate` (4 estados), `-dashboard`, `-header`, `-footer`, `-collection-grid`, `-quoter` (+ `?add`, `?duplicar`); templates `page.empresas`, `page.empresas-acceso`, `page.cotizador`, `collection.empresas` |
| 08b Empresas · landing pública | ✅ | Pantallas Stitch 15-17. `brenson-b2b-roi`, `-respaldo`, `-flotas` (+ assets `brenson-b2b-roi.js`, `-flotas.js`); templates `page.empresas-beneficios`, `page.empresas-proceso`, `page.empresas-flotas`; páginas creadas con `scripts/create-empresas-pages.mjs`. Solo visibles cuando `b2b_state != 'aprobado'` |
| 09 Leads | ✅ | `brenson-lead-form` + JS, exit intent, Turnstile opcional |
| 10 WhatsApp | ✅ | `brenson-whatsapp-link`, `-float` con horario, CTA en header, mensajes por contexto |
| 11 CRM | ✅ backend | Adaptadores mock/GHL en `brenson-services` |
| 12 Admin | ✅ | 4 grupos de settings; `settings_data.json` con paleta y Montserrat; metaobjects |
| 13 SEO | ✅ | `brenson-json-ld` (Organization, Product enriquecido, Breadcrumb), FAQPage, noindex Empresas; JSON-LD de Dawn desactivado para vehículos |
| 14 Performance | ⏳ medir | Sin jQuery, JS por módulo con `defer`. Lighthouse pendiente de staging |
| 15 Analytics | ✅ | `brenson-datalayer`: Consent Mode v2, GTM condicional, eventos `brenson_*` |
| 16 Remarketing | ❌ Admin | Klaviyo, Meta (Sprint 6) |
| 17 Mobile | ✅ | Sticky bar, chips apilados, carruseles con scroll-snap |
| 18 Seguridad | ✅ | Gating server-side, Function como validación real, HMAC, Turnstile, rate limit, enlaces firmados de PDF y documentos |

## Backend `brenson-services`

Endpoints: `/health`, `POST /lead`, `POST /b2b/request`, `POST /upload`, `POST /quote`, `GET /quotes/:id.pdf` (firmado), `GET /docs/*` (firmado, R2 privado), `GET /ficha/:handle.pdf`, `POST /webhooks/shopify/:topic`. Proveedores por variable: CRM mock/GHL, mail consola/Resend, PDF HTML/PDFMonkey, storage local/R2. Dependencias instaladas, `tsc` limpio.

## Pendiente de código (menor, para después de tener staging)

- Ajustes visuales que solo se ven con la tienda real (espaciados de Dawn vs. diseño Stitch).
- Traducción de las cadenas `t:` de los schemas nuevos si se quiere el editor 100 % en español (hoy los labels Brenson ya están en español literal).
- Exportar plantilla Excel para Brenson (`docs/PLANTILLA_SPECS.xlsx`) — hoy el esquema es `mock-data/vehiculos.json`.
- Redirecciones 301 (lista depende de Search Console).

## Entregables de Brenson que desbloquean el reemplazo de mocks

Manual de marca · fotos y video · specs · tasa y aliado financiero · % por tier · checklist de certificación · textos legales · testimonios y aliados autorizados · cifras de contadores · lista de clientes B2B · tiempos por región · dirección de sede. Detalle con fechas en `DECISIONES_BRENSON.md`.
