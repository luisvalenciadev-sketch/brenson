# PLAN DE TRABAJO TÉCNICO — BRENSON S.A.S.

**Ecosistema e-commerce de movilidad eléctrica sobre Shopify (B2C + B2B)**
Documento de arquitectura y roadmap de implementación · Versión 1.0 · 11 de septiembre de 2026
Basado en: *Propuesta desarrollo.pdf* (Enlaces Digitales) + auditoría del export `theme_export__brenson-co-brenson-main__11SEP2026`

> Estado: **APROBADO EN DECISIONES (11-sep-2026)**. Arquitectura, alcance y ajustes técnicos aprobados vía cuestionario. Ver `DECISIONES_BRENSON.md` y el Anexo A (§9). Pendiente: verificaciones técnicas del Sprint 1 y entregables de Brenson. No se escribe código hasta cerrar el Sprint 1.

---

## Índice

0. Resumen ejecutivo y decisión de arquitectura
1. Auditoría del tema existente
2. Arquitectura objetivo
3. Arquitectura de datos: metafields y metaobjects
4. Plan de trabajo por fases (1 a 6) y sprints
5. Matriz módulo → fase → archivos
6. Estrategia de entorno, Git y despliegue
7. Riesgos técnicos detectados en la auditoría (adicionales a la propuesta)
8. Decisiones previas al Sprint 1 (resueltas)
9. Anexo A: cambios derivados de las decisiones del 11-sep-2026

---

## 0. Resumen ejecutivo y decisión de arquitectura

| Pregunta | Respuesta |
|---|---|
| ¿Qué tema hay hoy? | **EDrop® 4.7** (EDrop.com.co), un fork comercial del tema *Warehouse* de Maestrooo orientado a dropshipping. **No es Dawn.** |
| ¿Sirve como base? | **No.** Arquitectura "vintage" (templates `.liquid`, sin Online Store 2.0 real), jQuery, código ofuscado, cloaking de auditorías de performance, notificaciones de compra falsas, residuos de GemPages y de otra tienda (VMFULLSTORE). |
| ¿Rehacer o refactorizar? | **Rehacer desde Dawn (última versión) como tema nuevo.** Del tema actual se rescata únicamente **contenido y configuración de marca** (logo, tipografía, colores, textos, menús, número de WhatsApp), nunca código. |
| ¿Qué cambia respecto a la propuesta? | Dos ajustes técnicos justificados: (a) filtros con **facetas nativas de Shopify + Section Rendering API** en lugar de Storefront API; (b) el canal B2B usa **cuentas clásicas de cliente + tags/metafields + Shopify Function de descuento** empaquetada en una app custom. Detalle en §2.4 y §2.5. |
| Duración | 16 semanas / 8 sprints de 2 semanas. MVP B2C funcional al cierre del Sprint 4 (semana 8). |

---

## 1. Auditoría del tema existente

### 1.1 Inventario

| Carpeta | Archivos | Observaciones |
|---|---|---|
| `layout/` | 8 | `theme.liquid` + 4 layouts GemPages + `theme.product-landing` + gift-card + password |
| `templates/` | 40 (32 `.liquid`, 7 `.json`) | Templates JSON solo para landings GemPages/dropshipping. `index`, `product`, `collection` son `.liquid` legacy |
| `templates/customers/` | 7 | Login/registro/cuenta estándar de Warehouse. Sin lógica de tipo de cliente |
| `sections/` | 61 | 37 con presets. ~10 secciones "landing" monolíticas de 20–110 KB con CSS/JS inline |
| `snippets/` | 44 | 3 archivos vacíos (`fk-lck`, `review_pr_other`, `salesbox-common`) |
| `assets/` | 16 | `theme.css` 291 KB · `theme.js` 513 KB · `theme.min.js` 218 KB duplicado como `.liquid` |
| `config/` | 4 | `settings_data.json` con backup; `markets.json` vacío |
| `locales/` | 6 | `en.default.json` como idioma por defecto en una tienda 100 % en español |
| `blocks/` | 0 | No existe: el tema no soporta theme blocks (OS 2.0) |

### 1.2 Hallazgos críticos (bloquean la reutilización)

| # | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| A1 | **Arquitectura vintage, no OS 2.0** | `templates/index.liquid` = `{{ content_for_index }}`; `product.liquid` y `collection.liquid` invocan secciones fijas. Sin JSON templates ni app blocks | Imposible usar "secciones en todas las páginas", app blocks, theme blocks ni el editor moderno. Cada módulo requeriría hardcodear Liquid |
| A2 | **Código ofuscado con fines de cloaking** | `assets/custom.js`: ocultación de enlaces AliHunter y redirección de `?sort_by=best-selling` cifrados con `String.fromCodePoint`. `assets/source.js`: detecta user-agent `Chrome-Lighthouse`/`GTmetrix` y **no carga scripts** para inflar la puntuación de performance | Métricas de performance actuales no son reales. Riesgo reputacional y de compliance |
| A3 | **Notificaciones de compra fabricadas** | `sections/notification-section.liquid` + `snippets/notification-snippet.liquid`: nombres y ciudades aleatorios (`Math.random`), producto fallback *"Gorro para migraña"* | Contradice el pilar CONFIANZA. Riesgo legal (publicidad engañosa, Ley 1480 Estatuto del Consumidor) |
| A4 | **Dependencia de polyfill.io** | `layout/theme.liquid` carga `cdn.polyfill.io` (dominio comprometido en el incidente de supply-chain de 2024) | Vector de inyección de JS malicioso en producción |
| A5 | **Texto de depuración en producción** | `templates/collection.liquid`: si `sort_by == 'best-selling'` muestra *"TECLE F5 CONTINUAMENTE 159 VEZES..."* en portugués | Página rota para un ordenamiento estándar |
| A6 | **Residuos de otra tienda / dropshipping** | Header y footer con `VMFULLSTORE@GMAIL.COM` y `+57 324 519 5830`; templates `product.panty-levanta-cola.json`, `rueda-abdominal`, `cortador-3-en-1`, `parlante-3-en-1`, `nad-seler-b`; colecciones `mas-vendidos-copia`, `ofertas-copia`; `function parcelamento()` con "128 cuotas" | Datos de contacto y catálogo de un tercero en el tema activo |
| A7 | **Bloqueadores de UX** | Settings `botao_direito_enable`, `atalho_f12_enable`, `selecionar_conteudo_enable` (deshabilitados hoy pero en el código) | Anti-patrón de accesibilidad; sin valor para Brenson |

### 1.3 Hallazgos de deuda técnica (encarecen cualquier refactor)

| # | Hallazgo | Evidencia |
|---|---|---|
| B1 | jQuery 3.6 + jquery-migrate cargados síncronos en `<head>` | `layout/theme.liquid` |
| B2 | Font Awesome **4.7 y 5.0.1 simultáneos** desde CDN + ionicons desde unpkg | `layout/theme.liquid`; 12 referencias a `unpkg.com`, 5 a `use.fontawesome.com` |
| B3 | 2 stylesheets referenciados **no existen** en assets | `mystery-box-custom.css`, `gallery-custom.css` |
| B4 | Script de MercadoPago inyectado en collection template | `templates/collection.liquid` |
| B5 | Filtros de colección basados en **tags** (`current_tags`, `collection.all_tags`), no en facetas nativas ni metafields | `sections/collection-template.liquid` |
| B6 | **Cero metafields de producto** propios. Solo lecturas de apps de reviews (`spr`, `loox`, `ryviu`) | grep `metafields.` en secciones/snippets |
| B7 | 4 apps de reviews conviviendo (Shopify Reviews `spr`, Loox, Ryviu, A2Reviews, AliExpress reviews) | `templates/product.liquid`, snippets |
| B8 | 26 archivos con strings en portugués | grep `frete|parcel|desculpe|tecle` |
| B9 | Secciones landing monolíticas (`selector-landing` 104 KB, `quantity-offers-section` 109 KB, `testimonios-con-fotos-landing` 79 KB) con CSS y JS inline | `sections/*-landing.liquid` |
| B10 | Duplicidad de snippets (`product-gallery` vs `product-gallery-custom` 67 KB c/u; `product-info` vs `product-info-custom`) | `snippets/` |
| B11 | Idioma por defecto `en` en tienda española | `locales/en.default.json` |

