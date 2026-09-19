# AUDITORÍA BRENSON ECOSISTEMA — 18 de septiembre de 2026

Auditoría técnica, funcional y de completitud del ecosistema Brenson (`brenson-theme`, `brenson-services`, `brenson-b2b-functions`) contra los 18 módulos de `Propuesta desarrollo.pdf`. Metodología: lectura directa de código fuente (no de descripciones), ejecución de `scripts/check-mocks.mjs` y `npm test`, y contraste contra la documentación interna existente (`docs/ESTADO_GENERAL_18SEP2026.md`, `DECISIONES_BRENSON.md`, `ESTRATEGIA_SIMULACION.md`, `FLUJO_COTIZACION_A_PEDIDO.md`, `QA_MATRIZ.md`). Todo lo que requiere acceso en vivo a Shopify Admin, Cloudflare o GoHighLevel se marca **REQUIERE VALIDACIÓN EXTERNA** — no se inventó ningún dato de esas plataformas.

---

## 1. Resumen ejecutivo

**Cómo se calculó el %:** de los 18 módulos de la propuesta, se clasificó cada uno como Completo (funciona con datos reales o mock intercambiable sin tocar código) / Parcial (implementado pero con una pieza crítica faltante o sin desplegar) / Falta. 10/18 = 56 % completos en su lógica de código, con la salvedad de que **casi todos dependen de proveedores en modo mock/simulación** (ver §5), por lo que el "funciona" es real solo contra datos de prueba, no en producción.

| Categoría | Cantidad | Módulos |
|---|---|---|
| 🟢 Completo (código + integración real) | 3/18 | 01 Homepage, 02 Catálogo, 03 Filtros (vía Search & Discovery nativo) |
| 🟡 Parcial (código completo, proveedor en mock o pieza faltante) | 10/18 | 04 Ficha, 05 Simulador, 06 Confianza, 07 Autenticación, 08 B2B, 09 Leads, 10 WhatsApp, 15 Analytics, 17 Mobile, 18 Seguridad |
| 🔴 Bloqueado / no desplegado | 3/18 | 11 CRM (sin GHL), 13 SEO (sin datos legales/blog reales), 16 Remarketing (sin Meta Business Manager) |
| ⚫ No construido / fuera de alcance verificado | 2/18 | 12 Admin (parcial, ver módulo), 14 Performance (no medido, ver §10) |

**Bloqueantes P0 para producción:**
1. `brenson_modo_simulacion = true` en `settings_data.json` — el sitio está literalmente en modo demo hoy.
2. `STORAGE_PROVIDER = local` — la subida de documento B2B (paso 2 del registro corporativo) no persiste en ningún lado.
3. `MAIL_PROVIDER = console` — ninguna notificación (solicitud B2B, cotización, aceptación) llega a un correo real; muere en logs del Worker.
4. La Shopify Function de descuento por tier no está confirmada como desplegada (`REQUIERE VALIDACIÓN EXTERNA`, ver Módulo 08).
5. 0 webhooks Shopify → CRM configurados (`REQUIERE VALIDACIÓN EXTERNA`; según `ESTADO_GENERAL` verificado en 0 el 18-sep).

**Hallazgo transversal más importante:** la documentación interna del propio equipo (`FLUJO_COTIZACION_A_PEDIDO.md`) afirma "no existe ningún código que convierta una cotización en pedido" — pero el código actual de `brenson-services/src/index.ts` **ya tiene implementado** `POST /quotes/:numero/accept` con `draftOrderCreate` y precio congelado línea por línea (`brenson-services/src/lib/shopify.ts:157-171`). Es decir: el código avanzó más rápido que la documentación en el mismo día. Ver §13 "Falsos completados" — en este caso es lo inverso: **una funcionalidad real que la documentación interna todavía no refleja**, con riesgo de que el equipo la vuelva a "descubrir como pendiente" en la próxima sesión.

---

## 2. Arquitectura actual

Tres repositorios independientes en el mismo monorepo, sin build tool común:

```
brenson-theme/          Tema Shopify Liquid sobre base Dawn (96 sections, 52 snippets)
brenson-services/       Cloudflare Worker (Hono, TypeScript) — backend de leads, B2B, cotizaciones
brenson-b2b-functions/  Shopify Function (Rust/JS-Wasm) — descuento automático por tier B2B
```

- **Frontend**: Liquid + JS vanilla (`assets/brenson-*.js`), sin framework — consistente con el stack recomendado en la propuesta (§05, pág. 15).
- **Backend**: un único archivo de rutas (`index.ts`, 394 líneas) con capa de "proveedores intercambiables" (`providers.ts`) que aísla cada integración externa (CRM, mail, PDF, storage, financiamiento) detrás de una interfaz común y una variable de entorno. Es el patrón documentado en `ESTRATEGIA_SIMULACION.md` y se verificó que el código lo respeta.
- **Datos**: Shopify es la única base de datos (metafields de producto/cliente, metaobjects para cotizaciones/asesores/tiers/unidades). Cloudflare KV se usa como caché/cola (rate limiting, contador de cotizaciones, cache de token Addi) — no como fuente de verdad.
- **B2B**: control de acceso vía `customer.tags` + `customer.metafields`, evaluado **server-side en Liquid** (`snippets/brenson-b2b-guard.liquid`) más una Shopify Function para el descuento real en carrito/checkout — el patrón exacto que la propuesta recomienda para evitar depender de Shopify Plus (Riesgo 01, pág. 19).

---

## 3. Inventario de páginas

