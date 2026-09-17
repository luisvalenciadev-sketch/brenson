# Plan de Acción y Guía de Presentación — Cierre de Sprint 1 y validación visual

Fecha: 17 de septiembre de 2026.
Contexto: la *Propuesta de desarrollo* (Enlaces Digitales) fue aceptada y aterrizada en `PLAN_DE_TRABAJO_BRENSON.md` + `DECISIONES_BRENSON.md` el 11-sep-2026. Este documento responde a dos preguntas: **¿en qué estado estamos hoy respecto a esa propuesta?** y **¿qué hay que hacer, y cómo presentarlo, para cumplir con lo pactado?**

> **Corrección sobre la primera versión de este documento:** `ESTADO_CONSTRUCCION.md` y `GUIA_PUBLICACION.md` describen el estado al 11-sep, cuando nada estaba en la tienda real. Desde entonces el proyecto avanzó directamente en Shopify (fuera de los commits de `docs/`) y esos dos archivos quedaron desactualizados en el punto más importante: si el sitio está publicado o no. Este documento usa el estado real, confirmado por trabajo de sesiones posteriores (`docs/CONTINUACION_VALIDACION_PANTALLAS.md`).

---

## 1ter. Contenido real recibido de Brenson (ZIP "DOC PAGINA WEB", 18-sep-2026)

Brenson entregó un ZIP con manual de marca, logo vectorizado, fotos de producto por modelo, garantías, logos de aliados, fotos institucionales y testimonios. Extraje y verifiqué el contenido (no solo lo até por nombre de carpeta). Cambia dos conclusiones anteriores de este documento.

### Corrección importante: los "27 productos legacy" NO son residuos de dropshipping

Las carpetas de fotos del ZIP se llaman `corato`, `dakota`, `dallas`, `furgon`, `maxi`, `milan`, `mobility`, `monaco`, `platon`, `vera`, `verona`, `zero` — **coinciden exactamente** con los nombres de los productos que en la auditoría del 17-sep marqué como "residuos del catálogo anterior" (ej. "Cuadriciclo eléctrico Corato", "Ciclomotor Electrico DAKOTA PRO", "Moto Carro Eléctrico CARRY PLATÓN"). **Son el catálogo real y actual de Brenson**, no basura de EDrop — cada uno con 5 a 12 fotos de producto en alta resolución. Retiro la recomendación de archivarlos: en vez de eso, son candidatos directos a migrar al modelo de metafields nuevo (`brenson.*`) junto con los 12 "Brenson [Modelo]" que ya lo tienen. Las baterías y cargadores sueltos sí siguen siendo candidatos a excluir del catálogo nuevo por la decisión B5 ("sin accesorios ni repuestos"), eso no cambia.

### Contenido real confirmado (leído directamente, no asumido por nombre de archivo)