### 1.4 Lo que SÍ se rescata (contenido y configuración, no código)

| Activo | Ubicación actual | Uso en el nuevo tema |
|---|---|---|
| Logo | `shop_images/3_1.png` (header) | `settings.logo` del nuevo tema |
| Tipografía | Montserrat 700 títulos / 500 cuerpo | Sistema de diseño (validar con UI/UX) |
| Paleta | Header `#050709`, acento `#000000`, botón primario `#EE0000`, fondo `#F4F4F4` | Punto de partida de tokens CSS (validar) |
| Badges de header | *"Certificado Brenson"*, *"100 % Eléctrico"* | Semilla del Módulo 06 (Sistema de Confianza) |
| Bloque de beneficios | *Compra Segura · Envíos a todo el país · Soporte profesional · Satisfacción o Reembolso* | Sección `brenson-trust-bar` |
| WhatsApp | `+57 316 482 0543` (widget addzap) con textos de saludo | Módulo 10. **Confirmado como número oficial.** El `+57 324 519 5830` y el correo VMFULLSTORE se eliminan |
| Menús | `linklists['footer']`, menú principal (vacío en settings) | Recrear en Admin → Navegación |
| Colecciones existentes | `mas-vendidos`, `promociones`, `ofertas` (+ copias) | Reemplazar por colecciones por categoría (bicicletas, ciclomotores, motocarros, cuadriciclos) |

### 1.5 Matriz de decisión: reutilizar vs. rehacer

| Criterio | Peso | Reutilizar EDrop | Rehacer sobre Dawn |
|---|---|---|---|
| Soporte OS 2.0 (JSON templates, app blocks, theme blocks) | Alto | ✗ | ✓ nativo |
| Seguridad (polyfill.io, código ofuscado) | Alto | ✗ requiere purga completa | ✓ limpio |
| Performance (Core Web Vitals reales, sin jQuery) | Alto | ✗ 800 KB de JS/CSS legacy | ✓ Dawn ~30 KB JS |
| Facetas nativas + metafields | Alto | ✗ filtros por tag | ✓ `collection.filters` |
| Editor para el equipo Brenson (Módulo 12) | Alto | ✗ limitado | ✓ |
| Tiempo estimado hasta homepage + PDP + catálogo | Medio | 5–6 sem (limpieza + adaptación) | 4–5 sem |
| Riesgo de regresiones ocultas | Alto | Muy alto (3 apps de reviews, GemPages, JS ofuscado) | Bajo |
| Cumplimiento del pilar CONFIANZA | Alto | ✗ notificaciones falsas embebidas | ✓ |

**Decisión recomendada: rehacer sobre Dawn.** Refactorizar EDrop costaría más que construir limpio y heredaría riesgos de seguridad y legales incompatibles con la propuesta de valor de Brenson.

---

## 2. Arquitectura objetivo

### 2.1 Principios

1. **Dawn como base, sin fork profundo del core.** Toda funcionalidad Brenson vive en archivos con prefijo `brenson-` (secciones, snippets, assets, blocks). El core de Dawn se toca lo mínimo para poder absorber actualizaciones.
2. **Liquid server-side primero.** Todo lo que pueda renderizarse en Liquid se renderiza en Liquid. JS solo para interactividad (simulador, cotizador, filtros AJAX).
3. **Vanilla JS ES2020 + Web Components** (patrón de Dawn). Alpine.js 3 se autoriza **únicamente** dentro del portal B2B (cotizador de flota), cargado solo en ese template.
4. **Datos en Shopify, no en el tema.** Specs, garantías, certificaciones, tasas del simulador, asesores y tiers viven en metafields/metaobjects editables desde Admin (Módulo 12).
5. **Un único backend serverless ligero** (`brenson-services`) para lo que Shopify no hace: PDF de cotización, validación de leads con rate limit, relay de webhooks a GoHighLevel.
6. **Un única app custom de Shopify** (`brenson-b2b-functions`) para la Shopify Function de precios por tier. Sin Shopify Plus.

### 2.2 Diagrama de componentes

```
┌─────────────────────────────── SHOPIFY ────────────────────────────────┐
│                                                                        │
│  Tema "Brenson 2026" (Dawn base)          Datos                        │
│  ├─ templates/*.json (OS 2.0)             ├─ Product metafields        │
│  ├─ sections/brenson-*.liquid             │   (namespace brenson)      │
│  ├─ blocks/brenson-*.liquid               ├─ Customer metafields       │
│  ├─ snippets/brenson-*.liquid             │   (namespace brenson_b2b)  │
│  └─ assets/brenson-*.js|css               ├─ Metaobjects              │
│                                           │   financiacion, asesor,   │
│  App custom "brenson-b2b-functions"       │   tier_b2b, certificacion,│
│  └─ Function: Product Discount            │   faq, aliado, cotizacion │
│     (tier × cantidad → % descuento)       └─ Shopify Flow             │
│                                               (aprobación B2B, tags)  │
└──────────────┬──────────────────────────────────────┬──────────────────┘
               │ webhooks (HMAC)                      │ Admin API
               ▼                                      ▼
┌──────────────────────── brenson-services (serverless) ─────────────────┐
│  POST /lead        → valida + Turnstile + rate limit → GHL webhook     │
│  POST /quote       → PDFMonkey → guarda metaobject cotizacion → email  │
│  POST /webhooks/*  → customers/create, orders/*, checkouts/* → GHL     │
└────────────────────────────────────────────────────────────────────────┘
               │                          │                    │
               ▼                          ▼                    ▼
        GoHighLevel (CRM)            PDFMonkey            Klaviyo
        pipeline + scoring         cotización PDF        flows email

Tracking (cliente): GTM → GA4 · Meta Pixel · Klaviyo onsite
Tracking (servidor): Meta CAPI vía canal Facebook & Instagram de Shopify
```

### 2.3 Estructura de archivos del nuevo tema

```
brenson-theme/
├─ assets/
│  ├─ brenson-tokens.css            # variables de diseño (colores, espaciado, tipografía)
│  ├─ brenson-components.css        # badges, cards, chips, trust-bar
│  ├─ brenson-simulator.js          # Web Component <brenson-simulator>
│  ├─ brenson-facets.js             # mejora progresiva de facetas (AJAX + URL state)
│  ├─ brenson-whatsapp.js           # CTA dinámico por contexto
│  ├─ brenson-lead-form.js          # envío de formularios a /lead
│  ├─ brenson-b2b-quoter.js         # cotizador de flota (Alpine, solo template corporativo)
│  ├─ brenson-analytics.js          # dataLayer.push de eventos custom
│  └─ alpine.min.js                 # 15 KB, cargado solo en /corporativo
├─ blocks/                          # theme blocks reutilizables (OS 2.0)
│  ├─ brenson-spec-row.liquid
│  ├─ brenson-trust-badge.liquid
│  ├─ brenson-cta-whatsapp.liquid
│  └─ brenson-price-financed.liquid
├─ config/
│  ├─ settings_schema.json          # + grupo "Brenson · WhatsApp", "Brenson · Confianza"
│  └─ settings_data.json
├─ layout/
│  ├─ theme.liquid                  # + GTM, dataLayer base, preloads
│  └─ theme.empresas.liquid      # layout B2B: sin popups B2C, con Alpine
├─ locales/
│  ├─ es.default.json               # español como idioma por defecto
│  └─ es.default.schema.json
├─ sections/
│  ├─ (Dawn core: header, footer, main-product, main-collection-product-grid, ...)
│  ├─ brenson-hero.liquid
│  ├─ brenson-category-grid.liquid
│  ├─ brenson-trust-bar.liquid
│  ├─ brenson-counters.liquid
│  ├─ brenson-partners.liquid
│  ├─ brenson-testimonials.liquid
│  ├─ brenson-financing-banner.liquid
│  ├─ brenson-product-specs.liquid
│  ├─ brenson-product-certification.liquid
│  ├─ brenson-product-warranty.liquid
│  ├─ brenson-product-faq.liquid
│  ├─ brenson-simulator.liquid
│  ├─ brenson-lead-form.liquid
│  ├─ brenson-test-drive-form.liquid
│  ├─ brenson-exit-intent.liquid
│  ├─ brenson-b2b-gate.liquid       # guard de acceso /corporativo
│  ├─ brenson-b2b-dashboard.liquid
│  ├─ brenson-b2b-catalog.liquid
│  ├─ brenson-b2b-quoter.liquid
│  ├─ brenson-b2b-quotes-history.liquid
│  ├─ brenson-b2b-advisor.liquid
│  └─ brenson-b2b-request-access.liquid
├─ snippets/
│  ├─ brenson-price.liquid          # precio contado + cuota desde
│  ├─ brenson-badge.liquid
│  ├─ brenson-spec-table.liquid
│  ├─ brenson-whatsapp-link.liquid  # construye wa.me con mensaje por contexto
│  ├─ brenson-json-ld-product.liquid
│  ├─ brenson-json-ld-org.liquid
│  ├─ brenson-datalayer.liquid
│  ├─ brenson-b2b-guard.liquid      # lógica reutilizable de gating
│  └─ brenson-tier-price.liquid
└─ templates/
   ├─ index.json
   ├─ collection.json
   ├─ collection.empresas.json   # catálogo B2B (colección oculta al público)
   ├─ product.json                  # ficha de vehículo
   ├─ page.empresas.json         # /pages/empresas → portal B2B
   ├─ page.empresas-acceso.json  # solicitud de acceso B2B
   ├─ page.cotizador.json
   ├─ page.financiacion.json
   ├─ page.garantia.json
   ├─ page.contacto.json
   └─ customers/*.json              # login, register, account extendidos
```