| Página | Ruta | Existe | Backend real | Estado |
|---|---|---|---|---|
| Homepage | `templates/index.json` | ✅ | Shopify nativo | 🟢 |
| Catálogo/colecciones | `templates/collection.json` | ✅ | Shopify + Search & Discovery | 🟢 |
| Ficha de producto | `templates/product.json` | ✅ | Shopify + metafields `brenson.*` | 🟡 (specs de 12/39 productos incompletas) |
| Cotizador B2C (financiación) | `page.financiacion.json` | ✅ | `brenson-simulator.js` client-side | 🟡 (disclaimer `[BORRADOR]`) |
| Prueba de manejo | vía `brenson-lead-form.liquid` | ✅ | `POST /lead` | 🟡 (mail=console) |
| Contacto | `page.contact.json` / `page.contacto.json` | ✅ (duplicado) | `POST /lead` | 🟡 |
| Garantía | `page.garantia.json` | ✅ | estático | ⚫ 4 marcadores `[BORRADOR]` sin resolver |
| Blog | `templates/blog.json`, `article.json` | ✅ | Shopify nativo | 🔴 contenido `mock-data/blog.json` con 7 `[VALIDAR]` y 1 `_mock:true` sin publicar como real |
| Cuenta (login/registro) | alojado por Shopify (cuentas nuevas) | ✅ | Shopify Customer Accounts | 🟢 nativo, sin Liquid propio desde el 18-sep |
| Empresas — landing sin sesión | `page.empresas.json` | ✅ | `brenson-b2b-guard` | 🟢 |
| Empresas — acceso/registro | `page.empresas-acceso.json` | ✅ | `POST /b2b/request` | 🟡 (paso 2 de documento no persiste, ver Módulo 08) |
| Empresas — dashboard | dentro de `page.empresas.json` vía guard | ✅ | Shopify Admin API (server-side desde el worker) | 🟡 |
| Empresas — catálogo B2B | `collection.empresas.json` | ✅ | metafields + Function | 🟠 descuento real no confirmado desplegado |
| Cotizador B2B | `page.cotizador.json` | ✅ | `POST /quote` | 🟢 código; 🟠 PDF real y email reales pendientes |
| Empresas — beneficios/proceso/flotas | `page.empresas-beneficios/proceso/flotas.json` | ✅ | estático/marketing | 🟢 |
| Admin (Shopify nativo) | Admin de la tienda | ✅ | N/A | 🟢 (ver Módulo 12 para qué se administra sin código) |

No existen páginas propias de checkout, carrito custom, FAQ standalone (vive dentro de la ficha) ni políticas/privacidad/términos como plantillas propias verificadas — **REQUIERE VALIDACIÓN EXTERNA** contra el Admin para confirmar cuáles páginas de Shopify (`pages`) existen hoy con contenido real vs. placeholder, ya que el contenido de texto de páginas vive en el Admin, no en el repo.

---

## 4. Auditoría de los 18 módulos

### Módulo 01 — Homepage 🟢
`templates/index.json` confirma el orden real de secciones: `brenson-hero` (con categorías) → `brenson-trust-bar` (certificado/garantía/envíos/financiación) → `brenson-category-grid` → `brenson-bestsellers` → `brenson-financing-banner` → `brenson-video-carousel` → `brenson-social-proof` (testimonios/aliados/contadores) → `brenson-empresas-cta` → `brenson-blog-preview`. Coincide con la decisión G3 salvo que no se ve una sección de "newsletter" independiente en este archivo (puede vivir en `footer-group.json`, no confirmado). Todo editable desde Admin (son bloques de sección estándar de Shopify). **Riesgo real**: los contadores y testimonios de `brenson-social-proof` dependen de metaobjects marcados `verificado: false`/`_mock` — ver Módulo 06.

### Módulo 02 — Catálogo 🟢
`templates/collection.json` existe; ordenamiento/badges se apoyan en metafields `brenson.*`. Sincronización de stock es nativa de Shopify (no hay caché propia que pueda desincronizarse). Sin código de infinite scroll/paginación propio verificado línea por línea — asumido estándar de Dawn. **NO VERIFICADO**: comportamiento con 0 resultados y estados de carga (requiere prueba en navegador).

### Módulo 03 — Filtros avanzados 🟢 (con matiz)
La propuesta pedía un sistema de filtros custom con Storefront API. Lo que existe es la app nativa **Search & Discovery** de Shopify, confirmada funcionando en `ESTADO_GENERAL` (18-sep) con captura real: categoría, uso, autonomía/velocidad/carga por tramo, financiable, requiere licencia. Es una solución más simple y más mantenible que la propuesta original, pero significa que el Módulo 03 **no se construyó como código propio** — es configuración de una app de Shopify. Diferencia real contra la propuesta, no necesariamente un defecto.

### Módulo 04 — Ficha de producto 🟡
`sections/main-product.liquid`, `brenson-product-specs.liquid`, `brenson-product-warranty.liquid` existen y siguen el orden aprobado en H1 (Galería/precio/CTAs → Simulador → Certificación → Specs → Garantía → Envíos → FAQ → Casos → Relacionados → Reseñas). JSON-LD confirmado en `snippets/brenson-json-ld.liquid`. **Bloqueante de contenido, no de código**: solo 12 de 39 productos activos tienen metafields `brenson.*` completos; 12 más tienen fotos pero no specs (`ESTADO_GENERAL §2`). `brenson-product-warranty.liquid` tiene 3 marcadores `[BORRADOR]` sin resolver — la garantía visible en la ficha de producto (el dato más citado como "elimina el miedo del comprador" en la propuesta, pág. 3) **hoy es un borrador**, no el texto legal final.

### Módulo 05 — Simulador financiero 🟡
Verificado matemáticamente: `cuotaMensual()` en `brenson-services/src/lib/quote.ts:12-19` implementa sistema francés estándar y tiene test unitario que pasa (`npm test`, 3/3 ok, incluyendo el caso "City 1500: 7.990.000, 10% inicial, 36 meses, 1,9% mensual ≈ 277.6k"). El comentario del código confirma que `brenson-simulator.js` y `brenson-price.liquid` usan **la misma fórmula**, evitando el patrón de "dos cálculos que pueden divergir". Sin embargo:
- `sections/brenson-simulator.liquid` tiene 2 marcadores `[BORRADOR]` — el disclaimer legal ("cuota estimada, sujeta a aprobación crediticia", decisión C4/riesgo 03 de la propuesta) no está en su redacción final.
- La tasa (1,9 % mensual) y el aliado financiero son valores de simulación pendientes de confirmación de Brenson (`ESTADO_GENERAL` punto 1 de la tabla de decisiones pendientes) — el simulador **calcula bien**, pero con un insumo no confirmado como real.
- Existe un patrón de bug ya corregido una vez (totales en $0 por `q.total.value.amount` no resolviendo en Liquid, `ESTADO_GENERAL` 2i) que queda **latente en el mismo archivo** (`brenson-price.liquid:45`, campo `cuota_desde_override`) — sin uso actual, pero listo para repetir el mismo bug si se llena ese metafield sin adaptar el snippet.

