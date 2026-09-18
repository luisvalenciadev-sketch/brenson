# Prompt de continuación — sesión 17-sep-2026 (parte 4): carrusel de videos (tarea 3)

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify). La sesión anterior (parte 3) se cortó por un problema de entorno más profundo que las veces anteriores: no solo Bash y PowerShell dejaron de responder, sino que **todas las herramientas que lanzan procesos externos fallaron**, incluyendo Glob/Grep (error `ENOENT: no such file or directory, uv_spawn 'rg'`). Solo Read/Write/Edit seguían funcionando. No es un problema del proyecto — simplemente no se pudo ni siquiera explorar el código al final de esa sesión. Retoma la tarea 3 desde cero en la nueva sesión (el entorno debería estar limpio).

**Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md` completo** — es la fuente de verdad del estado general.

## Lo que se completó en la sesión anterior (parte 3, no lo repitas)

### Tarea 2 — Migrar fotos de los 12 vehículos legacy: **COMPLETA**

- Los 12 productos legacy (Corato, Dakota, Dallas, Furgón, Maxi, Milán, Mobility, Monaco, Platón, Vera, Verona, Zero) YA tenían fotos parcialmente subidas de una sesión sin documentar previa. Se escribió `scripts/diff-legacy-media.mjs` (normaliza nombres de archivo quitando tildes/espacios/sufijo "copia" y compara local vs. ya-subido) para detectar qué faltaba.
- Se escribió `scripts/import-legacy-vehicle-photos.mjs` con la lista exacta de archivos faltantes por producto (62 archivos en total) y se subieron vía `stagedUploadsCreate` → upload multipart → `productCreateMedia`. **El usuario ejecutó la subida y confirmó verbalmente que el re-diff dio 0 faltantes en los 12 productos** (no se vio el output completo del re-diff, solo la confirmación del usuario — si en algún momento hay dudas sobre alguna foto faltante de un producto legacy específico, correr `node scripts/diff-legacy-media.mjs` de nuevo para descartarlo, pero no es necesario re-verificar de entrada).
- `docs/ESTADO_GENERAL_18SEP2026.md` ya se actualizó reflejando que las fotos de los 12 legacy están migradas (fila de Catálogo en §2, ítem 16 y tarea técnica 3 en §5). **No repitas esa edición.**
- **Sigue pendiente** (sin tocar): metafields `brenson.*` (specs: autonomía, velocidad, carga, batería, garantía) de estos 12 — bloqueado por contenido de Brenson, no es tarea técnica.

### Contexto de acceso (repetido de sesiones anteriores, sigue vigente)

- Tienda: `brenson-0.myshopify.com`. Pide `SHOPIFY_ADMIN_TOKEN` (app "Brenson Admin Scripts") al empezar si necesitas tocar Shopify — no persiste entre sesiones. Ya tiene todos los scopes necesarios (confirmado dos veces, no hace falta re-verificar escopos).
- `SHOPIFY_API_VERSION=2025-07`, `THEME_ID=143001354315` (Brenson Staging).
- Contenido real de Brenson: `.tmp_extract/DOC PAGINA WEB/` dentro del repo (en `.gitignore`, ~870 MB). Si no existe en esta sesión, pide al usuario el ZIP original (`DOC PAGINA WEB-20260917T201504Z-1-001.zip`, estaba en `C:\Users\USER\Downloads\`).
- **Si las herramientas de terminal/búsqueda (Bash, PowerShell, Glob, Grep) fallan de nuevo con errores de spawn/proceso**: no es el proyecto, es el entorno de esta sesión/máquina. No pierdas tiempo reintentando muchas veces — repórtalo al usuario, pide que corra los comandos él mismo desde su propia terminal si es indispensable, y si ni siquiera Read/Write funcionan, para y documenta el corte igual que aquí.
- **Nota técnica de shell**: al escribir scripts Node en el scratchpad o fuera del repo que importen `scripts/lib/shopify-admin.mjs`, usa import con URL `file:///C:/Users/...` (ruta absoluta normal falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME`). Mejor aún: escribe los scripts de una sola vez dentro de `scripts/` para poder usar imports relativos simples (`./lib/shopify-admin.mjs`).

## Tarea 3 — Carrusel de videos de testimonios y casos de éxito (SIN EMPEZAR)

Fuentes de contenido:
- `.tmp_extract/DOC PAGINA WEB/testimonios/`
- `.tmp_extract/DOC PAGINA WEB/CASOS DE EXITO/`

**Primer paso obligatorio**: revisar si ya hay un patrón de carrusel/slider reutilizable en el tema antes de construir uno nuevo. Candidatos a revisar (no confirmados en esta sesión por el corte de herramientas):
- `assets/component-slider.css`
- `sections/slideshow.liquid`
- `sections/brenson-case-studies-carousel.liquid` (existe, es del commit `31c56df` "feat: add brenson-case-studies-carousel section" — revisar si ya cubre parte de lo que se necesita, aunque es para "casos de éxito" en texto, no videos)
- `assets/brenson-b2b-flotas.js`, `assets/brenson-b2b-roi.js` (mencionados en el prompt original como posibles referencias de patrón de carrusel/interacción B2B)

Reglas para el carrusel:
- Sin autoplay con sonido.
- Sin bloquear el scroll de la página.
- Prefijo `brenson-` en cualquier archivo nuevo.
- `npm run theme:check` en 0 errores antes de cada push.
- Después de cada push, verificar con `theme pull --only <archivo>` + grep en el archivo bajado — "pushed successfully" no es confiable por sí solo.

## Tareas 4-7 (sin empezar, sin cambios)

Ver `docs/PROMPT_CONTINUACION_17SEP_PARTE2.md` sección "Tareas 3-7" para el detalle completo si hace falta (videos de producto en ficha, exclusión de accesorios — decisión B5, actualizar documentación, campos de vocero en `brenson_caso_uso`).

## Reglas de trabajo generales (ya vigentes, no las repitas al usuario)

Responde en español; prefijo `brenson-` en archivos nuevos; `npm run theme:check` en 0 errores antes de cada push; después de cada push, verifica con `theme pull --only <archivo>` + grep; nunca escribas tildes/ñ directo en un comando de bash que vaya a Shopify — usa Node con escapes Unicode o edita el archivo con la tool Write y luego súbelo; nunca publiques testimonios/aliados/contadores sin `verificado: true`; no reabras decisiones ya firmadas en `docs/DECISIONES_BRENSON.md`.