| Ítem | Antes (placeholder/pendiente) | Ahora (real, del ZIP) |
|---|---|---|
| Logo | Wordmark provisional en `snippets/brenson-wordmark.liquid` | Vector oficial en negro, alta resolución (`logo editable vectorizado.pdf` + `.ai`). Icono: escudo + rayo. Listo para exportar a SVG/PNG y subir como `settings.logo`. |
| Colores de marca | `brenson-tokens.css` usa rojo `#ee0000` + carbón `#050709` + Montserrat (heredado de la auditoría del tema **viejo** EDrop, nunca del manual real) | Manual de marca real: degradado verde lima (`#96ed0b`→`#29a800`), azul/turquesa `#02b2b2`, gris oscuro `#1e1e1e`, blanco. **Ninguno de estos colores está en el tema actual.** |
| Tipografía | Montserrat 700/500 (mismo origen: inferido del tema viejo) | Manual real: **Ubuntu** (texto/contenido) + **Dancing Script** solo para títulos/palabras clave — tipografías completamente distintas a Montserrat. |
| Garantía de baterías | Metafield sin valor confirmado | **Real: 6 meses desde la compra.** Se anula si: sulfatada, inflada, golpeada, en descarga profunda, o pérdida >20% de capacidad sin mantenimiento oportuno. |
| Garantía de cargadores | Sin valor | **Real: 6 meses por defectos de fábrica.** No cubre golpes, derrames, sobrecargas, cables fracturados, manipulación o modificación no autorizada. |
| Garantía de repuestos/mano de obra | Sin valor | **Real: mano de obra 5 días calendario desde la entrega; repuestos 30 días calendario**, solo si los instaló el taller Brenson y sin mal uso/golpes/intervención de terceros. |
| Certificado de garantía general (vehículo) | `[BORRADOR: términos legales pendientes]` en la FAQ | Documento real "Certificado de Garantía" con 9 causales de anulación (A–I): batería sulfatada/inflada/>20% pérdida sin mantenimiento, cableado fundido, daño por mal uso, mantenimiento no realizado o no reportado a `contacto@brenson.co` en 15 días hábiles, modificaciones no autorizadas, agentes de limpieza/piezas no autorizados, condiciones eléctricas inadecuadas, certificado no devuelto firmado. **Sigue faltando el número de meses/cobertura del vehículo completo (motor/estructura)** — este documento solo cubre las causales de anulación, no el plazo. |
| Aliado financiero | `"Aliado Financiero [BORRADOR]"` (un solo campo en el metaobject) | **Reales, y son 3, no 1: Addi, Sistecrédito, Banco de Bogotá** (logos confirmados). El metaobject `brenson_parametros_financiacion.aliado_nombre` solo tiene espacio para uno — hay que decidir si el simulador muestra los 3 o uno como principal. |
| WhatsApp | `+57 316 482 0543` usado en `brenson_asesor` y en el tema | **Conflicto:** las piezas de garantía oficiales (2026) muestran `+57 301 2915915`. Dos números distintos en material oficial — hay que confirmar cuál es el vigente antes de publicar. |
| Dirección / ciudad | Sin metafields de tienda cargados | **Real: Calle 29 #4B-28, B/ Porvenir**, teléfono fijo `(602) 386-3102` → indicativo de **Cali**. Instagram/TikTok/Facebook: `@brensoncol`. |
| Fotos de producto | 9 de 12 SKUs "Brenson [Modelo]" con foto real, 3 prestadas | El ZIP trae fotos propias para Dallas, Verona, Corato, Dakota, Furgón, Maxi, Milán, Mobility, Monaco, Platón, Vera, Zero — cubre exactamente los 3 que faltaban (con nombres distintos a los "Brenson [Modelo]", hay que mapear cuál corresponde a cuál SKU). |
| Testimonios/casos de éxito | 6 testimonios de texto sin `verificado`, sin foto en 4 de 6 | Videos reales de clientes (peluquería, furgón panadería, silla de ruedas) + fotos "CASOS DE ÉXITO" — de mayor peso probatorio que el texto simulado actual. |
| Asesores/fotos institucionales | 4 asesores con nombre real, sin foto | Carpeta `fotos institucionales` con 4 fotos (diana, juliana, sandra, yessica) — **falta confirmar si son las mismas 4 personas ya cargadas como `brenson_asesor`** (los nombres no calzan 1 a 1: hoy tenemos Laura, Andrés, Camilo, Diana; el ZIP trae Diana, Juliana, Sandra, Yessica). |

### Conflictos — resueltos el 18-sep y ya ejecutados

1. **Paleta y tipografía** → corregir ahora. Hecho: `brenson-tokens.css` reescrito con los colores reales del manual (verde marca `#29a800`/`#96ed0b`, turquesa `#02b2b2`, gris `#1e1e1e`) manteniendo los nombres de variable para no tocar 38 archivos; tipografía Ubuntu + Dancing Script cargada vía Google Fonts en `theme.liquid`. Verificado en remoto (pull + grep) tras el push.
2. **WhatsApp** → `+57 301 2915915` es el vigente. Hecho: actualizado en los 4 `brenson_asesor`, `settings_data.json`, `settings_schema.json`, `brenson-whatsapp-link.liquid`, `footer-group.json`, `brenson-footer.liquid`, `brenson-json-ld.liquid` (vía el setting) y `mock-data/`. Verificado en remoto.
3. **Aliado financiero** → mostrar los 3. Hecho: `Addi` (renombrado desde el placeholder), `Sistecrédito` y `Banco de Bogotá` creados como `brenson_aliado` con `verificado: true`; `aliado_nombre` del simulador actualizado a los 3 nombres. *Nota técnica: el primer intento de escribir los nombres con tilde por bash quedó corrupto (`Sistecr�dito`) por un problema de codificación UTF-8 al pasar acentos por la shell — se corrigió reescribiendo con Node y escapes Unicode explícitos, y quedó verificado con una relectura.*
4. **Garantía general del vehículo (meses)** → sigue sin resolver, el material del ZIP solo trae las 9 causales de anulación, no el plazo. Pendiente de preguntar a Brenson directamente.