### 2.4 Decisión técnica: filtros avanzados

La propuesta indica Storefront API + JS. Recomendación: **facetas nativas de Shopify (Search & Discovery) + Section Rendering API**.

| Aspecto | Storefront API + JS | Facetas nativas + Section Rendering |
|---|---|---|
| Filtro por metafield (autonomía, velocidad, carga, uso) | ✓ | ✓ (Search & Discovery permite filtros por metafield) |
| Rango de precio con slider | ✓ | ✓ (`filter.type == 'price_range'`) |
| URL compartible + SEO | Hay que construirlo | ✓ nativo (`?filter.p.m.brenson.autonomia_km.gte=60`) |
| Render inicial sin JS (LCP, SEO) | ✗ requiere hidratación | ✓ server-side |
| Conteo de resultados en vivo | ✓ | ✓ (`filter_value.count`) |
| Token público expuesto en el tema | Sí | No |
| Esfuerzo | Alto | Medio |

Storefront API queda reservado a la **vista rápida** y al **cotizador B2B** si en su momento se requiere leer variantes fuera de la colección renderizada. Dawn ya trae `facets.js`; se extiende, no se reemplaza.

### 2.5 Decisión técnica: portal B2B sin Shopify Plus

| Necesidad | Mecanismo | Notas |
|---|---|---|
| Identidad B2B | **Cuentas clásicas de cliente** + tags `b2b-pendiente`, `cliente-corporativo` + metafields `brenson_b2b.*` | Las *cuentas nuevas* de Shopify no permiten personalizar login/registro en Liquid ni leer `customer.tags` con la flexibilidad requerida. Se fija **cuentas clásicas** para este proyecto |
| Registro con NIT | Formulario `customer_register` extendido con `customer[note]` (NIT, razón social, tipo) + campo `customer[tags]` = `b2b-pendiente` | Shopify Flow: *Customer created* → si tag `b2b-pendiente` → notifica a Brenson + webhook GHL |
| Aprobación | Admin cambia tag a `cliente-corporativo` y fija `brenson_b2b.tier` | Flow: *Customer tag added* → email de bienvenida (Klaviyo) + webhook GHL |
| Acceso a `/pages/empresas` | Server-side en Liquid: `page.empresas.json` → `brenson-b2b-gate` verifica `customer.tags contains 'cliente-corporativo'`; si no, renderiza CTA a login/solicitud y **no emite** el HTML del portal | El gating Liquid es server-side: el HTML protegido nunca llega al navegador |
| Catálogo B2B oculto | Colección `empresas` con `template_suffix = empresas`, excluida de búsqueda/sitemap con metafield `seo.hidden = 1` y `noindex` | Publicar solo en canal Online Store |
| Precios por volumen (10+/20+/50+) | **Shopify Function (Product Discount)** en app custom: lee `cart.buyerIdentity.customer.metafield(brenson_b2b.tier)` y cantidad por línea → aplica % de `tier_b2b` | Disponible en todos los planes con app custom. El descuento se aplica en carrito/checkout: **es la única validación real de precio** |
| Mostrar precio flota en la ficha | Snippet `brenson-tier-price` calcula el precio con el % del tier del cliente logueado (display) | La Function garantiza que lo mostrado sea lo cobrado |
| Cotizador de flota + PDF | Página `/pages/cotizador` con Alpine; `POST /quote` → PDFMonkey → guarda metaobject `cotizacion_b2b` → email cliente + asesor | Historial visible en cuenta del cliente vía metaobject + en Admin (Módulo 12) |

Si el volumen B2B crece, migrar a Shopify B2B (Plus) es una evolución natural: catálogos, price lists y company accounts reemplazan tags/metafields sin rehacer el frontend.

### 2.6 Decisión técnica: simulador financiero

- Parámetros en metaobject `parametros_financiacion` (entrada única): tasa mensual (%), plazos disponibles, cuotas iniciales disponibles, disclaimer legal.
- Fórmula de cuota fija (sistema francés): `cuota = P · i / (1 − (1 + i)^−n)` donde `P = precio − inicial`, `i = tasa mensual`, `n = plazo`.
- Web Component `<brenson-simulator>` sin dependencias; lee parámetros desde `<script type="application/json">` emitido por Liquid; formatea con `Intl.NumberFormat('es-CO', { currency: 'COP' })`.
- Precio de la ficha muestra **"Desde $X/mes"** calculado en Liquid (plazo máximo, inicial 0 %) para que aparezca sin JS y esté disponible para el primer render.
- Evento `brenson_simulator_use` al dataLayer y, en el CTA, prellenado del lead con `vehiculo`, `plazo`, `inicial`, `cuota`.

---

## 3. Arquitectura de datos: metafields y metaobjects

Convención: namespace `brenson` (producto), `brenson_b2b` (cliente), metaobjects con prefijo `brenson_`. Todos con definición en Admin (Settings → Custom data) y **acceso Storefront habilitado** solo donde se lee desde Liquid.

### 3.1 Metafields de producto (`brenson.*`)

| Key | Tipo | Ejemplo | Usado por |
|---|---|---|---|
| `categoria` | `single_line_text_field` (lista de valores: bicicleta, ciclomotor, motocarro, cuadriciclo) | `motocarro` | Facetas, grid de categorías, JSON-LD |
| `uso` | `list.single_line_text_field` (personal, comercial, logistica) | `[comercial, logistica]` | Facetas |
| `autonomia_km` | `number_integer` | `80` | Specs, facetas (rango), badge |
| `velocidad_max_kmh` | `number_integer` | `45` | Specs, facetas |
| `capacidad_carga_kg` | `number_integer` | `500` | Specs, facetas |
| `potencia_motor_w` | `number_integer` | `3000` | Specs |
| `bateria_tipo` | `single_line_text_field` | `Litio LiFePO4` | Specs |
| `bateria_capacidad` | `single_line_text_field` | `72V 100Ah` | Specs |
| `tiempo_carga_h` | `number_decimal` | `6.5` | Specs |
| `peso_kg` | `number_decimal` | `320` | Specs |
| `pasajeros` | `number_integer` | `1` | Specs |
| `requiere_licencia` | `boolean` | `true` | Specs, FAQ |
| `requiere_soat` | `boolean` | `true` | Specs, FAQ |
| `specs_adicionales` | `json` | `[{"label":"Frenos","value":"Disco hidráulico"}]` | Tabla de specs (filas libres) |
| `garantia_meses` | `number_integer` | `12` | Módulo confianza |
| `garantia_bateria_meses` | `number_integer` | `24` | Módulo confianza |
| `garantia_terminos` | `rich_text_field` | — | Acordeón garantía |
| `certificacion` | `metaobject_reference` → `brenson_certificacion` | — | Badge + checklist |
| `certificado` | `boolean` | `true` | Badge "Certificado Brenson" |
| `badge` | `single_line_text_field` (mas_vendido, nuevo, financiacion, flota) | `mas_vendido` | Cards de catálogo |
| `video_url` | `url` | YouTube/Vimeo | Galería |
| `ficha_tecnica_pdf` | `file_reference` | PDF | Exit intent, descarga en ficha |
| `faq` | `list.metaobject_reference` → `brenson_faq` | — | FAQ por producto |
| `financiable` | `boolean` | `true` | Muestra/oculta simulador |
| `cuota_desde_override` | `money` | — | Si Brenson quiere fijar manualmente la cuota "desde" |
| `b2b_disponible` | `boolean` | `true` | Aparece en catálogo corporativo |
| `b2b_minimo_unidades` | `number_integer` | `5` | Cotizador |
| `b2b_precio_tier` | `json` | `{"tier_1":0,"tier_2":8,"tier_3":12}` (% dto. por tier; opcional, si difiere del tier global) | Snippet tier price + Function |
| `casos_uso` | `list.metaobject_reference` → `brenson_caso_uso` | Parque Tayrona | Ficha, homepage |
| `seo_title` / `seo_description` | ya nativos en Shopify | — | Módulo SEO |