### Módulo 06 — Sistema de confianza 🟡
Metaobjects existen (`brenson_testimonio`, `brenson_caso_uso`, `brenson_asesor`, contadores) y el patrón `verificado: true/false` para ocultar contenido no autorizado en producción está implementado y confirmado (`ESTRATEGIA_SIMULACION.md`, "el tema oculta las que tengan verificado = false cuando el modo simulación está apagado"). Pero: contadores hoy son valores de ejemplo (250/120/6/18) sin `verificado: true`; el checklist de "Certificación Brenson" (12 puntos) está redactado pero **sin aprobación de Brenson** — el badge no debería estar en producción según la propia decisión B14 ("el badge no se publica hasta tener el proceso real"), y sin embargo el código ya lo renderiza condicionalmente por un flag booleano simple (`mf.certificado !== 'false'`), no por el estado del workshop. **Riesgo**: si alguien activa el metafield `certificado` sin que el proceso de inspección exista, el sitio publica una certificación que no se está ejecutando — violación de la propia decisión de negocio, no detectable por el código.

### Módulo 07 — Autenticación y cuentas 🟡
Esta es la sección con más deuda de documentación resuelta en el propio día de la auditoría: cuentas nuevas de Shopify confirmadas (sin contraseña, código al correo), plantillas legacy de cuentas clásicas eliminadas, guard reescrito. Verificado en el código: `brenson-b2b-guard.liquid` evalúa 5 estados server-side correctamente y ya no tiene el bug de `customer.note` (confirmado eliminado, línea 36 documenta por qué). **Pendiente sin resolver**: el compromiso del Módulo 07 de la propuesta ("dashboard: pedidos, garantías, facturas descargables") — no se verificó en este pase si el tema lista `customer.orders` en una página propia o si depende del portal alojado de Shopify (la propia `DECISIONES_BRENSON.md` lo deja como pregunta abierta). **NO VERIFICADO**.

### Módulo 08 — Portal B2B 🟡 (el módulo más crítico y el más avanzado a la vez)
Flujo completo verificado en código, paso a paso:

| Paso | Código que lo implementa | Estado |
|---|---|---|
| Registro con NIT | `sections/brenson-b2b-request-access.liquid` + `POST /b2b/request` | 🟢 valida email, NIT, rate limit post-validación (10/h), Turnstile opcional |
| Creación/conversión de cliente | `createCustomer`/`findCustomerByEmail` en `lib/shopify.ts` | 🟢 con try/catch y aviso al asesor si falla (502 controlado, no 500 crudo) |
| Metafields + tag pendiente | `setCustomerMetafields` en la misma llamada | 🟢 no depende de Shopify Flow |
| Subida de documento | `POST /upload` con token HMAC de 1h | 🟠 código correcto, pero `STORAGE_PROVIDER=local` (confirmado en `wrangler.toml`) → **el archivo no se guarda en ningún lado real hoy** |
| Aprobación manual | Shopify Admin (tag + metafield) | ✅ nativo, sin código propio necesario |
| Catálogo privado + precio por tier | `collection.empresas.json` + `brenson.b2b_precio_tier` | 🟢 display; el precio real depende de la Function |
| Cotizador de flota | `sections/brenson-b2b-quoter.liquid` + `POST /quote` | 🟢 recalcula server-side contra precios reales de Shopify (`computeQuote`) cuando hay token admin |
| PDF de cotización | `pdf.render()` | 🟠 `PDF_PROVIDER=html` → es HTML servido con URL `.pdf`, **no un PDF real** (confirmado en `providers.ts`) |
| Email al cliente y al asesor | `mail.send()` | 🔴 `MAIL_PROVIDER=console` → **no llega ningún correo real**, solo log del Worker |
| Aceptar cotización → pedido | `POST /quotes/:numero/accept` → `draftOrderCreate` | 🟢 **código completo y con test conceptual correcto** (precio congelado línea por línea, verificación de token+dueño+estado+vencimiento) — contradice `FLUJO_COTIZACION_A_PEDIDO.md` que lo da como inexistente; ver Resumen ejecutivo |
| Descuento real en carrito/checkout | Shopify Function `tier-discount` | 🟠 código correcto y con test unitario que pasa, pero el despliegue real (`automaticDiscountNodes`) **no se confirmó activo** — `REQUIERE VALIDACIÓN EXTERNA` |
| Registro de unidades por serie (garantías) | metaobject `brenson_unidad` | 🔴 sin campo `cliente_id` fiable — el dashboard usa `u.cliente.value.id` (customer_reference), el mismo patrón de bug ya corregido para cotizaciones pero **no replicado aquí** (documentado como pendiente 2e) |

**Conclusión del módulo**: es el más ambicioso y el que más código real tiene, pero **ninguna notificación llega a un humano** (mail=console) y **ningún documento se guarda** (storage=local) — en el estado actual, una empresa puede completar todo el flujo de registro y cotización sin que Brenson se entere de nada salvo que revise logs de Cloudflare manualmente.

### Módulo 09 — Captación de leads 🟡
`POST /lead` (`index.ts:36-67`) valida honeypot, rate limit (10/10min), Turnstile opcional, y calcula `score` server-side (`scoreFor()` en `util.ts`, coincide exactamente con la tabla de scoring de la propuesta: +10/+20/+30/+40/+50). El lead se guarda en KV y se envía "por correo" — pero de nuevo, con `MAIL_PROVIDER=console` eso es un log, no una notificación real. Formulario de exit-intent existe (`brenson-exit-intent.liquid`) según grep de sección presente.

### Módulo 10 — WhatsApp 🟡
`brenson-whatsapp.js` y `snippets` con mensajes dinámicos confirmados por grep. Es la implementación descrita en `ESTRATEGIA_SIMULACION.md` (S11): solo enlaces `wa.me` con texto precargado, **sin WhatsApp Business API real** — el "fuera de horario" es un estado visual, no una respuesta automática enviada. Esto es consistente con la decisión E3 ("verificar en Sprint 1"), que sigue ⏳ sin resolver según `DECISIONES_BRENSON.md`.

### Módulo 11 — CRM / GoHighLevel 🔴
`providers.ts` implementa `ghlCrm()` correctamente contra un webhook entrante de GHL (Workflows), con mapeo de campos completo. Pero: **0 webhooks Shopify configurados** (confirmado en `ESTADO_GENERAL`, verificado contra la API en vivo el 18-sep), `CRM_PROVIDER=mock` en `wrangler.toml`, y la propia existencia de una subcuenta GHL activa **no está confirmada** (decisión J1, "GoHighLevel no está activo o no se sabe"). Hoy, todo lead cae en KV + log del Worker, no en un pipeline comercial real. Bloquea también el Módulo 16.