### Bonus encontrado y corregido: dirección de la sede era la de la agencia, no la de Brenson

`brenson_sede_direccion`, el footer y el JSON-LD de Organization decían **"Barranquilla"** — esa es la ciudad de Enlaces Digitales (la agencia, ver portada de la propuesta), no la de Brenson. El material real de garantías confirma indicativo `(602)` = **Cali**, dirección `Calle 29 #4B-28, B/ Porvenir`. Corregido en `settings_data.json`, `settings_schema.json`, `footer-group.json`, `brenson-footer.liquid` y `brenson-json-ld.liquid`, verificado en remoto. **No toqué** las listas de "ciudades de entrega/prueba de manejo" (anuncio, header, ROI B2B) porque esas sí podrían ser multi-ciudad reales sin evidencia para confirmarlas — quedan pendientes de validar con Brenson, no corregidas a ciegas.

### Sigue bloqueado: logo real

No hay herramientas de conversión de PDF/imagen en este entorno (`pdftocairo`, ImageMagick, Inkscape, Ghostscript — ninguna instalada). El logo vectorial oficial (`logo editable vectorizado.pdf` / `.ai`) se pudo leer y confirmar visualmente, pero no pude generar un PNG/SVG apto para subir como `settings.logo`. Se necesita que Luis exporte un PNG (fondo transparente, ~800px) o SVG desde el `.ai` en su máquina, o que Brenson lo tenga ya exportado en otro lugar.

---

## 1bis. Auditoría en vivo — 17-sep-2026, verificada contra `brenson-0.myshopify.com`

Consultada directamente vía Admin API (no inferida de documentos). Reemplaza cualquier ❓ anterior de este documento.