Metafields de **colección** (`brenson.*`): `descripcion_larga` (rich_text), `imagen_hero` (file), `icono` (file), `faq` (list.metaobject_reference), `seo.hidden` (boolean, para la colección B2B).

### 3.2 Metafields de cliente (`brenson_b2b.*`)

| Key | Tipo | Notas |
|---|---|---|
| `tipo_cliente` | `single_line_text_field` (personal, empresa) | Se fija en registro |
| `nit` | `single_line_text_field` | Validación de dígito de verificación en cliente y en Flow |
| `razon_social` | `single_line_text_field` | |
| `sector` | `single_line_text_field` (logistica, turismo, delivery, gobierno, otro) | |
| `flota_estimada` | `number_integer` | Para scoring |
| `tier` | `metaobject_reference` → `brenson_tier_b2b` | Lo asigna Brenson al aprobar |
| `asesor` | `metaobject_reference` → `brenson_asesor` | Asesor B2B dedicado |
| `estado_b2b` | `single_line_text_field` (pendiente, aprobado, rechazado, suspendido) | Espejo del tag, útil para reporting |
| `fecha_aprobacion` | `date` | |
| `ghl_contact_id` | `single_line_text_field` | Idempotencia de sincronización con GHL |

Tags de cliente usados como **control de acceso**: `b2b-pendiente`, `cliente-corporativo`. El metafield `estado_b2b` es informativo; el gating lee el tag.

### 3.3 Metaobjects

| Metaobject | Campos | Uso |
|---|---|---|
| `brenson_parametros_financiacion` (entrada única) | `tasa_mensual` (decimal), `plazos` (list int: 12,24,36,48), `iniciales_pct` (list int: 0,10,20,30), `plazo_default`, `inicial_default`, `disclaimer` (rich_text), `aliados_financieros` (list file) | Simulador (Módulo 05), editable sin código (Módulo 12) |
| `brenson_tier_b2b` | `nombre`, `codigo` (tier_1/2/3), `descuento_pct`, `minimo_unidades`, `descripcion`, `beneficios` (rich_text) | Precios por volumen; la Function lee `codigo` y `descuento_pct` |
| `brenson_asesor` | `nombre`, `foto`, `cargo`, `whatsapp`, `email`, `canal` (b2c/b2b/servicio/garantias), `horario` | Módulo 10 (multi-agente) y Módulo 08 |
| `brenson_certificacion` | `nombre`, `checklist` (list text), `descripcion`, `sello` (file), `puntos_inspeccion` (int) | Módulo 06 |
| `brenson_faq` | `pregunta`, `respuesta` (rich_text), `categoria` | Ficha, páginas |
| `brenson_aliado` | `nombre`, `logo`, `url`, `tipo` (cliente/financiero/institucional) | Homepage, confianza |
| `brenson_testimonio` | `nombre`, `empresa`, `ciudad`, `texto`, `foto`, `vehiculo` (product_reference), `verificado` (boolean) | Homepage/ficha. **Solo testimonios reales** |
| `brenson_caso_uso` | `titulo`, `cliente`, `resumen`, `imagen`, `vehiculos` (list product_reference), `metricas` (json) | Homepage, ficha |
| `brenson_contador` | `label`, `valor`, `sufijo`, `icono` | Módulo 06 (contador animado, valores reales) |
| `brenson_cotizacion_b2b` | `numero`, `cliente` (customer_reference), `items` (json), `subtotal`, `descuento_pct`, `total`, `validez_dias`, `estado`, `pdf` (file/url), `asesor`, `creada_en` | Historial B2B y gestión en Admin (Módulo 12) |
| `brenson_horario_atencion` (única) | `dias`, `apertura`, `cierre`, `zona_horaria`, `mensaje_fuera_horario` | Módulo 10 |

### 3.4 Metafields de tienda (`shop.metafields.brenson.*`)

`whatsapp_principal`, `whatsapp_b2b`, `whatsapp_servicio`, `email_ventas`, `email_b2b`, `nit_brenson`, `direccion`, `redes` (json). Alternativa: settings del tema. Se prefieren metafields de tienda para que también los lea `brenson-services`.

### 3.5 Facetas a configurar en Search & Discovery

Precio · Disponibilidad · `brenson.categoria` · `brenson.uso` · `brenson.autonomia_km` (rango) · `brenson.velocidad_max_kmh` (rango) · `brenson.capacidad_carga_kg` (rango) · `brenson.financiable` · `brenson.requiere_licencia`.

---

## 4. Plan de trabajo por fases (1 a 6) y sprints

Cronograma: 16 semanas, 8 sprints de 2 semanas. Las fases se solapan según la propuesta (Fase 3 arranca en semana 6, Fase 4 en semana 9).

```
Sem  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
F1   ████
F2         ██████████████
F3                  ██████████████
F4                           ████████████
F5                                 ████████████
F6                                       ████████████
Spr  [S1 ][S2 ][S3 ][S4 ][S5 ][S6 ][S7 ][S8 ]
                  ▲ MVP B2C (sem 8)                ▲ Lanzamiento
```

---

### FASE 1 — Auditoría, arquitectura y UX (Semanas 1–2 · Sprint 1)

**Objetivo:** cerrar todas las definiciones para que el frontend arranque sin bloqueos.

| # | Tarea | Entregable / archivo | Responsable | Dependencia |
|---|---|---|---|---|
| 1.1 | Presentar esta auditoría y aprobar decisión "rehacer sobre Dawn" | Este documento firmado | PM + Brenson | — |
| 1.2 | Workshop B2B: tiers, descuentos, mínimos, proceso de aprobación, asesores | Acta + valores de `brenson_tier_b2b` | PM + Brenson | — |
| 1.3 | Workshop financiación: tasa, plazos, iniciales, aliado financiero, disclaimer | Valores de `brenson_parametros_financiacion` | PM + Brenson | — |
| 1.4 | Checklist de contenidos (fotos por ángulo, video, specs, PDF ficha técnica por SKU) | `docs/CHECKLIST_CONTENIDOS.md` | PM | — |
| 1.5 | Auditoría de apps instaladas: decidir 1 app de reviews (Junip), eliminar Ryviu/A2Reviews/AliExpress reviews/GemPages/quantity offers | `docs/APPS.md` | Dev Shopify | Acceso Admin |
| 1.6 | Crear definiciones de metafields y metaobjects (§3) en tienda de desarrollo | Admin → Custom data; export `docs/METAFIELDS.md` | Dev Shopify | 1.2, 1.3 |
| 1.7 | Configurar facetas en Search & Discovery | Admin | Dev Shopify | 1.6 |
| 1.8 | Sistema de diseño a partir del manual de marca: tokens, tipografía, componentes (badge, card, spec-row, CTA) | Design system en Stitch + `assets/brenson-tokens.css` (borrador) | Dev Shopify | Manual de marca |
| 1.9 | Pantallas de alta fidelidad generadas con **Stitch** (desktop + mobile): home, colección, ficha, simulador, login/registro, portal Empresas, cotizador. Aprobación de Brenson antes de codificar | Proyecto Stitch + exportación HTML/CSS de referencia | Dev Shopify | 1.8 |
| 1.10 | Setup técnico: repo Git, Shopify CLI, tema Dawn limpio como `brenson-theme`, GitHub → tema de desarrollo, Theme Check, Prettier Liquid | Repo + CI (lint) | Dev Shopify | — |
| 1.11 | Setup `brenson-services` (Cloudflare Workers o Vercel) y app custom `brenson-b2b-functions` (esqueleto) | Repos + entornos | Dev Shopify | — |
| 1.12 | Plan de migración de datos: mapeo productos actuales → categorías, colecciones nuevas, redirecciones 301 | `docs/MIGRACION.md` | Dev + SEO | — |
| 1.13 | Confirmar cuentas de cliente **clásicas** en la tienda | Admin → Checkout | Dev | — |