### Módulo 12 — Panel administrativo 🟡
Lo que **sí** puede administrar alguien no técnico sin tocar código: secciones del homepage (bloques nativos de Shopify), metafields de producto por producto, aprobación B2B (tag + metafield), contenido de metaobjects (testimonios, contadores, tiers, asesores), tasa de financiación (metaobject `parametros_financiacion`). Lo que **no** puede administrarse sin desarrollador: activar/configurar proveedores reales (mail, PDF, storage, CRM, financiamiento) — eso vive en `wrangler.toml`/secrets de Cloudflare, fuera del alcance de un usuario de negocio. Esto es coherente con la arquitectura pero es una limitación real frente a "el equipo gestiona el ecosistema completo sin tocar código" (objetivo del Módulo 12 en la propuesta).

### Módulo 13 — SEO técnico 🔴 (contenido) / 🟢 (mecanismos)
JSON-LD (`brenson-json-ld.liquid`) y `noindex` dinámico para rutas B2B/empresas (`brenson-datalayer.liquid:9-20`) están implementados correctamente — esto es sofisticado y correcto: evita que Google indexe el catálogo corporativo privado. Sin embargo: sitemap/robots.txt son manejados nativamente por Shopify (no hay archivo propio, lo cual es normal, no un defecto). El contenido de blog real (Módulo 13 pide "5–8 páginas de blog SEO") está en `mock-data/blog.json` con 7 marcadores `[VALIDAR]` — no confirmado publicado como contenido real y validado.

### Módulo 14 — Performance ⚫ NO VERIFICADO
No se puede medir Core Web Vitals, LCP, CLS ni tiempos de carga desde una auditoría de código estático. `QA_MATRIZ.md` tiene el caso S-02 (Lighthouse mobile) marcado ⬜ pendiente. La decisión L4 documenta explícitamente que **no se probó en dispositivos Android reales** de gama media (recomendación no aceptada, limitación documentada). **Ningún número de este módulo debe citarse como medido** hasta correr Lighthouse/PageSpeed contra el tema en staging.

### Módulo 15 — Analytics 🟡
`brenson-datalayer.liquid` implementa Consent Mode v2 correctamente: `consent default denied` con `wait_for_update: 500`, puente con la Shopify Customer Privacy API vía el evento `visitorConsentCollected`, y GTM se carga condicionalmente solo si `settings.brenson_gtm_id` está configurado. El `dataLayer` envía `page_type`, datos de producto/colección, y estado B2B — sin PII, correcto. **Lo que no es verificable desde el código**: los tags, triggers y variables reales dentro del contenedor GTM (viven en la cuenta de Google Tag Manager, no en el repo), ni si existe un Meta Pixel real conectado — **REQUIERE VALIDACIÓN EXTERNA** contra la cuenta de GTM/Meta Business Manager (que según decisión K1, Meta Business Manager propio **no existe todavía**, se crea en Sprint 6).

### Módulo 16 — Remarketing 🔴
Bloqueado en cascada por los Módulos 11 (CRM) y 15 (Meta Business Manager inexistente). No hay código de catálogo dinámico de Meta ni flows de Klaviyo verificables en este repo (Klaviyo es una integración externa vía app de Shopify, no código propio).

### Módulo 17 — Mobile UX 🟡
Sticky bar mobile, exit intent, cotizador táctil están descritos como implementados en `QA_MATRIZ.md` (casos P-08, P-09, E-11 a E-20) pero **todos con estado ⬜ pendiente** — es decir, existe el código pero la propia matriz de QA del equipo confirma que **no se ha ejecutado la validación mobile real**. Sin acceso a un navegador/dispositivo en esta auditoría, se marca **NO VERIFICADO** para thumb-zone, teclado, overflow y comportamiento en Android de gama media.

### Módulo 18 — Seguridad 🟡
Lo verificado directamente en el código es sólido:
- HMAC con comparación de tiempo constante para webhooks de Shopify (`verifyShopifyHmac`/`timingSafeEqual`, `lib/shopify.ts:173-183`).
- Enlaces firmados con HMAC + expiración para PDFs y documentos B2B (`signPath`/`verifySignedPath`, `lib/util.ts`).
- Tokens de un solo propósito atados a `customer_id` para el flujo de upload sin sesión (`signToken`/`verifyToken`).
- Rate limiting en `/lead`, `/b2b/request`, `/quotes/:numero/accept`, `/financing/disponible` — consistente en todos los endpoints públicos.
- Validación server-side de email, NIT, tamaño de archivo (5 MB) y tipo MIME (`/^(application\/pdf|image\/...)/`) en `/upload`.
- El descuento B2B real vive en una Shopify Function server-side, no en el tema — el cliente no puede manipular el precio final vía DevTools (mitigación correcta del Riesgo 01 de la propuesta).

Riesgos reales encontrados:
- `signingSecret()` en `util.ts:30` tiene un **fallback hardcodeado**: `env.QUOTE_SIGNING_SECRET || 'dev-only-secret-change-me'`. Si el secreto no se configura en producción, todos los enlaces firmados (PDFs, documentos B2B) usan una clave pública conocida en el propio código fuente — **cualquiera con acceso al repo podría forjar enlaces válidos**. Esto es una vulnerabilidad real si el despliegue a producción olvida `wrangler secret put QUOTE_SIGNING_SECRET`.
- `/upload` acepta `customer_id` **sin token** cuando no se provee uno (`if (token && !(await verifyToken(...)))` — la validación solo se ejecuta *si* hay token). Está documentado como "brecha conocida que queda abierta" en `ESTADO_GENERAL` punto 3c.9: la subida desde la pantalla de estado "pendiente" (con sesión) no manda token, así que un `customer_id` ajeno adivinado también sería aceptado sin uno. Riesgo real de que un cliente suba/sobrescriba el documento de otro si conoce o adivina su ID numérico.
- Turnstile solo protege si `TURNSTILE_SECRET` está configurado (`if (c.env.TURNSTILE_SECRET && ...)`) — hoy, sin el secreto, **todos los formularios públicos están sin protección anti-bot real**, solo con rate limiting por IP.
- CORS: `origins.includes(o) ? o : origins[0]` — si el origen no está en la lista permitida, el middleware responde con `origins[0]` en vez de rechazar. Es una implementación de CORS laxa: no rompe nada crítico porque el navegador igual bloqueará la respuesta si el header no coincide con el origen real de la petición, pero no es un patrón de "denegar por defecto" explícito.

