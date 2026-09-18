# Prompt de continuación — 18-sep-2026: migración de catálogo, fotos, videos y carrusel

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify). **Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md` completo** — es la fuente de verdad del estado actual, generada verificando en vivo contra la tienda real, no a partir de suposiciones. No repitas verificaciones que ese documento ya deja resueltas.

## Contexto de acceso

- Tienda: `brenson-0.myshopify.com`. Necesito que me des `SHOPIFY_ADMIN_TOKEN` (app "Brenson Admin Scripts") al empezar — no persiste entre sesiones.
- Cloudflare: `brenson-services` ya está desplegado en `https://brenson-services.brenson.workers.dev` (modo `staging`, proveedores mock). No hace falta redesplegar salvo que cambie el código.
- Herramientas de conversión de PDF/imagen: instalé **Poppler** vía `winget` en la sesión anterior (`pdftocairo`, `pdftoppm`, `pdftotext`). Si en esta sesión no están en el PATH, el binario queda en:
  `C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin`
  Agrégalo al PATH de la sesión de bash antes de usarlo. **Ojo con la resolución**: `pdftocairo -png -r 600` en el logo dio 50 megapíxeles y Shopify lo rechazó (límite 20 MP) — usar `-r 150` o menor para logos/vectores simples.
- Contenido real de Brenson (fotos, videos, manual de marca, garantías, logos de aliados): extraído en `.tmp_extract/DOC PAGINA WEB/` dentro del repo. **Esta carpeta está en `.gitignore`** (pesa ~870 MB) — si no existe en esta sesión, pide al usuario el ZIP original (`DOC PAGINA WEB-20260917T201504Z-1-001.zip`, estaba en `C:\Users\USER\Downloads\`) y vuelve a extraerlo.

## Qué se hizo en la sesión anterior (no lo repitas)

- Backend desplegado, paleta/tipografía de marca corregidas (verde/turquesa real + Ubuntu, no rojo/Montserrat), WhatsApp y dirección de sede corregidos (Cali, no Barranquilla), aliados financieros reales cargados (Addi, Sistecrédito, Banco de Bogotá), **logo real subido y asignado a `settings.logo`** (pendiente que el usuario confirme visualmente que se ve bien, no se pudo verificar con navegador).
- Se corrigió un error propio: los 27 productos que parecían residuos de dropshipping (Corato, Dakota, Dallas, Furgón, Maxi, Milán, Mobility, Monaco, Platón, Vera, Verona, Zero + baterías/cargadores) en realidad son mayormente el catálogo real de Brenson — solo baterías y cargadores sueltos son candidatos a excluir (decisión B5).
- Se detectó y corrigió un incidente de codificación UTF-8 al escribir tildes por bash directamente (usar Node con escapes `\uXXXX` para cualquier texto con acentos que vaya a Shopify vía curl/bash).

## Tareas de esta sesión (todas técnicas, no dependen de respuestas nuevas de Brenson — excepto donde se indique)

### 1. Verificar Function de descuento B2B y estado del tema publicado
El token seguía sin `read_themes`/`read_discounts` al cierre de la sesión anterior pese a dos intentos. Verifica si ya se agregaron (Admin → Apps → Desarrollar apps → Brenson Admin Scripts → API credentials). Si siguen faltando, pide al usuario que reinstale la app y te pase el token actualizado. Con esos scopes, confirma si la Function de descuento por tier ya está activa como descuento automático, y el estado real del tema publicado vs. staging.

### 2. Migrar fotos reales de los 12 vehículos "legacy" a Shopify
Carpetas en `.tmp_extract/DOC PAGINA WEB/Fotografías de productos en alta resolución./`: `corato`, `dakota`, `dallas`, `furgon`, `maxi`, `milan`, `mobility`, `monaco`, `platon`, `vera`, `verona`, `zero`.

- Primero identifica el producto exacto en Shopify que corresponde a cada carpeta (busca por título aproximado: "Cuadriciclo eléctrico Corato", "Ciclomotor Electrico DAKOTA PRO", "Bicicleta Eléctrica Brenson Dallas", "Motocarro Eléctrico CARRY FURGÓN", "Motocarro Eléctrico MAXI", "VELMPU MILÁN 500WATTS 2026", "Ciclomotor Eléctrico Brenson Mobility", "Cuadriciclo eléctrico Monaco", "Moto Carro Eléctrico CARRY PLATÓN", "Ciclomotor electrico VERA 2026", "Ciclomotor eléctrico Verona", "Cuadriciclo Zero" — verifica contra la lista real de productos, no asumas).
- Sube las fotos con el patrón de `scripts/import-catalog-images.mjs` (staged upload → `fileCreate` con `resource: FILE` → `productCreateMedia` para asociarlas al producto → verificar `productsCount`/`featuredMedia`). Sigue el patrón de `scripts/lib/shopify-admin.mjs`.
- **No subas todavía specs (`brenson.*` metafields)** para estos 12 — siguen sin llegar de Brenson (ítem 16 de `ESTADO_GENERAL_18SEP2026.md` §4.2). Solo fotos por ahora; deja los metafields para cuando lleguen las specs.
- Sube en la misma pasada el logo de marca de alta calidad si hace falta un tamaño distinto al ya subido.

### 3. Carrusel de videos (testimonios + casos de éxito)
El usuario pidió explícitamente un **carrusel de videos**, no una grilla estática.

- Fuentes: `.tmp_extract/DOC PAGINA WEB/testimonios/` (3 videos: `Furgon panaderia.mp4`, `perruqueria.mp4`, `silla de ruedas.mp4`) y `.tmp_extract/DOC PAGINA WEB/CASOS DE EXITO/` (varios videos + fotos de la misma historia — revisa cuáles son reutilizables, algunos títulos de archivo son textos largos de redes sociales, úsalos como pista del contenido pero no los copies literal como copy del sitio).
- Antes de construir nada nuevo, revisa si ya existe un patrón de carrusel/slider reutilizable en el tema (`assets/component-slider.css`, `sections/slideshow.liquid`, o los carruseles ya construidos en `brenson-b2b-flotas.js`/`brenson-b2b-roi.js`) para no duplicar lógica.
- Sube los videos a Shopify Files (`resource: VIDEO` en `stagedUploadsCreate`/`fileCreate`; confirma tamaño de cada archivo antes — el límite de Shopify Files para video es 1 GB, pero conviene comprimir si algún .mp4/.MOV pesa mucho).
- Crea una sección nueva (ej. `sections/brenson-video-carousel.liquid` + `assets/brenson-video-carousel.js` si hace falta JS de scroll/snap) siguiendo la convención `brenson-` del proyecto, con controles accesibles (prev/next, o scroll-snap táctil en mobile como ya hacen otras secciones Brenson). Referencia de qué NO hacer: no reproducir autoplay con sonido, no bloquear el scroll de la página.
- Decide con el usuario en qué página va: candidatos son la home (sección de confianza/testimonios ya existente `brenson-testimonials.liquid`/`brenson-social-proof.liquid` — evalúa si se reemplaza o se complementa) y/o una página dedicada de casos de éxito.
- Los 3 testimonios en video son de más peso que los 6 testimonios de texto simulados que hay hoy (`verificado: false`) — considera si esta sesión debe también actualizar esos metaobjects o dejarlo para cuando el usuario confirme cuáles textos van con cada video.

### 4. Videos de producto en la ficha
Carpeta `.tmp_extract/DOC PAGINA WEB/videos de productos /` (15 videos). Algunos tienen nombre reconocible (`DAKOTA verde menta.mp4`, `PLATON.mp4`, `VERA.mp4`, `VERONA.mp4`, `monaco.mp4`, `furgon nuevo.mp4`, `zero.MOV`), otros solo códigos (`0202.mp4`, `1200.mp4`, etc. — pide al usuario que identifique a qué modelo corresponden antes de asignarlos, no adivines). Súbelos y enlázalos vía el metafield `brenson.video_url` de cada producto migrado en la tarea 2, cuando el video sea identificable con certeza.

### 5. Excluir accesorios sueltos (decisión B5) — solo si el usuario lo confirma
Baterías y cargadores sueltos (7 productos "Cargador ...", 3 "Batería ...") siguen activos. **No los archives sin preguntar** — la sesión anterior dejó esto como decisión pendiente porque podrían seguir vendiéndose en la tienda actual. Empieza esta tarea preguntando al usuario si ya tiene respuesta de Brenson.

### 6. Actualizar documentación
Al cerrar, actualiza `docs/ESTADO_GENERAL_18SEP2026.md` (o crea la versión de la fecha de esta sesión) con lo que se completó, siguiendo el mismo formato verificado-no-asumido.

### 7. Agregar campos de vocero al metaobject `brenson_caso_uso` (pendiente de sesión de ajustes visuales, 17-sep-2026)
En esa sesión se rediseñó la sección de "Casos de éxito" de `/pages/empresas-proceso` como tarjeta destacada en carrusel (`sections/brenson-case-studies-carousel.liquid`), siguiendo el mockup `stitch-design/16-empresas-proceso/`. El mockup incluye avatar + nombre + cargo de un vocero del cliente (ej. "Ing. Rodrigo Carvajal, Director Nacional de Flotas y Mantenimiento"), pero el metaobject `brenson_caso_uso` (definido en `docs/metafield-definitions.json`) **no tiene esos campos** — solo `titulo`, `cliente`, `resumen`, `imagen`, `vehiculos`, `metricas`, `verificado`. No se inventó ese nombre/cargo porque sería contenido falso presentado como real.

Pendiente:
- Agregar a la definición de `brenson_caso_uso` (o a un metaobject relacionado) campos para el vocero: nombre, cargo y foto. Evaluar si conviene reutilizar el metaobject `brenson_testimonio` ya existente (tiene `nombre`, `empresa`, `ciudad`, `texto`, `foto`, `vehiculo`, `verificado`) en vez de duplicar campos — hoy no está conectado a `brenson_caso_uso` (no hay `metaobject_reference` entre ambos).
- Una vez definidos los campos, actualizar `sections/brenson-case-studies-carousel.liquid` para renderizar el bloque de avatar+nombre+cargo (el markup y CSS del mock ya están documentados en el comentario de cabecera de esa sección).
- Pedir al usuario los datos reales del vocero antes de publicar (nunca fabricar un nombre/cargo).

También quedaron pendientes de contenido (no de código) de esa misma sesión, ambos ya diagnosticados y con el código listo para cuando se cargue el dato:
- Metaobject `brenson_aliado`: subir el campo `logo` de cada aliado (Addi, Banco de Bogotá, Comfandi, etc.) — el CSS ya soporta fila horizontal, hoy cae al texto de respaldo por falta de imagen.
- Metaobject `brenson_caso_uso`: completar `metricas.unidades` y `metricas.km_mes` en los casos "Parque Tayrona [MOCK]" y "Logística Caribe S.A.S. [MOCK]" — están vacíos (antes se mostraba la etiqueta sin número; ya se corrigió para que si falta el dato, esa métrica no se muestre en absoluto).

## Reglas de trabajo (ya vigentes en el proyecto, no las repitas al usuario)

Responde en español; prefijo `brenson-` en archivos nuevos; `npm run theme:check` en 0 errores antes de cada push; **después de cada push, verifica con `theme pull --only <archivo>` + grep** — "pushed successfully" no es confiable por sí solo (se ha visto quedarse colgado sin avisar); nunca escribas tildes/ñ directo en un comando de bash que vaya a Shopify — usa Node con escapes Unicode; nunca publiques testimonios/aliados/contadores sin `verificado: true`; no reabras decisiones ya firmadas en `docs/DECISIONES_BRENSON.md`.