**Criterio de salida:** metafields creados, Figma aprobado, tiers y tasa definidos, repo con Dawn desplegado como tema no publicado, 80 % de assets de contenido recibidos.

---

### FASE 2 — Frontend y tema custom (Semanas 3–7 · Sprints 2, 3 y mitad del 4)

**Objetivo:** todas las páginas B2C implementadas; UI del portal B2B lista.

#### Sprint 2 (Sem 3–4) — Fundaciones + Homepage + Catálogo

| Módulo | Tarea | Archivos a crear / modificar |
|---|---|---|
| Base | Tokens y componentes CSS; `es.default.json`; ajustes de `theme.liquid` (preloads, GTM placeholder, dataLayer base) | `assets/brenson-tokens.css`, `assets/brenson-components.css`, `locales/es.default.json`, `layout/theme.liquid`, `snippets/brenson-datalayer.liquid` |
| Base | Header: menú por categorías, CTA WhatsApp, enlace "Empresas" a `/pages/empresas`, login | `sections/header.liquid` (Dawn, ajustes), `snippets/brenson-whatsapp-link.liquid` |
| Base | Footer: datos Brenson (reemplaza VMFULLSTORE), menús, redes, newsletter (Klaviyo) | `sections/footer.liquid`, `config/settings_data.json` |
| M01 | Hero con video/imagen + búsqueda por categoría | `sections/brenson-hero.liquid` |
| M01 | Grid de categorías (bicicletas, ciclomotores, motocarros, cuadriciclos) leyendo metafield de colección | `sections/brenson-category-grid.liquid` |
| M01/M06 | Barra de confianza (certificación, garantía, envíos) | `sections/brenson-trust-bar.liquid`, `blocks/brenson-trust-badge.liquid` |
| M01 | Banner financiación con "desde $X/mes" del producto destacado | `sections/brenson-financing-banner.liquid`, `snippets/brenson-price.liquid` |
| M01 | Testimonios y casos de uso desde metaobjects | `sections/brenson-testimonials.liquid`, `sections/brenson-case-studies.liquid` |
| M01 | Aliados y contadores (valores reales desde metaobjects) | `sections/brenson-partners.liquid`, `sections/brenson-counters.liquid` |
| M01 | Ensamblar homepage | `templates/index.json` |
| M02 | Card de producto: imagen, badge, precio contado + "desde $/mes", specs clave (autonomía, velocidad), CTA vista rápida | `snippets/card-product.liquid` (Dawn, extender), `snippets/brenson-badge.liquid` |
| M02 | Grid/lista switchable, ordenamiento, paginación con "cargar más" | `sections/main-collection-product-grid.liquid` (Dawn, extender), `assets/brenson-facets.js` |
| M02 | Vista rápida (modal con Section Rendering API) | `sections/brenson-quick-view.liquid`, `assets/brenson-quick-view.js` |
| M03 | Facetas: metafields como filtros, rango de precio con slider doble, chips activos, conteo, limpiar | `sections/main-collection-product-grid.liquid`, `snippets/facets.liquid` (Dawn, extender), `assets/brenson-facets.js` |
| M03 | Filtros persistentes en URL + canonical en páginas filtradas | `snippets/facets.liquid`, `layout/theme.liquid` |
| M02 | Ensamblar colección | `templates/collection.json`, `templates/list-collections.json` |

#### Sprint 3 (Sem 5–6) — Ficha de vehículo + Simulador + Confianza + WhatsApp

| Módulo | Tarea | Archivos a crear / modificar |
|---|---|---|
| M04 | Galería swipeable con video embed y zoom | `sections/main-product.liquid` (Dawn, extender), `snippets/product-media-gallery.liquid` |
| M04 | Bloque de precio: contado vs financiado lado a lado | `blocks/brenson-price-financed.liquid`, `snippets/brenson-price.liquid` |
| M04 | Specs estructuradas desde metafields + filas libres JSON | `sections/brenson-product-specs.liquid`, `snippets/brenson-spec-table.liquid`, `blocks/brenson-spec-row.liquid` |
| M04 | CTA primario WhatsApp precargado con modelo; CTA secundario "Solicitar cotización" | `blocks/brenson-cta-whatsapp.liquid`, `sections/brenson-lead-form.liquid` |
| M04 | FAQ por producto (metaobjects) y productos relacionados | `sections/brenson-product-faq.liquid`, `sections/related-products.liquid` (Dawn) |
| M04 | Sticky bar mobile (precio + cuota + WhatsApp) en thumb-zone | `sections/brenson-sticky-cta.liquid`, `assets/brenson-sticky-cta.js` |
| M05 | Web Component simulador: inicial (0/10/20/30 %), plazo (12/24/36/48), cuota en COP, disclaimer, CTA "Solicitar financiamiento" | `sections/brenson-simulator.liquid`, `assets/brenson-simulator.js` |
| M05 | Parámetros desde metaobject `brenson_parametros_financiacion` | `snippets/brenson-financing-params.liquid` |
| M05 | Página `/pages/financiacion` con simulador genérico + aliados financieros | `templates/page.financiacion.json` |
| M06 | Badge "Certificado Brenson" + checklist expandible | `sections/brenson-product-certification.liquid` |
| M06 | Garantía expandible con términos + garantía de batería | `sections/brenson-product-warranty.liquid`, `templates/page.garantia.json` |
| M06 | Badge envíos a toda Colombia con tiempos por región (settings) | `snippets/brenson-shipping-badge.liquid` |
| M10 | Botón flotante WhatsApp con mensaje dinámico por página y estado horario | `sections/brenson-whatsapp-float.liquid`, `assets/brenson-whatsapp.js`, `snippets/brenson-whatsapp-link.liquid` |
| M10 | Selector de agente (B2C / B2B / servicio / garantías) desde `brenson_asesor` | `sections/brenson-whatsapp-float.liquid` |
| M17 | Revisión mobile de todo lo construido (thumb-zone, sliders táctiles) | Transversal |

#### Sprint 4, primera mitad (Sem 7) — Portal B2B (UI) y cuentas

| Módulo | Tarea | Archivos a crear / modificar |
|---|---|---|
| M07 | ~~Login/registro rediseñados en el tema~~ **Cuentas nuevas (A2, 18/09/2026)**: el login es la pantalla alojada de Shopify (enlace `/customer_authentication/login?return_to=…`, sin contraseña) y el alta corporativa la hace el worker con Admin API, escribiendo metafields `brenson_b2b.*` + tag `b2b-pendiente` | `sections/brenson-b2b-request-access.liquid`, `assets/brenson-register.js`, `brenson-services/src/index.ts` (`POST /b2b/request`) |
| M07 | Dashboard cliente: pedidos, garantías por unidad (metafield de line item/pedido), facturas | `templates/customers/account.json`, `sections/main-account.liquid`, `sections/brenson-account-warranties.liquid` |
| M08 | Guard de acceso `/pages/empresas` (server-side por tag) + estados: sin sesión, pendiente, aprobado | `sections/brenson-b2b-gate.liquid`, `snippets/brenson-b2b-guard.liquid`, `layout/theme.empresas.liquid`, `templates/page.empresas.json` |
| M08 | Solicitud de acceso corporativo | `templates/page.empresas-acceso.json`, `sections/brenson-b2b-request-access.liquid` |
| M08 | Dashboard B2B: asesor asignado, tier, accesos rápidos | `sections/brenson-b2b-dashboard.liquid`, `sections/brenson-b2b-advisor.liquid` |
| M08 | Catálogo corporativo: colección `empresas` con precios por tier (display) y mínimos | `templates/collection.empresas.json`, `sections/brenson-b2b-catalog.liquid`, `snippets/brenson-tier-price.liquid` |
| M08 | Cotizador de flota (UI): selección múltiple, cantidades, resumen, botón "Generar PDF" (mock hasta Fase 3) | `templates/page.cotizador.json`, `sections/brenson-b2b-quoter.liquid`, `assets/brenson-b2b-quoter.js`, `assets/alpine.min.js` |
| M08 | Historial de cotizaciones (UI) | `sections/brenson-b2b-quotes-history.liquid` |
| M09 | Formulario de contacto con vehículo precargado; formulario de prueba de manejo con fecha | `sections/brenson-lead-form.liquid`, `sections/brenson-test-drive-form.liquid`, `assets/brenson-lead-form.js`, `templates/page.contacto.json` |
| M09 | Exit intent con descarga de ficha técnica PDF | `sections/brenson-exit-intent.liquid`, `assets/brenson-exit-intent.js` |