---

## 5. Integraciones

| Integración | Configurada | Código | Conectada | Probada | Producción | Estado |
|---|---|---|---|---|---|---|
| Shopify Admin API | Sí (scopes en `shopify.app.toml`) | ✅ completo | 🟠 token con posible falta de `read_themes`/`read_discounts` según `ESTADO_GENERAL` | Parcial (creación de cliente probada end-to-end el 18-sep) | ❌ | 🟠 |
| Shopify Storefront API | Implícita vía Liquid | ✅ | ✅ | — | ✅ | 🟢 |
| Shopify Customer API (cuentas nuevas) | N/A (nativo) | ✅ | ✅ | ✅ | ✅ | 🟢 |
| Shopify Function (descuento tier) | Manifiesto completo | ✅ + test unitario | ❓ `automaticDiscountNodes` no confirmado > 0 | Test unitario sí, E2E no | ❌ | 🟠 REQUIERE VALIDACIÓN EXTERNA |
| Cloudflare Workers (`brenson-services`) | `wrangler.toml` | ✅ | ✅ desplegado 17-sep | Tests unitarios pasan | Modo `staging` | 🟡 |
| Cloudflare KV | Binding real con IDs | ✅ | ✅ | — | ✅ | 🟢 |
| Cloudflare R2 (documentos B2B) | Comentado en `wrangler.toml` | ✅ (código listo, `r2Storage()`) | ❌ deshabilitado | — | ❌ | 🔴 |
| Cloudflare Turnstile | Setting de site key existe en tema | ✅ | ❌ sin `TURNSTILE_SECRET` | — | ❌ | 🔴 |
| GoHighLevel | ❓ existencia no confirmada | ✅ (`ghlCrm()`) | ❌ `CRM_PROVIDER=mock` | — | ❌ | 🔴 |
| Resend (email) | ❌ | ✅ (`resendMail()`) | ❌ `MAIL_PROVIDER=console` | — | ❌ | 🔴 |
| PDFMonkey | ❌ | ✅ (`pdfMonkey()`, con retry x3 y fallback a HTML) | ❌ `PDF_PROVIDER=html` | — | ❌ | 🔴 |
| Addi (BNPL) | Parcial (URLs sin confirmar) | ✅ mock + real, pero **API real no verificada contra spec oficial** (comentario propio del código lo advierte) | ❌ `FINANCING_PROVIDER=mock` | Mock sí | ❌ | 🟠 |
| GA4 / GTM | Solo si `brenson_gtm_id` está seteado | ✅ carga condicional + Consent Mode v2 | ❓ | — | ❓ | 🟠 REQUIERE VALIDACIÓN EXTERNA |
| Meta Pixel + CAPI | No hay código propio visible (viviría en GTM) | ❌ no verificable en repo | ❌ Meta Business Manager no existe (decisión K1) | — | ❌ | 🔴 |
| Klaviyo | ❌ | ❌ | ❌ (decisión K1: se crea en Sprint 6) | — | ❌ | 🔴 |
| Webhooks Shopify → Worker | Endpoint implementado (`/webhooks/shopify/:topic`) | ✅ con verificación HMAC | ❌ 0 webhooks registrados en la tienda (verificado 18-sep) | — | ❌ | 🔴 |

---

## 6. Datos y fuentes

| Dato | Fuente | Clasificación |
|---|---|---|
| Catálogo (39 productos) | Shopify | REAL (parcial: 12/39 con specs completas) |
| Specs técnicas de 12 vehículos "legacy" | Pendiente | FALTA — sin fecha de entrega confirmada |
| Tasa de financiación (1,9 %) | `parametros_financiacion` metaobject | MOCK — pendiente confirmación de Brenson |
| % de tiers B2B (8/12/18 %) | `tiers_b2b` metaobject | MOCK — pendiente confirmación |
| Garantía general del vehículo (meses) | — | FALTA — solo existen las 9 causales de anulación, no el plazo |
| Certificación Brenson (checklist 12 puntos) | `certificacion` metaobject | BORRADOR — sin validar por Brenson (workshop pendiente) |
| Contadores (vendidos/clientes/años/ciudades) | `contador` metaobject | MOCK (250/120/6/18) |
| Testimonios | metaobjects `brenson_testimonio` | MIXTO — 6 con `verificado: false`, más videos reales sin transcribir |
| Aliados (Parque Tayrona, Comfandi, IsaMotos) | metaobjects | REAL, `verificado: true` |
| Aliados financieros (Addi, Sistecrédito, Banco de Bogotá) | metaobjects | REAL (cargados 18-sep, reemplazando placeholder) |
| Asesores | `brenson_asesor` metaobject | MIXTO — nombres ficticios de canal, fotos institucionales sin correspondencia confirmada |
| Cotizaciones (6 existentes) | metaobject `brenson_cotizacion_b2b` | PRUEBA — 3 de ellas con PDF desfasado tras renumeración (pendiente 2j) |
| WhatsApp oficial | Ajustes del tema | REAL (`+57 301 2915915`, corregido 18-sep) |
| Dirección de sede | Ajustes del tema | REAL (Cali, confirmada contra facturación de Shopify) |
| Blog (6 artículos) | `mock-data/blog.json` | BORRADOR — 7 `[VALIDAR]`, no confirmado publicado |
| Políticas legales | — | FALTA — sin texto de Brenson/abogado |

---

## 7. UX/UI

- **Sistema visual**: tokens de marca corregidos el 18-sep (`brenson-tokens.css`) al manual real (verde `#29a800`/`#96ed0b`, turquesa `#02b2b2`, Ubuntu + Dancing Script), reemplazando un sistema heredado de una auditoría de tema distinta (rojo/negro/Montserrat de "EDrop"). Esto es evidencia de que el sistema de diseño **cambió de fuente de verdad a mitad de proyecto** — vale la pena una pasada visual completa para confirmar que ningún componente quedó con el color viejo hardcodeado (el propio `quote.ts:95` todavía genera el PDF con `#ee0000` rojo y Montserrat en su plantilla HTML — **inconsistencia real**: el PDF de cotización no usa la paleta de marca corregida).
- **Bug de contraste ya corregido pero indicativo de un patrón de riesgo**: títulos del portal B2B ilegibles por una regla de Dawn (`color: rgb(var(--color-foreground))` en `h1–h4`) ganando sobre el color heredado del body — corregido con una regla puntual, pero sugiere que **el tema base de Dawn no se auditó por completo contra fondos oscuros custom**; puede repetirse en otras secciones oscuras no probadas.
- **Consistencia de contenido**: el aviso "Sitio en construcción: datos de demostración" solo aparece si `brenson_modo_simulacion` está activo (hoy sí lo está) — es correcto que exista, pero significa que **el sitio en staging hoy se ve, correctamente, como un sitio en construcción**, no como un preview de producción limpio.

