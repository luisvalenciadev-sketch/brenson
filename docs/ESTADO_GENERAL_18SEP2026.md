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
| Function de descuento B2B (`brenson-b2b-functions`) | ❓ No verificable todavía | El token de "Brenson Admin Scripts" sigue sin `read_themes`/`read_discounts` pese a dos intentos de agregarlos — falta reinstalar la app en Admin → API credentials |
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
| 2 | Habilitar R2 en Cloudflare y crear los buckets (`brenson-b2b-docs`, `-dev`) | Tarjeta de pago disponible |
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