**Hito MVP B2C (fin de semana 8):** homepage, catálogo con facetas, fichas, simulador, confianza, WhatsApp y GA4 básico operativos en tema de staging.

---

### FASE 3 — Backend, lógica B2B y metafields (Semanas 6–10 · Sprints 3 a 5, en paralelo)

**Objetivo:** que el portal B2B sea funcional y seguro, y que cada lead llegue a GHL.

| # | Tarea | Artefacto | Dependencia |
|---|---|---|---|
| 3.1 | Carga completa de metafields en todos los productos (CSV/Matrixify o Admin API) | Script `scripts/import-metafields.mjs` + CSV de Brenson | Checklist de contenidos |
| 3.2 | Colecciones automáticas por categoría (`brenson.categoria`) y colección `empresas` (`b2b_disponible = true`) | Admin | 3.1 |
| 3.3 | Shopify Flow #1: *Customer created* con tag `b2b-pendiente` → email interno + webhook a `brenson-services` | Flow | — |
| 3.4 | Shopify Flow #2: *Tag added* `cliente-corporativo` → set `estado_b2b=aprobado`, `fecha_aprobacion` → webhook → Klaviyo bienvenida B2B | Flow | — |
| 3.5 | App custom `brenson-b2b-functions`: Function *Product Discount* por tier × cantidad, con metafield de tier y umbrales 10/20/50 | `extensions/tier-discount/src/run.js` (o Rust), `shopify.app.toml` | Tiers definidos |
| 3.6 | Activar la Function como descuento automático; pruebas con clientes de cada tier | Admin → Descuentos | 3.5 |
| 3.7 | `brenson-services` `POST /lead`: validación, Cloudflare Turnstile, rate limit por IP, normalización → GHL webhook + payload de scoring (`fuente`, `vehiculo`, `accion`) | `services/src/routes/lead.ts` | GHL webhook URL |
| 3.8 | `brenson-services` `POST /quote`: valida sesión (customer id + token firmado emitido por Liquid), calcula con tier, PDFMonkey, guarda metaobject `brenson_cotizacion_b2b` vía Admin API, email a cliente y asesor (Resend/SendGrid), notifica GHL (+50 pts) | `services/src/routes/quote.ts`, plantilla PDFMonkey | 3.5, PDFMonkey |
| 3.9 | `brenson-services` `POST /webhooks/shopify/*`: verificación HMAC, `customers/create`, `customers/update`, `checkouts/create` (abandono), `orders/create` → GHL | `services/src/routes/webhooks.ts` | — |
| 3.10 | Conectar cotizador (UI Sprint 4) al endpoint real; historial lee metaobjects filtrados por `customer.id` | `assets/brenson-b2b-quoter.js`, `sections/brenson-b2b-quotes-history.liquid` | 3.8 |
| 3.11 | Retry + timeout + fallback por email si PDFMonkey falla (Riesgo 04) | `services/src/lib/pdf.ts` | 3.8 |
| 3.12 | Pruebas de seguridad del portal: acceso sin sesión, con tag incorrecto, manipulación de cantidades/tier desde cliente | Informe QA | 3.6, 3.10 |

---

### FASE 4 — Integraciones externas (Semanas 9–12 · Sprints 5 y 6)

| Módulo | Tarea | Artefacto |
|---|---|---|
| M15 | GTM como capa única; contenedor con GA4 y Meta Pixel | `layout/theme.liquid` (snippet GTM), `snippets/brenson-datalayer.liquid` |
| M15 | Eventos custom al dataLayer: `view_item` enriquecido (categoría, autonomía), `brenson_simulator_use`, `brenson_whatsapp_click` (agente, página), `brenson_lead_submit` (tipo), `brenson_b2b_login`, `brenson_quote_pdf`, `brenson_quick_view`, `brenson_filter_apply` | `assets/brenson-analytics.js` |
| M15 | Meta Pixel estándar (ViewContent, AddToCart, Lead) vía GTM; **Conversions API** vía canal Facebook & Instagram de Shopify (server-side sin código) | GTM + Admin |
| M15 | Banner de consentimiento (Ley 1581) con Consent Mode v2 de Google; Customer Privacy API de Shopify | `sections/brenson-consent-banner.liquid`, `assets/brenson-consent.js` |
| M15 | Dashboard KPIs en Looker Studio conectado a GA4 | Looker |
| M11 | GHL: pipeline Nuevo → Contactado → Demo → Cotización → Cerrado/Perdido; campos custom (vehículo, fuente, score, tier) | GHL |
| M11 | GHL: automatizaciones 2h/24h/72h; lead scoring (+10/+20/+30/+40/+50); alerta score > 60 | GHL |
| M11 | Mapeo de payloads `brenson-services` → GHL (contact upsert por email/teléfono con `ghl_contact_id`) | `services/src/lib/ghl.ts` |
| M10 | WhatsApp Business: respuestas fuera de horario, plantillas por agente | WhatsApp Business / GHL |
| M16 | Klaviyo: instalación, formulario newsletter footer, flows *abandoned cart*, *post-purchase*, *bienvenida B2B*, *lead frío > 7 días* (sincronizado con GHL para evitar doble contacto) | Klaviyo + `sections/footer.liquid` |
| M16 | Catálogo dinámico Meta (canal Facebook & Instagram) + audiencias (ficha sin compra, carrito abandonado, simulador sin lead) | Meta Commerce Manager |
| Reviews | Junip: instalación, app block en ficha y home, importación de reseñas reales | `templates/product.json` (app block) |

---

### FASE 5 — SEO, performance y contenido (Semanas 11–14 · Sprints 6 y 7)

| Módulo | Tarea | Artefacto |
|---|---|---|
| M13 | JSON-LD `Product`/`Offer` con specs (`additionalProperty`), `Organization`, `BreadcrumbList`, `FAQPage` | `snippets/brenson-json-ld-product.liquid`, `snippets/brenson-json-ld-org.liquid`, `snippets/brenson-json-ld-faq.liquid` |
| M13 | Metafields SEO por producto/colección; OG tags; canonical en facetas; `noindex` en colección B2B y páginas de cuenta | `snippets/meta-tags.liquid` (Dawn, extender) |
| M13 | Redirecciones 301 desde URLs actuales (`/collections/mas-vendidos`, handles antiguos) | Admin → URL redirects (CSV) |
| M13 | Blog: plantilla editorial, 5–8 artículos (motocarro eléctrico Colombia, licencia para ciclomotores, etc.) | `templates/article.json`, `templates/blog.json`, `sections/main-article.liquid` |
| M13 | Sitemap y Google Search Console | GSC |
| M14 | Presupuesto de performance: JS total < 120 KB, CSS crítico inline, `fetchpriority=high` en LCP, `srcset`/WebP/AVIF, lazy load, `preconnect` mínimo | `layout/theme.liquid`, todas las secciones |
| M14 | Alpine y cotizador solo en layout corporativo; simulador como módulo diferido | `layout/theme.empresas.liquid` |
| M14 | Eliminar apps residuales de la tienda (Ryviu, A2Reviews, GemPages, Quantity Offers, AddZap) y sus scripts de canal | Admin → Apps |
| M14 | Medición en Android gama media (Moto G / Samsung A) con 4G: objetivo LCP < 2.5 s, INP < 200 ms, CLS < 0.1 | Informe Lighthouse + WebPageTest |
| M17 | Ajustes mobile finales sobre datos reales | Transversal |

