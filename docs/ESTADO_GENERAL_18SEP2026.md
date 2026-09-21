# Estado General del Proyecto Brenson — 18 de septiembre de 2026

Documento único de estado, construido verificando en vivo contra la tienda real (`brenson-0.myshopify.com`), Cloudflare y el contenido entregado por Brenson — no a partir de lo que decían los documentos anteriores. Reemplaza como fuente de verdad a `ESTADO_CONSTRUCCION.md` y `GUIA_PUBLICACION.md` (11-sep), que quedaron desactualizados en el punto más importante: si el sitio estaba desplegado o no.

Para el detalle técnico del roadmap de 16 semanas ver `PLAN_DE_TRABAJO_BRENSON.md`. Para la guía de presentación a Brenson ver `PLAN_ACCION_Y_PRESENTACION.md`. Este documento es el resumen ejecutivo de estado + la lista de validación pendiente.

---

## 1. Resumen en una frase

**El ecosistema está construido y desplegado en staging, con datos reales de marca cargados; falta terminar de migrar 12 vehículos del catálogo antiguo al modelo nuevo, subir el logo oficial, y que Brenson confirme ~15 datos de negocio puntuales** (tasa real, % de tiers, garantía del vehículo en meses, contadores, ciudades de cobertura, etc.). No hay bloqueos de acceso ni de arquitectura pendientes.

---

## 2. Estado por componente

| Componente | Estado | Detalle |
|---|---|---|
| Tienda Shopify | ✅ Real y activa | `brenson-0.myshopify.com`, plan **Basic**, moneda COP |
| Tema de staging | ✅ Desplegado, en validación fina | "Brenson Staging" (ID `143001354315`). Preview: `https://brenson-0.myshopify.com?preview_theme_id=143001354315` |
| Tema publicado en producción | ❌ Sin publicar | Sigue sin publicarse; lo que se ve en `brenson.co` sin el parámetro de preview es la sesión de editor de un navegador con Admin abierto, no producción |
| Diseño (17 pantallas Stitch) | ✅ Completo y validado | 14 pantallas core + 3 de Empresas, corregidas contra el tema real |
| Theme Check | ✅ 0 errores | 105 warnings preexistentes, aceptados |
| Backend `brenson-services` | ✅ Desplegado 17-sep | `https://brenson-services.brenson.workers.dev` — modo `staging`, proveedores `mock`/`console`/`html`/`local` |
| Almacenamiento R2 (documentos B2B) | ❌ Pausado | Requiere habilitar R2 en Cloudflare (pide tarjeta); Luis lo retoma cuando Brenson la tenga a mano |
| Function de descuento B2B (`brenson-b2b-functions`) | ✅ Desplegada y activa (21-sep) | `brenson-admin-scripts-9` + descuento automático "Descuento corporativo por tier" ACTIVE. Falta la prueba en un checkout real. Ver `FLUJO_COTIZACION_A_PEDIDO.md` §5 |
| Search & Discovery (facetas) | ✅ Confirmado funcionando | Verificado con captura real: Categoría, Uso, Autonomía/Velocidad/Carga por tramo, Financiable, Requiere licencia |
| Webhooks Shopify → GHL | ❌ Ninguno configurado | 0 `webhookSubscriptions` en la tienda — no hay integración de CRM activa todavía |
| GoHighLevel | ❓ Sin confirmar si existe | Ver decisión J1 pendiente |
| Catálogo | 🔶 39 productos activos, migración parcial | 12 con specs completas (`brenson.*`) + 12 más ya con **fotos completas migradas** (17-sep) pero sin metafields `brenson.*` porque las specs siguen sin llegar de Brenson, más baterías/cargadores (candidatos a excluir por decisión B5) |
| Manual de marca, logo, garantías, aliados | ✅ Recibido y en gran parte cargado | Ver §3 |

---

## 3. Lo que se hizo en esta sesión (18-sep)