---

## 8. Mobile

Sin acceso a un navegador o dispositivo en esta auditoría, **NO VERIFICADO** de forma directa. Evidencia indirecta:
- `QA_MATRIZ.md` lista explícitamente los casos mobile (sticky bar, exit intent, cotizador táctil, header B2B) como ⬜ pendientes de ejecutar.
- Decisión L4 documenta que **nunca se probó en un dispositivo Android real** de gama media/baja — solo emulación en Chrome DevTools. Es una limitación aceptada, no resuelta.
- El público objetivo llega de Instagram/TikTok en móvil (Módulo 17 de la propuesta) — es la brecha de mayor riesgo de negocio sin evidencia de validación real.

---

## 9. SEO

- JSON-LD y `noindex` dinámico: implementados correctamente y verificados en código (ver Módulo 13).
- Sitemap/robots: gestionados nativamente por Shopify, no hay archivo propio en el repo (correcto, no es un hallazgo).
- Contenido: blog y specs con marcadores de borrador — el SEO técnico está listo para indexar contenido que en su mayoría **todavía no es contenido final**.
- Redirecciones 301: mencionadas en la propuesta y en decisión B12 como "mínimas" — no se encontró un archivo o configuración de redirects en el repo para verificar cobertura. **NO VERIFICADO**.

---

## 10. Performance

**NO VERIFICADO.** No se puede medir LCP/CLS/INP/TTFB desde una lectura de código. `QA_MATRIZ.md` (S-02) lo deja pendiente de ejecutar con Lighthouse mobile + throttling 4G. Ningún número de este documento ni de los documentos previos del proyecto debe tratarse como una métrica medida — es un objetivo (Módulo 14 de la propuesta: LCP < 2.5s, FID < 100ms, CLS < 0.1), no un resultado.

---

## 11. Analytics

| Evento requerido (Módulo 15) | Implementado en código |
|---|---|
| `brenson_page` (page_type, template, producto/colección) | ✅ `brenson-datalayer.liquid` |
| Consent Mode v2 (default denied) | ✅ |
| `brenson_consent` al aceptar | ✅ |
| ViewContent / ViewItem | ❓ no visible en el snippet auditado — probablemente vía tags de GTM externos, **REQUIERE VALIDACIÓN EXTERNA** |
| Simulador, WhatsApp, Lead, Quote, B2B, PDF (eventos custom) | ❓ no encontrados como `dataLayer.push` explícitos en los archivos revisados — **NO VERIFICADO**, requiere grep dedicado sobre `brenson-simulator.js`, `brenson-whatsapp.js`, `brenson-lead-form.js` línea por línea (fuera del alcance de esta pasada) |
| Meta Pixel + CAPI | ❌ Meta Business Manager no existe todavía (decisión K1) |
| Looker Studio | ❌ depende de GA4 con datos reales, no verificable |

---

## 12. Seguridad

Ver detalle completo en Módulo 18. Resumen de vulnerabilidades/riesgos reales encontrados en el código (no hipotéticas):

1. **Secreto de firma con fallback hardcodeado** (`util.ts:30`) — riesgo crítico si se despliega a producción sin `QUOTE_SIGNING_SECRET`.
2. **`/upload` acepta sin token cuando no se envía uno** — brecha ya documentada por el propio equipo, sigue abierta.
3. **Turnstile inactivo sin su secreto** — formularios públicos dependen solo de rate limiting.
4. **CORS con fallback a `origins[0]`** en vez de rechazo explícito — bajo riesgo pero no es la práctica más estricta.
5. **PDF de cotización con paleta de marca desactualizada** — no es un riesgo de seguridad, pero es una inconsistencia de marca en un documento comercial que se envía a clientes.

---

## 13. Falsos completados detectados

- **La documentación interna dice que no existe el flujo cotización→pedido; el código sí lo tiene.** (`FLUJO_COTIZACION_A_PEDIDO.md` vs. `index.ts:243-287` + `shopify.ts:157-171`). Riesgo inverso al habitual: que el equipo re-priorice construir algo que ya existe, o que lo dé por "sin probar" y no lo pruebe nunca porque "total, no existe".
- **El PDF de cotización no es un PDF** — es HTML servido con extensión `.pdf` en la URL (`PDF_PROVIDER=html`). Visualmente parece terminado (el cliente recibe un enlace, lo abre, ve un documento con marca), pero no se puede archivar ni adjuntar como PDF real a un sistema externo.
- **El botón "certificado Brenson" se activa con un booleano simple** (`mf.certificado !== 'false'`) sin ninguna verificación de que el proceso de certificación real (workshop, checklist aprobado) exista — un cambio de un metafield en Admin publica una promesa de marca sin respaldo operativo.
- **La subida de documento B2B responde `200 OK`** pero con `STORAGE_PROVIDER=local` el archivo no se guarda en ningún lugar accesible — el usuario ve éxito, el admin ve "cámara de comercio" listada pero sin archivo real, exactamente el patrón que la Fase 8 de esta auditoría pide detectar.
- **Notificaciones "enviadas"**: cada `mail.send()` en el código retorna éxito con `MAIL_PROVIDER=console` — todo el sistema de avisos (nueva solicitud B2B, cotización enviada, cotización aceptada) aparenta funcionar (no lanza error) pero **nadie en Brenson lo recibe**.
- **Descuento B2B "aplicado"**: el catálogo corporativo muestra un precio con el descuento de tier ya restado (display), pero sin confirmación de que la Shopify Function esté desplegada, el precio real cobrado en checkout puede ser el público — la cotización (que sí recalcula server-side) y el carrito/checkout (que depende de la Function) pueden divergir.

---