| Frente | Hallazgo verificado |
|---|---|
| **Cloudflare / `brenson-services`** | ✅ **Desplegado el 17-sep.** `https://brenson-services.brenson.workers.dev` — `GET /health` responde `{"ok":true,"env":"staging","providers":{"crm":"mock","mail":"console","pdf":"html","storage":"local"}}`. KV creado, dominio corregido a `brenson-0.myshopify.com`, secretos `SHOPIFY_ADMIN_TOKEN` y `QUOTE_SIGNING_SECRET` configurados. R2 (documentos B2B) sigue pendiente: hay que habilitarlo manualmente en el Dashboard de Cloudflare (Account Home → R2 → Enable) antes de activar `STORAGE_PROVIDER=r2`; mientras tanto el endpoint `/upload` responde 501. |
| **Webhooks Shopify → GHL** | ❌ **0 webhook subscriptions activas** en la tienda. No hay ninguna integración enviando datos a GoHighLevel ni a ningún otro sistema todavía. |
| **Clientes B2B** | 🔶 4 clientes con tags reales (`cliente-corporativo` x3, `b2b-pendiente` x1) — son los mocks de `mock-data/`, no clientes reales. |
| **Search & Discovery (facetas)** | ✅ **Confirmado con captura del staging (18-sep).** `/collections/ciclomotores` en el tema Staging muestra las 7 facetas correctas: Categoría, Uso recomendado, Autonomía/Velocidad/Carga (tramo), Financiable, Requiere licencia, más Precio. Catálogo se ve como se diseñó: cuota mensual protagonista, badge Certificado Brenson. |
| **Function de descuento B2B** | ❓ **No verificable con este token** — el token de la app "Brenson Admin Scripts" no tiene los scopes `read_themes` ni `read_discounts`. Se intentó agregar los scopes dos veces sin éxito (la API sigue devolviendo la lista antigua) — falta el paso de reinstalar la app en Admin → API credentials para que el token existente los reciba. |
| **Tema publicado vs. staging** | 🔶 Confirmado que sigue **sin publicar** — la vista sin `?preview_theme_id=` en `brenson.co` corresponde a la sesión de preview del editor de temas en el navegador, no al tema en producción. |
| **Financiación** (`brenson_parametros_financiacion`) | Tasa 1.9 % mensual, plazos 12/24/36/48, iniciales 0/10/20/30 % ya cargados. **Pero** `aliado_nombre = "Aliado Financiero [BORRADOR]"` y el disclaimer legal dice literalmente *"[BORRADOR: pendiente revisión legal]"*. No está claro si el 1.9 % es la tasa real aprobada o un valor de simulación — confirmar. |
| **Tiers B2B** (`brenson_tier_b2b`) | 3 tiers cargados: 10+ u. / 8 %, 20+ u. / 12 %, 50+ u. / 18 %. Sin marcador `[MOCK]`, pero `DECISIONES_BRENSON.md` (D2, 11-sep) decía "Brenson entrega los %" como pendiente — confirmar si estos 3 números ya son los reales. |
| **Certificación Brenson** | Checklist de 12 puntos ya redactado y completo, pero el propio texto dice *"[BORRADOR: proceso a validar en workshop con Brenson]"*. **No se debe publicar el badge tal cual está** hasta ese workshop. |
| **Aliados/logos** (Parque Tayrona, Comfandi, IsaMotos) | Ya fueron **autorizados en decisiones (B16, 11-sep)**, pero las 3 entradas siguen con `[MOCK]` en el nombre y `verificado: false`. Esto es una tarea de sincronizar una decisión ya tomada, no de esperar más a Brenson. |
| **Testimonios** (6) y **contadores** (4) | Todos con `verificado: false`. B17 decía que ya hay testimonios reales autorizados — falta confirmar cuáles corresponden a los 6 cargados y marcarlos. Los contadores (250 vehículos, 120 clientes, 6 años, 18 ciudades) parecen valores de ejemplo sin confirmar. |
| **FAQ** (20 preguntas) | 10 tienen `[VALIDAR]` en el texto (licencia, SOAT, tarifa de carga, cobertura de garantía, ciudades de servicio). Las otras 10 (sobre todo las de ciclomotores/bicicletas con normativa citada) están redactadas sin marcador — revisar si de verdad ya fueron validadas o solo se les olvidó el tag. |
| **Asesores** (4) | Nombre, WhatsApp y correo sin marcador `[MOCK]` — parecen datos reales ya cargados correctamente. |
| **Catálogo — hallazgo nuevo y serio** | La tienda tiene **39 productos activos**, no 12. Los 12 "Brenson [Modelo]" son el catálogo nuevo con specs completas (metafields `brenson.*`). **Los otros 27 son residuos del catálogo anterior de dropshipping**: baterías sueltas, cargadores, "PATINETA POTENZA/PRAGA", "Moto Carro Eléctrico CARRY PLATÓN", etc. — sin ninguna spec `brenson.*`, y **activos**, lo que significa que probablemente aparecen en colecciones, búsqueda y sitemap. Esto contradice directamente la decisión B5 ("sin accesorios ni repuestos") y el hallazgo A6 de la auditoría original (residuos de otra tienda). **Decisión pendiente, no ejecutada:** podrían seguir generando ventas reales en la tienda actual — no se archivan unilateralmente; se lleva como punto de decisión a la reunión con Brenson (§3). |

---

## 1. Diagnóstico: propuesta vs. estado real

La propuesta original (16 semanas, 6 fases, 18 módulos) asumía que el desarrollo podía arrancar de inmediato. La auditoría del tema real (`EDrop`, no Dawn) obligó a rehacer desde cero, y esa decisión ya fue aprobada. Ese trabajo no solo está en código: **ya está desplegado en la tienda real de Brenson**, en un tema de staging que se sigue empujando y ajustando activamente.