1. **Backend desplegado**: `brenson-services` en Cloudflare Workers, con KV real, dominio corregido, secretos configurados, y verificado con `/health`.
2. **Paleta y tipografía de marca corregidas**: el tema tenía rojo/negro/Montserrat heredado de la auditoría del tema viejo (EDrop); el manual de marca real (DO-MKT-001) especifica verde `#29a800`/`#96ed0b`, turquesa `#02b2b2`, gris `#1e1e1e`, tipografía Ubuntu + Dancing Script. Corregido en `brenson-tokens.css` y `theme.liquid`, desplegado y verificado en remoto.
3. **WhatsApp real corregido**: `+57 301 2915915` reemplazó al número anterior en 7 archivos/lugares (asesores, settings, footer, JSON-LD, mock-data).
4. **Dirección de la sede corregida**: decía "Barranquilla" (la ciudad de la agencia Enlaces Digitales, no la de Brenson) — el dato real es **Cali**, `Calle 29 #4B-28, B/ Porvenir`. **Confirmado de forma independiente**: la dirección de facturación de la propia tienda Shopify coincide exactamente.
5. **Aliados financieros reales cargados**: Addi, Sistecrédito y Banco de Bogotá (antes un placeholder `[BORRADOR]` único). Parque Tayrona, Comfandi e IsaMotos sincronizados como `verificado: true` (ya estaban aprobados desde el 11-sep pero no se había reflejado en Shopify).
6. **Corrección de un error propio**: en la sesión anterior marqué 27 productos del catálogo como "residuos de dropshipping" candidatos a archivar. El ZIP de Brenson probó que son el catálogo real (Corato, Dakota, Dallas, Furgón, Maxi, Milán, Mobility, Monaco, Platón, Vera, Verona, Zero) — no se archivó nada.
7. **Incidente detectado y corregido**: al escribir nombres con tilde (Sistecrédito, Bogotá) directo en comandos de shell, la codificación UTF-8 se corrompió camino a Shopify. Se detectó comparando bytes, se corrigió reescribiendo con Node y se verificó con una relectura.

### 3b. Migración a cuentas nuevas de cliente (18-sep, sesión 2)

Se cerró la decisión A2, que llevaba pendiente desde el Sprint 0, y se rehízo todo lo que dependía de ella.

1. **Verificado: la tienda usa cuentas NUEVAS y no hay vuelta atrás.** El panel Configuración → Cuentas de cliente ya no ofrece las clásicas (Shopify las retiró). Se materializó el riesgo R-A1 del plan. El acceso es sin contraseña: código de un solo uso al correo.
2. **El gating del portal NO se vio afectado**: `customer.tags` y `customer.metafields` siguen disponibles en Liquid, así que `brenson-b2b-guard` y los cuatro estados quedaron intactos. Lo que se rehízo fue el login y el alta.
3. **Login** → enlace a `/customer_authentication/login?return_to=<ruta>`, la ruta oficial para cuentas nuevas. Se eliminó el `form 'customer_login'` del portal.
4. **Alta corporativa** → `POST /b2b/request` en brenson-services crea el cliente con `customerCreate` (o convierte el existente) y escribe los metafields `brenson_b2b.*` + el tag `b2b-pendiente` en la misma llamada. **Ya no depende de Shopify Flow** para marcar el estado pendiente. Probado de punta a punta contra la tienda real: cliente creado con los 7 metafields correctos, y borrado después.
5. **Código muerto eliminado**: `brenson-account-gate.liquid`, las 7 plantillas de `templates/customers/` (carpeta completa), las 7 secciones `main-*` de Dawn que las servían y sus 7 entradas de locale. Ninguna se renderizaba con cuentas nuevas. `theme check` bajó de 103 a 96 advertencias, 0 errores.
6. **Bug encontrado en el guard**: existía un fallback `customer.note contains 'B2B {'` que **nunca se cumplía**, porque `note` no es una propiedad del objeto `customer` de Liquid (verificado contra la doc). Eliminado; el estado ahora viene del metafield.
7. **Bug encontrado al desplegar**: un fallo de Shopify en `/b2b/request` salía como 500 crudo. Como ese endpoint es el único camino de alta, ahora todo el bloque de Admin API va en try/catch, devuelve 502 con mensaje útil y **avisa por correo al asesor** para que la solicitud no se pierda.
8. **Bug latente de Turnstile**: el JS del formulario B2B nunca enviaba `cf-turnstile-response`, y en esta sesión se añadió la verificación de Turnstile al endpoint. Activar el secreto habría rechazado el 100% de las solicitudes. Corregido antes de que llegara a pasar.
9. **Seguridad del paso 2**: la subida del documento ahora ocurre sin sesión iniciada, así que `/b2b/request` emite un token HMAC de 1 hora atado a ese `customer_id` y `/upload` lo verifica. Probado contra manipulación y contra uso cruzado entre clientes (403 en ambos). Se añadió rate limit (5/hora por IP) y validación de correo al endpoint. ~~Brecha conocida que queda abierta: `/upload` sigue aceptando un `customer_id` sin token~~ **Cerrada el 21-sep** (ver §3d).
10. **Desplegado y verificado**: tema en staging (pull + comparación archivo por archivo) y worker en Cloudflare (`f909491b`). `brenson_services_url` ya apunta al worker, se acabó el modo simulación.