## 14. Funcionalidades faltantes (lista completa)

- Notificaciones por correo reales (Resend).
- Almacenamiento real de documentos B2B (R2).
- PDF real de cotizaciones y fichas técnicas (PDFMonkey).
- CRM real conectado (confirmar existencia de GoHighLevel; si no existe, definir alternativa).
- Webhooks Shopify → Worker configurados en la tienda (0 hoy).
- Confirmación de despliegue de la Shopify Function de descuento (`automaticDiscountNodes`).
- Registro de unidades por serie con `cliente_id` fiable (mismo patrón de bug que cotizaciones, sin corregir).
- Turnstile activo en ambos lados (site key + secret) simultáneamente.
- `QUOTE_SIGNING_SECRET` real en producción.
- Specs completas de 12 vehículos legacy.
- Garantía general del vehículo (meses) — dato de negocio, no técnico.
- Certificación Brenson validada por workshop antes de activar el badge en producción.
- Textos legales (garantía, privacidad, términos, disclaimer del simulador).
- Contadores y testimonios reales con `verificado: true`.
- Corrección de la paleta de marca en la plantilla del PDF de cotización (`quote.ts`).
- Decisión de negocio sobre cierre comercial (Opción A/B de `FLUJO_COTIZACION_A_PEDIDO.md`) — aunque el código de la Opción A ya está escrito, falta el botón "Aceptar cotización" en la UI del portal (**NO VERIFICADO** si ya existe en `brenson-b2b-quoter.liquid` — no se confirmó en esta pasada si el frontend llama a `/quotes/:numero/accept`).
- Pruebas E2E y de dispositivos reales (mobile, cross-browser) — todo `QA_MATRIZ.md` sigue en ⬜.
- Medición real de performance (Lighthouse/PageSpeed).
- Confirmación de apps de Shopify a desinstalar (F1), pasarelas de pago activas (F4), plan de Shopify (A5), herramienta de WhatsApp App vs. API (E3).

---

## 15. Matriz de cumplimiento (extracto priorizado)

| ID | Requisito | Estado | Evidencia | Archivo/Ruta | Riesgo | Acción |
|---|---|---|---|---|---|---|
| M01 | Modo simulación apagado en producción | 🔴 FALTA | `brenson_modo_simulacion: true` | `config/settings_data.json` | Crítico | Apagar antes de publicar |
| M02 | Notificaciones por correo reales | ⚫ MOCK | `MAIL_PROVIDER=console` | `wrangler.toml` | Crítico | Configurar Resend + secret |
| M03 | Documentos B2B persistidos | ⚫ MOCK | `STORAGE_PROVIDER=local` | `wrangler.toml` | Crítico | Habilitar R2 |
| M04 | Descuento B2B aplicado en checkout | 🟠 NO VALIDADO | Function con test unitario, despliegue no confirmado | `brenson-b2b-functions/extensions/tier-discount` | Alto | Confirmar `automaticDiscountNodes` en Admin |
| M05 | Webhooks Shopify→CRM | 🔴 FALTA | 0 webhooks (verificado 18-sep) | — | Alto | Crear webhooks o confirmar GHL primero |
| M06 | Secreto de firma de enlaces en producción | 🔴 FALTA (riesgo) | Fallback hardcodeado | `lib/util.ts:30` | Crítico | `wrangler secret put QUOTE_SIGNING_SECRET` |
| M07 | Turnstile anti-spam activo | 🔴 FALTA | Sin `TURNSTILE_SECRET` | `.dev.vars.example` | Medio | Activar ambos lados a la vez |
| M08 | Cálculo de cuota mensual correcto | 🟢 COMPLETO | Test unitario pasa | `quote.test.mjs` | — | — |
| M09 | Garantía general del vehículo publicada | 🔴 FALTA | Dato de negocio no entregado | `brenson-product-warranty.liquid` (3×`[BORRADOR]`) | Alto | Esperar a Brenson |
| M10 | Certificación Brenson con badge condicionado al proceso real | 🟡 PARCIAL | Booleano simple, sin validación de proceso | `lib/quote.ts` (specSheetHtml) | Medio | Bloquear el flag hasta cierre de workshop |
| M11 | Flujo cotización→pedido | 🟠 IMPLEMENTADO NO VALIDADO | Código completo, prueba E2E no confirmada | `index.ts:243-287` | Alto | Probar end-to-end contra tienda real |
| M12 | Unidades con `cliente_id` fiable | 🔴 FALTA | Mismo bug de `customer_reference` sin corregir | dashboard B2B | Medio | Replicar el fix ya hecho en cotizaciones |
| M13 | Performance medida | ⚫ NO VERIFICADO | Sin ejecutar | — | Medio | Correr Lighthouse en staging |
| M14 | Pruebas mobile en dispositivos reales | ⚫ NO VERIFICADO | `QA_MATRIZ.md` en ⬜ | — | Alto | Ejecutar matriz de QA |

---

## 16. Priorización

### P0 — Bloqueante (no se puede lanzar sin esto)
1. Apagar `brenson_modo_simulacion` y verificar `check:mocks` en 0 (hoy: 54 marcadores).
2. Configurar Resend real (`MAIL_PROVIDER=resend` + secret + dominio verificado) — sin esto nadie en Brenson se entera de nada.
3. Configurar `QUOTE_SIGNING_SECRET` real — el fallback hardcodeado es una vulnerabilidad activa hoy mismo si algo apunta a producción sin el secreto.
4. Habilitar R2 y `STORAGE_PROVIDER=r2` — el registro B2B pierde el documento adjunto sin esto.
5. Confirmar y, si falta, desplegar la Shopify Function de descuento — de lo contrario el checkout B2B cobra precio público sin que nadie lo note hasta la factura.

### P1 — Crítico (afecta ventas, seguridad, datos u operación principal)
1. Cerrar la brecha de `/upload` sin token.
2. Activar Turnstile en ambos lados.
3. Confirmar existencia de GoHighLevel o definir alternativa de CRM real; configurar los webhooks Shopify faltantes.
4. Validar end-to-end el flujo `/quotes/:numero/accept` contra la tienda real (existe en código, no probado).
5. Corregir `cliente_id` en `brenson_unidad` antes de que se cargue la primera unidad real (hoy no se nota porque no hay datos).
6. Obtener de Brenson: garantía general en meses, aprobación del checklist de Certificación, tasa de financiación real, % de tiers reales.