| Frente | Estado | Evidencia |
|---|---|---|
| Arquitectura, decisiones, metafields definidos | ✅ Cerrado | `PLAN_DE_TRABAJO_BRENSON.md`, `DECISIONES_BRENSON.md` |
| Diseño UI/UX (17 pantallas Stitch: 14 core + 3 Empresas) | ✅ Diseñadas y corregidas contra el tema real | `stitch-design/SCREENS.md`, `stitch-design/REVIEWS.md` |
| Tema `brenson-theme` (18 módulos de la propuesta) | ✅ Código completo, 0 errores Theme Check | `ESTADO_CONSTRUCCION.md` (desactualizado en el punto de despliegue) |
| **Tienda y staging reales** | ✅ **Desplegado y en uso** — `brenson-0.myshopify.com`, tema "Brenson Staging" (ID `143001354315`), preview activo | Memoria de sesión + `CONTINUACION_VALIDACION_PANTALLAS.md` |
| **Catálogo real en Shopify** | ✅ 12 productos cargados con fotos (9 reales de mockup, 3 "prestadas" de un producto similar) | `CONTINUACION_VALIDACION_PANTALLAS.md` |
| **Validación visual tema vs. mockups** | ✅ Completa — las 17 pantallas (14 core + 3 Empresas) validadas contra el tema real, correcciones de `REVIEWS.md` aplicadas | `CONTINUACION_VALIDACION_PANTALLAS.md` |
| Backend `brenson-services` (leads, PDF, webhooks) | ✅ Código completo | ❓ Sin confirmar si ya se desplegó a Cloudflare — verificar en esta sesión antes de asumir |
| Function B2B (descuento por tier) | ✅ Código completo | ❓ Sin confirmar si ya se activó en la tienda |
| **Search & Discovery (facetas)** | ❌ Pendiente — requiere activación manual en Admin | `CONTINUACION_VALIDACION_PANTALLAS.md` §"Pendiente conocido" |
| **Logo real de marca** | ❌ Pendiente — se usa wordmark provisional | Idem |
| Contenido real restante (specs completas, tasa, % tiers, garantía, certificación, textos legales) | 🔶 Parcial — 12 productos ya tienen datos, falta el resto del catálogo y los textos/valores de negocio | `DECISIONES_BRENSON.md` |
| GoHighLevel activo | ❓ Sin confirmar | Bloquea Módulos 09/11/16 si no existe |

**Lectura correcta del estado:** el proyecto va considerablemente más adelantado de lo que sugería la documentación escrita — no es "código listo esperando acceso", es **staging real, con catálogo, funcionando y con la validación visual cerrada**. Lo que queda no es destrabar accesos básicos (esos ya se consiguieron) ni corregir pantallas (esas ya están al día), sino: (a) confirmar qué falta de lo que depende de terceros (Cloudflare, Function, GHL, Search & Discovery), y (b) cerrar los entregables de contenido/negocio que Brenson todavía no ha dado. Antes de presentar cualquier plan a Brenson, hay que **verificar en esta sesión** (con `shopify theme pull` y una revisión del Admin) cuáles de los ítems marcados ❓ arriba ya están resueltos, para no repetir el mismo error de presentar información vieja como si fuera el estado actual.

---

## 2. Plan de trabajo (próximas 2 semanas)

Objetivo: la validación visual ya está cerrada. Queda confirmar el estado real de los frentes con ❓ arriba y cerrar los entregables de contenido/negocio que faltan.

### Semana A — Verificar estado real de servicios externos

`brenson-services` ya fue desplegado a Cloudflare el 17-sep (ver §1bis). Queda:

| # | Tarea | Estado | Responsable | Bloqueado por |
|---|---|---|---|---|
| 1 | Agregar los scopes `read_themes` y `read_discounts` a la app "Brenson Admin Scripts" y pasar el token vigente | ⏳ pendiente (token verificado 2 veces, scopes aún sin agregar) | Brenson/Luis | — |
| 2 | Con esos scopes: confirmar estado real del tema publicado vs. staging, y si la Function de descuento por tier ya está activa como descuento automático | ⏳ | Luis | #1 |
| 3 | Corregir `brenson-services/wrangler.toml` (dominio) | ✅ hecho | Luis | — |
| 4 | Activar Search & Discovery con las facetas confirmadas | ✅ hecho — verificado con captura del staging (18-sep) | Luis (Admin) | — |
| 5 | Desplegar `brenson-services` en modo `mock` | ✅ hecho — `https://brenson-services.brenson.workers.dev` | Luis | — |
| 5b | Habilitar R2 en el Dashboard de Cloudflare (Account Home → R2 → Enable, pide método de pago aunque el uso quede gratis) y correr `wrangler r2 bucket create brenson-b2b-docs` + `-dev` | ⏳ | Brenson (habilitar) / Luis (crear bucket) | — |
| 6 | Actualizar `docs/ESTADO_CONSTRUCCION.md` y `docs/GUIA_PUBLICACION.md` con el estado real (tienda desplegada, validación visual cerrada, backend desplegado, 39 productos en catálogo) | ⏳ | Luis | #2 |

### Semana B — Contenido y cierre de negocio

| # | Tarea | Responsable | Bloqueado por |
|---|---|---|---|
| 5 | Logo real de marca (hoy hay wordmark provisional) | Brenson | — |
| 6 | Completar specs, fotos y video del resto del catálogo (más allá de los 12 productos ya cargados) | Brenson | — |
| 7 | Workshop de 45 min: **confirmar si la tasa 1.9 % y los % de tiers (8/12/18) ya son los valores reales o hay que reemplazarlos**, nombre del aliado financiero, garantía por componente, checklist de certificación, textos legales revisados por abogado | Brenson + Luis | — |
| 8 | **Decisión sobre los 27 productos legacy** (baterías, cargadores, patinetas, motos sin specs Brenson): ¿siguen vendiendo hoy en la tienda actual? Si no, se archivan; si sí, se define fecha de retiro | Brenson | — |
| 9 | Sincronizar en los metaobjects las decisiones ya tomadas el 11-sep que no se aplicaron: quitar `[MOCK]` y marcar `verificado: true` en los aliados Parque Tayrona/Comfandi/IsaMotos (B16 ya aprobado) | Luis | Confirmación de Brenson en #7/#8 |
| 10 | Reemplazar los marcadores `[MOCK]`/`[BORRADOR]`/`[VALIDAR]` restantes con los datos de #5–#7 (`node scripts/check-mocks.mjs` para verificar qué queda) | Luis | #5, #6, #7 |
| 11 | Confirmar si GoHighLevel existe; si no, decidir alternativa o posponer Módulos 09/11/16 | Brenson | — |
| 12 | Demo formal de staging a Brenson con el catálogo completo | Luis | #10 |

**Criterio de salida:** `check-mocks.mjs` en verde (o con lista cerrada de lo que falta y por qué), y confirmación explícita del estado de Cloudflare/Function/GHL — nada quedando en la categoría "no sabemos si ya se hizo".

No se reabren decisiones de arquitectura — esas ya están firmadas en `DECISIONES_BRENSON.md`. Este plan es de cierre de validación y de contenido, no de arranque desde cero.

---

## 3. Guía de presentación a Brenson

Objetivo de la reunión: mostrar staging en vivo (no mockups), dejar claro cuánto de la propuesta ya está funcionando, y salir con fecha y responsable para lo que falta: contenido de negocio y confirmación de los servicios externos (Cloudflare, GHL). Duración sugerida: 30 minutos. Audiencia: quien decide en Brenson (no necesariamente técnico).

### Estructura (5 bloques)

**1. Dónde estábamos y qué encontramos (3 min)**
Un cambio de plan justificado, no un problema: el tema activo (EDrop) no era Dawn, tenía código de cloaking de auditorías y notificaciones de compra falsas, y arrastraba datos de otra tienda. Reconstruir sobre Dawn era la única opción compatible con el pilar de CONFIANZA de la propuesta. Esto ya fue aprobado el 11-sep — mencionarlo solo para dar contexto, no para volver a discutirlo.