### 3c. Correcciones del portal tras probarlo en vivo (18-sep, sesión 2, tarde)

Probando el flujo con una empresa real (X-SOLUTION, aprobada y luego revisada) salieron seis fallos. Todos corregidos, desplegados y verificados.

1. **Nombre del contacto no se guardaba** en la conversión de una cuenta con sesión: el admin mostraba "null null" porque las cuentas nuevas de Shopify no piden nombre al registrarse y el worker no lo completaba. Ahora lo escribe si el cliente no lo tiene, sin pisar uno existente.
2. **Rate limit contaba antes de validar**: cinco errores de tipeo bloqueaban a una empresa legítima una hora. Ahora valida primero (no cuesta E/S, un bot con basura no consume cupo) y el límite subió a 10/hora — una oficina entera comparte una IP pública.
3. **El formulario se quedaba en "Enviando…"**: sin timeout, sin red de seguridad y sin refrescar. Ahora aborta a los 20 s, un `finally` restaura el botón pase lo que pase, y con sesión iniciada recarga la página para que el guard muestre la pantalla de validación (antes había que recargar a mano).
4. **Dos enlaces de sesión rotos o desorientadores**: el ícono de cuenta del header dejaba a la persona en el portal alojado de Shopify tras autenticarse (ahora vuelve a donde estaba), y "Iniciar sesión" del header B2B apuntaba a `#b2b-login`, un ancla que solo existe en `/pages/empresas` sin sesión.
5. **Títulos invisibles en el portal.** Dawn declara `color: rgb(var(--color-foreground))` sobre `h1–h4` en `base.css`; al ser un color EXPLÍCITO gana sobre el `color:#fff` heredado del body, así que todo título sin clase propia salía gris oscuro sobre el fondo carbón (el `<h1>` "Bienvenido, Luis" era ilegible). Resuelto con una regla única en `brenson-empresas.css` en vez de parchar ~20 títulos. Además el panel de bienvenida no tenía relleno: el mockup lo define como superficie elevada, se le puso fondo y sombra. **Ojo con los PNG de `stitch-design/`**: se capturaron sin cargar Tailwind, así que se ven claros aunque el diseño sea oscuro — hay que leer el HTML, no la imagen.
6. **"Mis cotizaciones" siempre vacío** pese a existir las cotizaciones: el filtro usaba `q.cliente.value.id`, un `customer_reference` que no resuelve de forma fiable en Liquid del storefront (la doc de Shopify no lo documenta). Se agregó el campo `cliente_id` (texto plano) a la definición `brenson_cotizacion_b2b`, el worker lo escribe, el portal filtra por él y se rellenaron las 6 cotizaciones existentes. **Números duplicados corregidos de paso**: el contador de KV arrancó en 0 aunque la tienda ya tenía cotizaciones sembradas, y reemitió COT-2026-0001/0002/0003 para otra empresa (Shopify solo desambigua el handle, no el número visible). Renumeradas a 0004–0006, contador sembrado en 6, y `nextQuoteNumber` ahora consulta el máximo en Shopify cuando KV está vacío.