---

### FASE 6 — QA, testing y lanzamiento (Semanas 13–16 · Sprints 7 y 8)

| # | Tarea | Entregable |
|---|---|---|
| 6.1 | Test funcional por módulo con matriz de casos (`docs/QA_MATRIZ.md`) | Informe |
| 6.2 | Flujo B2B end-to-end: registro → Flow → aprobación → login → catálogo con tier → cotización → PDF → email → GHL → historial | Video + informe |
| 6.3 | Flujo B2C end-to-end: Meta Ad → ficha → simulador → WhatsApp / lead → GHL → seguimiento | Informe |
| 6.4 | Cross-browser (Chrome, Safari, Firefox, Samsung Internet) y dispositivos (iOS/Android) | Informe |
| 6.5 | Seguridad: HMAC webhooks, rate limit, Turnstile, gating B2B, Function de descuento, headers | Informe |
| 6.6 | Theme Check sin errores; Lighthouse CI en pipeline | CI verde |
| 6.7 | Migración: importación final de metafields, redirecciones, publicación del tema, DNS sin cambios | Checklist de go-live |
| 6.8 | Capacitación al equipo Brenson: editor de tema, metafields, aprobación B2B, cotizaciones, simulador, blog. Videos cortos por tarea | `docs/MANUAL_ADMIN.md` + videos |
| 6.9 | Monitoreo 7 días: errores JS (Sentry ligero), GA4 en tiempo real, GHL, PDFMonkey | Informe post-lanzamiento |
| 6.10 | Documentación técnica final: arquitectura, metafields, endpoints, Flows, runbook | `docs/` |

---

## 5. Matriz módulo → fase → archivos clave

| Módulo | Fase / Sprint | Archivos clave | Depende de |
|---|---|---|---|
| 01 Homepage | F2 · S2 | `templates/index.json`, `sections/brenson-hero`, `-category-grid`, `-trust-bar`, `-financing-banner`, `-testimonials`, `-partners`, `-counters` | Figma, metaobjects |
| 02 Catálogo | F2 · S2 | `templates/collection.json`, `main-collection-product-grid`, `card-product`, `brenson-quick-view` | Metafields, colecciones |
| 03 Filtros | F2 · S2 | `snippets/facets.liquid`, `assets/brenson-facets.js`, Search & Discovery | Metafields cargados |
| 04 Ficha | F2 · S3 | `templates/product.json`, `main-product`, `brenson-product-specs`, `-faq`, `-sticky-cta`, `blocks/brenson-*` | Metafields, M05, M06 |
| 05 Simulador | F2 · S3 | `sections/brenson-simulator`, `assets/brenson-simulator.js`, metaobject financiación | Workshop financiación |
| 06 Confianza | F2 · S2–S3 | `brenson-product-certification`, `-warranty`, `-trust-bar`, `-counters`, `-partners` | Metaobjects |
| 07 Autenticación | F2 · S4 / F3 | `templates/customers/*.json`, `main-register`, `main-account`, Flows #1 y #2 | Cuentas clásicas |
| 08 Portal B2B | F2 · S4 (UI) / F3 · S4–S5 (lógica) | `page.empresas.json`, `brenson-b2b-*`, `collection.empresas.json`, `theme.empresas.liquid`, Function, `/quote` | M07, tiers, PDFMonkey |
| 09 Leads | F2 · S4 / F3 | `brenson-lead-form`, `-test-drive-form`, `-exit-intent`, `/lead` | GHL |
| 10 WhatsApp | F2 · S3 | `brenson-whatsapp-float`, `brenson-whatsapp-link`, metaobjects asesor/horario | Números confirmados |
| 11 CRM GHL | F3–F4 · S5–S6 | `services/src/lib/ghl.ts`, `/webhooks/shopify/*`, pipelines GHL | Acceso GHL |
| 12 Admin extendido | Transversal (metaobjects + editor) · S6 | Definiciones Custom data, `settings_schema.json`, `docs/MANUAL_ADMIN.md` | Todos |
| 13 SEO | F5 · S6–S7 | `brenson-json-ld-*`, `meta-tags`, redirecciones, blog | Contenido |
| 14 Performance | F5 · S7 | `layout/theme.liquid`, presupuesto JS/CSS | Diseño final |
| 15 Analytics | F4 · S5 | GTM, `brenson-datalayer`, `brenson-analytics.js`, consentimiento | M05, M08 |
| 16 Remarketing | F4 · S6 | Klaviyo, Meta catálogo, flows GHL | M15 |
| 17 Mobile UX | Transversal · cada sprint | Todas las secciones | — |
| 18 Seguridad | F3 · S5 + F6 | Gating Liquid, Function, HMAC, Turnstile, rate limit | M07, M08 |

---

## 6. Estrategia de entorno, Git y despliegue

| Elemento | Decisión |
|---|---|
| Repositorios | `brenson-theme` (tema), `brenson-services` (serverless), `brenson-b2b-functions` (app custom). Monorepo opcional si el equipo lo prefiere |
| Ramas | `main` = producción · `develop` = staging · `feature/M0X-nombre` por módulo |
| Tema ↔ Git | Integración GitHub de Shopify: `develop` → tema "Brenson Staging" (no publicado); `main` → tema "Brenson Live" |
| Local | Shopify CLI 3 (`shopify theme dev`) contra tienda de desarrollo con copia de productos |
| Calidad | Theme Check + Prettier (plugin Liquid) en pre-commit; Lighthouse CI en PR |
| Convenciones | Prefijo `brenson-` en todo archivo propio; secciones con `{% schema %}` traducido en `es.default.schema.json`; sin CSS/JS inline salvo critical CSS |
| Datos | Metafields exportables con Matrixify; definiciones documentadas en `docs/METAFIELDS.md` |
| Secretos | Variables de entorno en Cloudflare/Vercel; tokens Admin API con scopes mínimos (`read_customers`, `write_metaobjects`, `read_products`) |
| Rollback | Publicar tema anterior desde Admin (1 clic); versionado de metaobjects no destructivo |

---

## 7. Riesgos técnicos detectados en la auditoría (adicionales a §08 de la propuesta)

| # | Riesgo | Mitigación | Nivel |
|---|---|---|---|
| R-A1 | **Cuentas nuevas de cliente activas** impedirían personalizar login/registro y gating en Liquid | **Materializado el 18/09/2026** y resuelto sin volver a clásicas (Shopify ya no las ofrece). El gating en Liquid *sí* funciona con cuentas nuevas (`customer.tags` y `customer.metafields` siguen disponibles); solo se rehízo el login (pantalla alojada) y el alta (Admin API). Ver DECISIONES_BRENSON.md §Cuentas nuevas | ✅ Cerrado |
| R-A2 | La colección B2B es técnicamente accesible por URL aunque esté oculta del menú | Guard Liquid en `collection.empresas.json` (mismo snippet `brenson-b2b-guard`), `noindex`, y **la Function garantiza el precio** aunque alguien vea el listado | Alto |
| R-A3 | Descuento por tier calculado en cliente puede ser manipulado | Nunca confiar en el cliente: la Function recalcula en carrito/checkout; `/quote` recalcula server-side con Admin API | Alto |
| R-A4 | Apps residuales (Ryviu, A2Reviews, GemPages, etc.) siguen inyectando scripts vía canal aunque cambie el tema | Desinstalar en Fase 5 y auditar `content_for_header` | Medio |
| R-A5 | Pérdida de SEO por cambio de handles y colecciones (`mas-vendidos`, etc.) | Mapa 301 completo en Sprint 1; conservar handles de productos | Medio |
| R-A6 | Dos números de WhatsApp distintos en el tema actual | Confirmar número(s) oficiales en Sprint 1 | Bajo |
| R-A7 | Testimonios/contadores "reales" sin datos verificables | Brenson entrega fuentes (ventas, clientes, años); metaobjects marcan `verificado`; no se publica nada inventado | Medio |
| R-A8 | Shopify Flow no dispara si el registro se hace por checkout invitado | Registro B2B siempre por `/account/register` con campos obligatorios; checkout de invitado no crea B2B | Bajo |

---