**2. Demo en vivo del staging (10 min) — es el bloque central, no relleno**
Abrir directamente `https://brenson-0.myshopify.com?preview_theme_id=143001354315` (no capturas, no mockups) y recorrer: home, catálogo con filtros, ficha de un vehículo con el simulador financiero calculando en tiempo real, y el portal Brenson Empresas con un cliente de prueba. Frase clave: *"Esto no es un plan — es la tienda funcionando, con catálogo real, y las 17 pantallas ya validadas visualmente contra el diseño aprobado."*

**3. Qué falta y de quién depende (10 min) — sin culpar, con lista cerrada**
Separar en tres grupos, usando la tabla de la sección 1bis:
- Terminación técnica fina (activar Search & Discovery, desplegar Cloudflare, confirmar GHL) — la hace Luis, no requiere nada de Brenson salvo accesos ya dados.
- Contenido y decisiones de negocio (logo oficial, specs y fotos del resto del catálogo, garantía por componente, checklist de certificación) — esto lo bloquea Brenson.
- **Dos decisiones puntuales que solo Brenson puede tomar, con evidencia concreta para mostrar:**
  1. *"¿La tasa de 1.9 % mensual y los descuentos de 8/12/18 % por tier ya son los valores reales, o son un placeholder que pusimos para poder construir el simulador?"* — mostrar la pantalla del simulador funcionando y preguntar directo.
  2. *"Encontramos 27 productos activos en la tienda (baterías, cargadores, patinetas) que son del catálogo anterior y no encajan en las 4 categorías del proyecto nuevo. ¿Siguen generando ventas? Si no, los archivamos."* — no se toca nada sin esta respuesta, porque podrían estar vendiendo hoy.
Encuadre: *"Lo que depende de nosotros está resuelto o tiene fecha. Lo que falta depende de dos tipos de respuesta suyas: contenido que nos deben, y decisiones que solo ustedes pueden tomar."*

**4. Plan de las próximas 2 semanas (7 min) — la sección 2 de este documento, sin jerga técnica**
Presentar como 2 semanas con nombre y fecha por tarea. Cerrar cada punto de contenido con quién lo entrega y cuándo, en la reunión misma si es posible.

**5. Qué van a ver al final de esas 2 semanas (3 min)**
Catálogo completo con datos reales (no solo 12 productos), logo oficial en lugar del wordmark provisional, y confirmación de que backend/CRM/descuentos B2B están activos o formalmente pospuestos con razón conocida.

### Materiales a llevar
- Laptop con el preview de staging abierto y probado de antemano (evitar imprevistos de conexión en vivo).
- Este documento (o un resumen de 1 página con la tabla de la sección 1).
- Lista de los entregables de contenido pendientes (logo, specs, fotos, tasa, tiers, garantía, certificación) con checkbox, para que se la lleven impresa o por correo al terminar.

### Riesgos a anticipar en la reunión
- Si preguntan "¿por qué el catálogo solo tiene 12 productos?" → es el conjunto usado para validar el tema; el resto entra en cuanto lleguen specs/fotos (ítem #7 del plan), no es una limitación técnica.
- Si preguntan por la fecha final de 16 semanas → aclarar en qué semana del cronograma aprobado estamos realmente (Fase 2 avanzada / inicio de Fase 3), no repetir "estamos en semana 1".
- Si GoHighLevel resulta no existir → no es bloqueante para el MVP B2C; se aísla como decisión aparte (Módulos 09/11/16), no se usa para frenar el resto.
- Si preguntan por algo que este documento marca con ❓ (Cloudflare, Function activa) → no improvisar una respuesta; decir que se confirma antes de la reunión (tarea #1 del plan) y no en el momento.

---

## 4. Referencias

- Plan técnico completo: `docs/PLAN_DE_TRABAJO_BRENSON.md`
- Decisiones ya firmadas: `docs/DECISIONES_BRENSON.md`
- Estado de construcción detallado por módulo: `docs/ESTADO_CONSTRUCCION.md`
- Pasos exactos de despliegue: `docs/GUIA_PUBLICACION.md`
- Matriz de pruebas: `docs/QA_MATRIZ.md`