El carrusel de videos también se ocultó en el portal con sesión: se renderiza antes del dashboard, así que un cliente aprobado abría su portal con un video de ventas en vez de con sus cotizaciones. Ahora solo aparece en la landing pública.

---

### 3d. Fase 1 del plan post-auditoría: seguridad y código (21-sep)

Hallazgos de `AUDITORIA_BRENSON_ECOSISTEMA_18SEP2026.md` que no dependían de credenciales ni de Brenson. **Solo en el repo, sin desplegar** (ni Worker ni tema).

| Hallazgo | Cambio |
|---|---|
| Secreto de firma con respaldo escrito en el código (`util.ts`) | `signingSecret()` lanza un error si falta `QUOTE_SIGNING_SECRET`; la clave de prueba solo vale con `ENVIRONMENT=development` (agregado a `.dev.vars.example`) |
| `/upload` aceptaba un `customer_id` sin token | El token ahora es obligatorio. `/b2b/request` emite uno de 30 días y lo guarda en el metafield `brenson_b2b.upload_token`, que `brenson-b2b-upload.liquid` le muestra solo al propio cliente (mismo patrón que `accept_token`). Con sesión, el formulario de conversión ya no ofrece la subida antes de enviar: se hace en la pantalla "pendiente" tras recargar |
| CORS respondía con `origins[0]` a orígenes no permitidos | Denegar por defecto (sin cabecera) |
| Sello "Certificado" en la ficha PDF salía si el metafield no existía | Exige `CERTIFICACION_ACTIVA="true"` (nueva variable, en `false`) **y** `certificado = true`. En el tema, el hero de financiación tenía el sello escrito en el código: ahora pasa por `brenson-badge` (interruptor global + metafield) |
| PDF de cotización con rojo `#ee0000` y Montserrat | Paleta del manual: verde `#29a800`, gris `#1e1e1e`, Ubuntu |
| `cuota_desde_override` podía mostrar $0 | Ver 2i |
| `data-brenson-track` solo se medía para `whatsapp_click` (y solo si estaba la sección flotante) | Listener genérico en `brenson-datalayer.liquid`: ahora también se miden `pdf_download`, `quote_cta`, `simulator_cta`, `simulator_addi_check` y `write_review_click`. Nuevo evento `brenson_quote_accept` |

> ⚠️ **Antes del próximo `wrangler deploy`**: ejecutar `wrangler secret put QUOTE_SIGNING_SECRET`. Sin ese secreto, `/quote`, `/b2b/request` y los enlaces firmados fallan con un 500 (a propósito). Además, los clientes que quedaron en "pendiente" antes de este cambio no tienen `upload_token`: la subida les responde 403 con el mensaje de WhatsApp. Si alguno necesita adjuntar, se le reenvía `/b2b/request` o se adjunta desde el Admin.

---

## 4. Todo lo pendiente de validar con Brenson

Organizado por si depende de una respuesta simple o de contenido/material.

### 4.1 Decisiones y confirmaciones (respuesta corta)