## 8. Decisiones previas al Sprint 1 (RESUELTAS el 11-sep-2026, ver `DECISIONES_BRENSON.md`)

1. **Aprobar "rehacer sobre Dawn"** y descartar el tema EDrop (se conserva como respaldo no publicado).
2. **Tiers B2B**: cantidad de tiers, % de descuento, mínimos por tier, quién aprueba y en cuánto tiempo.
3. **Financiación**: tasa mensual de referencia, plazos, cuotas iniciales, aliado financiero y texto legal del disclaimer.
4. **WhatsApp**: número(s) oficiales por canal (B2C, B2B, servicio, garantías) y horario de atención.
5. **App de reviews única** (recomendación: Junip) y autorización para eliminar Ryviu, A2Reviews, AliExpress reviews, GemPages, Quantity Offers y las notificaciones de compra.
6. **Datos verificables** para contadores (vehículos vendidos, clientes, años) y testimonios reales con autorización de uso.
7. **Categorías definitivas** del catálogo y mapeo de productos actuales.
8. **Hosting serverless** (Cloudflare Workers o Vercel) y proveedor de email transaccional (Resend o SendGrid) para cotizaciones.
9. **Cuentas de cliente clásicas** en Shopify (verificar estado actual).
10. **Alcance MVP vs completo**: confirmar 16 semanas con B2B (recomendado en la propuesta) o 8 semanas B2C.

---

---

## 9. Anexo A — Cambios derivados de las decisiones del 11 de septiembre de 2026

Fuente: `DECISIONES_BRENSON.md`. Este anexo prevalece sobre el cuerpo del documento donde haya diferencia.

### A.1 Tareas nuevas en la Fase 1 (Sprint 1)

| # | Tarea | Entregable | Responsable | Límite |
|---|---|---|---|---|
| 1.14 | Producción de fotos (5 ángulos por vehículo, fondo neutro, 2000 px) y video del vehículo estrella para el hero | Assets en Shopify Files | Brenson (producción) + PM | Semana 5 |
| 1.15 | Levantamiento de specs con plantilla Excel entregada en semana 1 | Excel al 80 % | Brenson | Semana 5 |
| 1.16 | Workshop para diseñar el proceso real de **Certificación Brenson** (10 a 15 puntos de inspección) | Checklist operativo + metaobject `brenson_certificacion` | Brenson + PM | Semana 2 |
| 1.17 | Verificaciones técnicas: tipo de cuentas de cliente, plan Shopify, herramienta WhatsApp, lista de apps, pasarelas, app de facturación, estado de GoHighLevel, tráfico en Search Console | `docs/VERIFICACIONES_SPRINT1.md` | Dev Shopify | Semana 1 |
| 1.18 | Brenson crea organización GitHub y cuenta Cloudflare; DNS de Resend en brenson.co | Accesos | Brenson | Semana 1 |
| 1.19 | Diseño de las 7 pantallas clave en **Stitch** (desktop y mobile) y aprobación por Brenson. Reemplaza los wireframes Figma de 1.9 | Proyecto Stitch aprobado | Dev Shopify | Semana 2 |

### A.2 Cambios de alcance

| Decisión | Efecto |
|---|---|
| Sin accesorios ni repuestos | Se elimina `templates/product.accesorio.json` y el valor `accesorio` de `brenson.categoria`. |
| Portal en `/pages/empresas` ("Brenson Empresas") | Renombrados: `page.empresas.json`, `page.empresas-acceso.json`, `collection.empresas.json`, `layout/theme.empresas.liquid`. Las secciones `brenson-b2b-*` conservan el prefijo interno. El tag `cliente-corporativo` no cambia. |
| Registro B2B con adjunto (cámara de comercio o RUT) | Shopify no acepta archivos en `customer_register`. Se agrega `POST /upload` en `brenson-services` con Cloudflare R2 (PDF/JPG, máx. 5 MB, Turnstile) y el enlace firmado se guarda en `brenson_b2b.documento_url`. Registro en dos pasos: crear cuenta → subir documento. |
| Garantías por número de serie/chasis | Nuevo metaobject `brenson_unidad`: `serie`, `producto` (product_reference), `pedido`, `cliente` (customer_reference), `fecha_entrega`, `fin_garantia`, `estado` (activa, en_reclamo, vencida), `notas`. Los dashboards B2C y B2B listan las unidades del cliente. Brenson las registra al entregar. |
| Inglés para turismo | Fase 5 incorpora Shopify Markets (mercado internacional en inglés), app Translate & Adapt, traducción de secciones y metafields clave (specs, garantía, FAQ) y `hreflang`. Estimación: +1 semana de esfuerzo dentro del Sprint 7. La versión en inglés no incluye el portal Empresas ni el blog. |
| Prueba de manejo en sede y a domicilio | `brenson-test-drive-form` incluye selector de modalidad; a domicilio muestra solo ciudades cubiertas (settings). |
| Compra B2C secundaria | En la ficha el CTA primario es WhatsApp/cotización y "Comprar ahora" es secundario. El carrito de Dawn se conserva. |
| Tono mixto | `es.default.json` usa "tú" en secciones B2C y "usted" en todo lo que renderiza `theme.empresas.liquid` y en correos B2B. |
| Diseño con Stitch | El perfil "Diseñador UI/UX" de la propuesta pasa a rol de validación. El dev genera el design system y las pantallas en Stitch a partir del manual de marca. |

### A.3 Metafields y metaobjects adicionales

| Elemento | Definición |
|---|---|
| `brenson_b2b.documento_url` | `url`. Enlace firmado al documento cargado en R2. |
| `brenson_b2b.documento_tipo` | `single_line_text_field` (camara_comercio, rut). |
| `brenson_b2b.cargo_contacto` | `single_line_text_field`. |
| `brenson_unidad` | Metaobject descrito en A.2. |
| `brenson.exclusivo_flota` | `boolean` de producto. Visible solo en catálogo Empresas (complementa `b2b_disponible`). |
| `brenson.ciudad`, `brenson.uso_previsto` (cliente) | Registro B2C para segmentación en Klaviyo. |

### A.4 Riesgos adicionales

| # | Riesgo | Mitigación | Nivel |
|---|---|---|---|
| R-D1 | **Contenido cero**: no hay fotos, video ni specs documentadas. Bloquea ficha y hero. | Tareas 1.14 y 1.15 con límite semana 5. Si no llegan, el Sprint 3 se intercambia con el Sprint 4 (portal Empresas UI primero). Fichas se construyen con 2 vehículos piloto. | Crítico |
| R-D2 | **GoHighLevel no confirmado.** Sin CRM no hay Módulos 09, 11 ni 16 completos. | Verificación 1.17. Fallback: `brenson-services` guarda el lead como cliente Shopify con tags + email al asesor; GHL se conecta después sin cambiar el frontend. | Alto |
| R-D3 | Certificación Brenson inexistente: el badge sería una promesa vacía. | Workshop 1.16. Badge y checklist se activan solo cuando el proceso opere en bodega. | Alto |
| R-D4 | Garantía y disclaimer sin texto legal. | Abogado de Brenson entrega antes de semana 4. Mientras, placeholder marcado "borrador" en staging. | Medio |
| R-D5 | Subida de documentos: datos personales de empresas. | R2 privado, enlaces firmados con expiración, borrado tras aprobación o rechazo a 90 días, mención en política de datos. | Medio |
| R-D6 | Performance validada solo en emulación. | Se documenta la limitación; Lighthouse CI con throttling 4G y CPU 4x como mínimo obligatorio. | Medio |
| R-D7 | Inglés amplía alcance sin ampliar cronograma. | Se limita a home, catálogo, fichas, financiación y garantía. | Medio |
| R-D8 | Meta Pixel y catálogo dependen de una agencia externa. | Contacto de la agencia en semana 9; si no responde, Brenson crea Business Manager propio y agrega a la agencia como partner. | Bajo |

### A.5 Entregables de Brenson con fecha límite

Ver tabla "Entregables pendientes de Brenson" en `DECISIONES_BRENSON.md`. Los tres que condicionan el cronograma: manual de marca (semana 1), porcentajes de tier y tasa de financiación (semana 2), fotos y specs (semana 5).

---

*Fin del documento. Sprint 1 habilitado: tareas 1.1 a 1.19.*