### P2 — Importante (antes de una versión madura)
1. Completar specs de los 12 vehículos legacy.
2. Migrar contenido de blog y testimonios de borrador a validado.
3. Ejecutar la `QA_MATRIZ.md` completa (hoy 100 % en ⬜).
4. Medir performance real con Lighthouse/PageSpeed y en al menos un dispositivo Android físico de gama media.
5. Unificar la paleta de marca en la plantilla del PDF de cotización.
6. Confirmar apps a desinstalar, pasarela de pago activa, plan de Shopify, WhatsApp App vs. API.

### P3 — Mejora
1. Revisar consistencia de contraste en el resto del tema (más allá del bug ya corregido en el portal B2B).
2. Auditar `dataLayer` con eventos custom explícitos por acción (simulador, WhatsApp, PDF) si no existen ya.
3. Confirmar cobertura de redirecciones 301.
4. Evaluar Shopify Plus si el volumen de B2B crece más allá de lo que la Function + tags puede sostener (Riesgo 01 de la propuesta).

---

## 17. Roadmap recomendado (basado en el estado real, no en las 16 semanas originales)

- **Sprint 0 (1 semana) — Cerrar el modo simulación**: Resend, R2, `QUOTE_SIGNING_SECRET`, Turnstile, confirmar la Function desplegada. Ninguna de estas tareas requiere código nuevo — son configuración de proveedores ya escritos.
- **Sprint 1 (1–2 semanas) — Validación end-to-end del ciclo comercial B2B**: probar `/b2b/request` → aprobación → cotización → aceptación → pedido borrador contra la tienda real con un cliente de prueba; corregir `cliente_id` en `brenson_unidad`.
- **Sprint 2 (1 semana) — CRM real**: confirmar/activar GoHighLevel o definir alternativa; configurar los 5 webhooks Shopify faltantes.
- **Sprint 3 (2–3 semanas, depende de Brenson) — Contenido crítico**: specs de 12 vehículos, garantía en meses, aprobación de Certificación Brenson, tasa y tiers reales, textos legales.
- **Sprint 4 (1 semana) — QA real**: ejecutar `QA_MATRIZ.md` completa, Lighthouse, al menos un dispositivo Android físico.
- **Sprint 5 (1 semana) — Analytics y remarketing**: confirmar GTM/Meta Pixel reales, o documentar que quedan para una fase 2 si Meta Business Manager sigue sin existir.
- **Sprint 6 — Lanzamiento**: apagar modo simulación, checklist GO/NO-GO (§19), publicar tema.

Este roadmap es sustancialmente más corto que las 16 semanas de la propuesta porque **la mayoría del código ya existe** — el trabajo restante es predominantemente configuración de proveedores externos y contenido de negocio pendiente de Brenson, no desarrollo desde cero.

---

## 18. Riesgos antes de producción

1. Publicar con el secreto de firma por defecto (`dev-only-secret-change-me`) expondría todos los enlaces firmados.
2. Publicar con `brenson_modo_simulacion` activo mostraría el banner "sitio en construcción" a clientes reales.
3. Aprobar una empresa B2B sin que su documento (cámara de comercio) se haya guardado realmente (storage local).
4. Que el checkout cobre precio público a un cliente B2B aprobado si la Function no está desplegada, generando una discrepancia con la cotización que sí tiene el descuento.
5. Que una solicitud B2B o una cotización aceptada se pierda silenciosamente porque el correo va a un log de Cloudflare que nadie revisa.
6. Publicar el badge "Certificado Brenson" sin que el proceso de inspección real exista (riesgo reputacional/legal, no solo técnico).
7. Publicar la garantía o el disclaimer del simulador todavía en `[BORRADOR]` sin revisión de un abogado.

---

## 19. Checklist GO / NO-GO

- [ ] `brenson_modo_simulacion` apagado y `check:mocks` en 0 marcadores
- [ ] `MAIL_PROVIDER=resend` con dominio verificado
- [ ] `STORAGE_PROVIDER=r2` habilitado y probado con una subida real
- [ ] `PDF_PROVIDER=pdfmonkey` o decisión explícita de mantener HTML como PDF definitivo
- [ ] `QUOTE_SIGNING_SECRET` configurado como secreto real en Cloudflare
- [ ] `TURNSTILE_SECRET` + site key activos simultáneamente
- [ ] Shopify Function de descuento confirmada desplegada y probada en checkout real
- [ ] Webhooks Shopify → Worker configurados (mínimo customers, checkouts, orders)
- [ ] CRM real conectado (GHL confirmado o alternativa) y al menos un lead de prueba visto en el pipeline
- [ ] Flujo cotización → aceptación → pedido borrador probado contra la tienda real
- [ ] `cliente_id` corregido en `brenson_unidad` antes de cargar unidades reales
- [ ] Specs completas en el 100 % del catálogo activo (o exclusión confirmada de los que no las tendrán)
- [ ] Garantía general, disclaimer del simulador y políticas legales con texto final (no `[BORRADOR]`)
- [ ] Certificación Brenson aprobada por workshop antes de activar el badge
- [ ] `QA_MATRIZ.md` ejecutada al 100 % (hoy 0 %)
- [ ] Lighthouse/PageSpeed corrido en staging con resultados documentados
- [ ] Al menos una prueba en dispositivo Android físico de gama media
- [ ] Tema publicado a producción (hoy solo staging)
- [ ] Monitoreo/alertas activos los primeros 7 días post-lanzamiento

---

## Nota metodológica final

Esta auditoría se basó en lectura completa de: los 6 archivos de `brenson-services/src`, el código de la Shopify Function (`run.js`), ejecución en vivo de `check-mocks.mjs` y `npm test`, inspección de `wrangler.toml`/`.dev.vars.example`/`shopify.app.toml`, y los snippets/secciones más críticos del tema (`brenson-b2b-guard`, `brenson-datalayer`, plantillas de home/colección/producto). No se tuvo acceso en esta sesión a Shopify Admin en vivo, Cloudflare Dashboard ni GoHighLevel — todo lo marcado **REQUIERE VALIDACIÓN EXTERNA** debe confirmarse contra esos sistemas antes de tratarlo como definitivo. Los datos ya verificados en vivo por el propio equipo el 18-sep (documentados en `ESTADO_GENERAL_18SEP2026.md`) se citaron como tales, no se re-verificaron de nuevo contra la tienda en esta pasada.