| # | Pregunta | Por qué importa |
|---|---|---|
| 1 | La tasa de financiación cargada es **1.9 % mensual** — ¿es la real aprobada o un valor de simulación? | Afecta la cuota que se muestra en cada ficha y en el simulador |
| 2 | Los % de tiers B2B cargados son **10+ u. → 8 %, 20+ u. → 12 %, 50+ u. → 18 %** — ¿son los reales? | Afecta directamente lo que se cobra vía la Shopify Function de descuento |
| 3 | **Garantía general del vehículo**: el material recibido solo trae las 9 causales de anulación, no el plazo en meses del vehículo completo (motor/estructura) — ¿cuántos meses cubre? | Es el dato más visible del "Sistema de Confianza" (Módulo 06 de la propuesta) |
| 4 | **Certificación Brenson**: el checklist de 12 puntos está redactado pero marcado como borrador pendiente de workshop — ¿se puede publicar tal cual o falta ajustarlo? | El badge "Certificado Brenson" no debe salir a producción sin este visto bueno |
| 5 | ¿Existe una subcuenta de **GoHighLevel** activa? (0 webhooks configurados hoy, no se ha probado nada) | Bloquea o no los Módulos 09 (leads), 11 (CRM) y 16 (remarketing) |
| 6 | Ciudades de "entrega inmediata" y "prueba de manejo a domicilio" hoy dicen Barranquilla/Santa Marta/Cartagena/Cali/Medellín en distintos lugares del tema — con la sede confirmada en Cali, ¿cuáles son las ciudades reales de cobertura? | Aparece en el anuncio superior, el header y la página de Empresas |
| 7 | ~~Tipo de cuentas de cliente~~ **Resuelto el 18/09/2026: cuentas NUEVAS**, y Shopify ya no ofrece volver a las clásicas. El tema se refactorizó el mismo día (login alojado + alta por Admin API). Queda una sub-pregunta: ¿el dashboard corporativo puede listar `customer.orders` desde una página del tema, o hay que enlazar al portal alojado de Shopify? | Afecta la promesa del Módulo 07 ("facturas y pedidos descargables"). Ver DECISIONES_BRENSON.md §Cuentas nuevas |
| 8 | ¿Qué apps siguen instaladas en la tienda que haya que desinstalar? (Ryviu, A2Reviews, GemPages, Quantity Offers, AddZap, notificaciones de compra falsas — decisión F1) | Pueden estar generando el contenido/comportamiento indebido que motivó rehacer el tema |
| 9 | Pasarelas de pago configuradas (decisión F4) — sin verificar | Necesario para checkout B2C y B2B |
| 10 | Facturación electrónica: ¿qué app la emite? (decisión I8–I9) | El dashboard de cliente promete "facturas descargables" |
| 11 | WhatsApp: ¿es Business App o API? (decisión E3) | Define si hay respuestas automáticas fuera de horario |

### 4.2 Contenido y material que falta entregar o confirmar

| # | Ítem | Estado |
|---|---|---|
| 12 | **Logo en formato web** (PNG transparente o SVG) | Tenemos el vector oficial (PDF/AI) pero no hay herramienta de conversión en este entorno — Brenson o Luis debe exportarlo |
| 13 | **Contadores reales**: vehículos vendidos, clientes/empresas, años de operación, ciudades con entregas | Hoy son valores de ejemplo (250 / 120 / 6 / 18), sin `verificado: true` |
| 14 | **Testimonios**: hay videos reales en el material entregado (peluquería, furgón panadería, silla de ruedas, casos de éxito) sin transcribir ni cargar; los 6 testimonios de texto actuales siguen `verificado: false` | Pendiente decidir cuáles se usan y cargarlos |
| 15 | **Fotos de asesores**: el material trae 4 fotos institucionales (Diana, Juliana, Sandra, Yessica) que **no calzan por nombre** con los 4 asesores ya cargados (Laura Martínez, Andrés Gómez, Camilo Ruiz, Diana Torres) — falta aclarar la correspondencia | Bloquea completar `brenson_asesor` con fotos reales |
| 16 | **Specs técnicas de los 12 vehículos "legacy"** (Corato, Dakota, Dallas, Furgón, Maxi, Milán, Mobility, Monaco, Platón, Vera, Verona, Zero): fotos ya migradas por completo (17-sep), pero faltan autonomía, velocidad, carga, batería, garantía por modelo para migrarlos a metafields `brenson.*` | Sin esto no se pueden usar en catálogo/filtros/simulador como los otros 12 |
| 17 | **Clientes corporativos actuales a migrar** (decisión D11) — lista con NIT y tier | Pendiente de entrega |
| 18 | **Textos legales**: política de privacidad, términos y condiciones, garantía/devoluciones/retracto (decisión G6) | Pendiente de entrega |
| 19 | **Tiempos de envío por región** (decisión B18) | Pendiente de entrega |
| 20 | **Manual de marca**: versión 001 de 2022 — ¿sigue vigente o hay una actualización más reciente? | El documento recibido tiene esa fecha; vale la pena confirmar antes de darlo por definitivo |

---

## 5. Todo lo pendiente que NO depende de Brenson (trabajo técnico)

| # | Tarea | Bloqueado por |
|---|---|---|
| 1 | Reinstalar "Brenson Admin Scripts" en Admin → API credentials para que el token reciba `read_themes`/`read_discounts`, y con eso verificar el estado real del tema publicado y de la Function de descuento B2B | Acción de Brenson/Luis en el Admin |
| 2 | Habilitar R2 en Cloudflare y crear los buckets (`brenson-b2b-docs`, `-dev`). **Verificado el 18-sep: R2 sigue apagado** (`wrangler r2 bucket list` → `code: 10042`). Ahora es más grave que antes: con el alta corporativa ya funcionando, el paso 2 del registro responde 200 pero **el documento no se guarda en ningún lado** y deja `documento_tipo` escrito sin `documento_url` (Shopify rechaza el valor `local://…` porque el metafield es de tipo `url`). El admin ve "cámara de comercio" y no hay archivo. Hasta habilitarlo, tratar el paso 2 como no funcional | Tarjeta de pago disponible |
| 2b | **Correo real del worker**: `MAIL_PROVIDER = "console"`, así que el aviso "Solicitud B2B: <empresa>" se escribe en el log y muere ahí. **Nadie en Brenson se entera de una solicitud nueva**, y el flujo queda esperando una aprobación que nadie sabe que debe hacer. Falta `RESEND_API_KEY` + dominio `brenson.co` verificado en Resend, y cambiar `MAIL_PROVIDER` a `"resend"` en `wrangler.toml` | Cuenta de Resend con el dominio verificado |
| 2c | ✅ **Turnstile activo (21-sep)**: widget "Brenson formularios" (dominios brenson.co y brenson-0.myshopify.com, modo managed), site key en los ajustes del tema de staging y `TURNSTILE_SECRET` en el worker. Se corrigieron tres huecos que habrían bloqueado envíos legítimos: el layout `theme.empresas` no cargaba el widget (registro B2B y contacto de Empresas), y exit intent y la consulta de cupo Addi no enviaban token. Nuevo `window.brensonTurnstile(root)`: lee el token y reinicia el widget (el token es de un solo uso; sin reset, un reintento fallaba). Verificado: sin token o con token falso → 403. **Pendiente**: probar un envío real desde el navegador en la vista previa. **Ojo al publicar**: el tema publicado hoy ("Brenson Theme") no llama al worker; el nuevo sí envía token | — |
| 2d | **`git push` pendiente**: commits locales sin subir a GitHub (`83b06d4` limpieza de plantillas de Dawn, `585e9a7` arreglo del 502 + Turnstile + URL del servicio, más lo de la tarde del 18-sep) | Solo falta ejecutarlo |
| 2e | **Unidades en flota: mismo bug de referencia que tenían las cotizaciones.** `brenson-b2b-dashboard` filtra las unidades con `u.cliente.value.id`, un `customer_reference` que no resuelve de forma fiable en Liquid del storefront. En las cotizaciones se resolvió agregando un campo `cliente_id` de texto plano al metaobjeto y filtrando por él; en `brenson_unidad` **no se hizo**, porque las unidades hoy no las crea el worker sino que se cargan a mano, así que hay que definir primero quién llena ese campo al registrar una unidad. Hoy no se nota porque no hay unidades cargadas para ningún cliente real: el día que se carguen, "Mis unidades en flota" y los KPI de unidades y garantías van a salir en cero. Arreglo: agregar `cliente_id` a la definición `brenson_unidad`, rellenarlo en la carga, y cambiar las 2 líneas del dashboard que ya quedaron con `default:` esperando ese campo | Definir el proceso de alta de unidades |
| 2f | **El "PDF" de cotización no es un PDF.** Con `PDF_PROVIDER = "html"` el worker guarda el HTML en KV y lo sirve en una URL terminada en `.pdf`: se ve en el navegador, pero no se puede adjuntar a un correo ni archivar. El PDF real que promete el Módulo 08 necesita `PDFMONKEY_API_KEY` y las dos plantillas (`PDFMONKEY_TEMPLATE_QUOTE`, `PDFMONKEY_TEMPLATE_SPEC`). El código del proveedor ya está escrito con reintentos, solo falta la cuenta | Cuenta de PDFMonkey |
| 2h | ~~El ciclo comercial se corta en la cotización~~ **Resuelto (Opción A, 19-sep)**: "Aceptar cotización" → `POST /quotes/:numero/accept` → pedido borrador con precio congelado, probado en staging. **Sigue abierto**: la Función de descuento por tier **no está desplegada** (`automaticDiscountNodes` = 0, el build se cuelga) — un carrito B2B paga precio público. Detalle: **[FLUJO_COTIZACION_A_PEDIDO.md](FLUJO_COTIZACION_A_PEDIDO.md)** §5 | Build de la Function (técnico) |
| 2i | **Totales de cotización se mostraban en $0** (corregido el 18-sep) con el snippet `brenson-money-metafield`. El mismo patrón latente en `brenson-price.liquid` (`cuota_desde_override`) **quedó blindado el 21-sep**: toma `.amount` o el valor directo, y si no da un número positivo calcula la cuota normal | — |
| 2j | **Las 3 cotizaciones de prueba tienen el PDF desfasado**: al renumerarlas para quitar los números duplicados no se actualizó `pdf_url` ni el HTML guardado, así que el portal dice COT-2026-0004/0005/0006 y el documento dice 0001/0002/0003. Son datos de prueba del 18-sep: lo más limpio es borrarlas y generar una nueva | Confirmar con Luis antes de borrar |
| 2g | **Sello "DOCUMENTO DE PRUEBA · modo simulación" en las cotizaciones.** Es intencional y correcto: lo pone `quote.ts` cuando `ENVIRONMENT !== 'production'`. Desaparece al pasar el worker a producción. Anotado para que no se confunda con un error y para que **no se olvide cambiar `ENVIRONMENT` en el go-live**, o las cotizaciones reales saldrían marcadas como prueba | Parte del lanzamiento |
| 3 | Fotos de los 12 vehículos "legacy" migradas por completo (17-sep). Falta cargar metafields `brenson.*` en cuanto lleguen las specs (ítem 16 de la tabla anterior) | Contenido de Brenson |
| 3b | **Carrusel de videos (testimonios + casos de éxito): COMPLETO** (17-sep sesión 4). Sección nueva `sections/brenson-video-carousel.liquid` en el home, entre "casos" y "prueba_social" — mismo patrón de interacción que `brenson-case-studies-carousel.liquid` (scroll-snap + flechas + dots, sin autoplay, sin bloquear scroll). Campo `video` (file_reference) agregado a los metaobjects `brenson_testimonio` y `brenson_caso_uso`. Se subieron los 9 videos reales (3 de `testimonios/`, 6 de `CASOS DE EXITO/`) y se crearon 9 entradas `brenson_caso_uso` con `verificado: true` — los 3 de `testimonios/` no tienen nombre de cliente identificable en el material recibido, así que el título describe la escena sin inventar quién es la persona; los de `CASOS DE EXITO/` usan el pie de foto real de Brenson tomado del nombre de archivo. Scripts nuevos: `scripts/add-video-field.mjs`, `scripts/import-video-testimonials.mjs`. | — |
| 3c | **Pendiente de limpieza manual**: al hacer `theme push --theme "Brenson Staging"` (por nombre) se creó un tema duplicado `143037464651` en vez de actualizar el real `143001354315` — el push correcto ya se rehizo por ID contra `143001354315` (verificado con pull+grep) en todas las subidas de esta sesión. El intento de borrar el duplicado con `shopify theme delete` fue bloqueado por el modo de permisos del entorno (eliminación irreversible). Bórralo manualmente desde Admin → Tienda online → Temas, o autoriza el comando `shopify theme delete --theme 143037464651 --store brenson-0.myshopify.com --force`. **Lección para próximas sesiones: usar siempre `--theme <ID numérico>` en vez de `--theme "<nombre>"` al hacer push**, porque el nombre no resuelve de forma confiable al tema existente. | Acción manual de Luis, o permiso explícito para el comando de borrado |
| 4 | **Videos de producto en la ficha: 15/15 subidos** (17-sep sesión 4). 8 identificados con certeza por nombre de archivo → subidos como media nativa del producto vía `productCreateMedia` (`scripts/import-product-videos.mjs`; Dawn ya renderiza `media_type: 'video'` en la galería, no hizo falta tocar Liquid): Dakota, Platón (2 videos), Vera, Verona, Furgón, Monaco, Zero. Los otros 7 (`0202.mp4`, `1200.mp4`, `1202.mp4`, `130101.mp4`, `2701.mp4`, `3001.mp4`, `IMG_2931.MOV`) no tenían nombre identificable — por indicación explícita de Luis se subieron igual, pero como **archivos sueltos sin producto asignado** (`scripts/import-unmapped-product-videos.mjs`, `fileCreate`, alt text "SIN ASIGNAR — pendiente de identificar modelo"), visibles en Admin → Contenido → Archivos. | **Pendiente**: arrastrar cada uno de los 7 al producto correcto desde el Admin cuando se sepa qué modelo es |
| 5 | **Excluir baterías/cargadores sueltos del catálogo (decisión B5): sin tocar** — solo se ejecuta si Brenson ya confirmó que dejaron de venderse sueltos. | Confirmación de Brenson (sin novedad esta sesión) |
| 7 | **Campos de vocero en `brenson_caso_uso`: estructura completa** (17-sep sesión 4) — `vocero_nombre`, `vocero_cargo`, `vocero_foto` (`scripts/add-vocero-fields.mjs`), y `sections/brenson-case-studies-carousel.liquid` ya los renderiza si `vocero_nombre` está cargado. **Sin contenido**: ninguna de las entradas existentes de `brenson_caso_uso` (incluidas las 9 de video nuevas) tiene vocero cargado — no se inventó ningún nombre/cargo. | Nombre/cargo real por caso, a confirmar con Luis/Brenson |
| 4 | Excluir baterías y cargadores sueltos del catálogo nuevo (decisión B5, "sin accesorios ni repuestos") — confirmar primero si siguen vendiéndose activamente antes de tocar nada | Confirmación de Brenson |
| 5 | Subir el logo real una vez llegue en PNG/SVG | Punto 12 de la tabla anterior |
| 6 | Publicar el tema a producción cuando el contenido esté completo | Todo lo anterior |
| 7 | Configurar webhooks Shopify → `brenson-services` → GHL, una vez se confirme si GHL existe | Punto 5 de la tabla anterior |

---

## 6. Referencias

- Roadmap técnico completo de 16 semanas: `docs/PLAN_DE_TRABAJO_BRENSON.md`
- Las 107 decisiones originales (11-sep) con su estado ✅/⏳/⚠️: `docs/DECISIONES_BRENSON.md`
- Plan de acción y guion de presentación a Brenson: `docs/PLAN_ACCION_Y_PRESENTACION.md`
- Pasos de despliegue paso a paso (parcialmente desactualizado en fechas de estado, vigente en comandos): `docs/GUIA_PUBLICACION.md`
- Matriz de pruebas: `docs/QA_MATRIZ.md`
- Contenido real recibido: `.tmp_extract/DOC PAGINA WEB/` (extraído del ZIP de Brenson; carpeta temporal de trabajo, no versionar en git)
