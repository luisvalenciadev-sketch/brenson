# Prompt de continuación — sesión 17-sep-2026 (parte 3): migración de fotos de catálogo legacy

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify). Esta sesión (parte 2) se cortó otra vez por el mismo motivo que la anterior: las herramientas de terminal (Bash y PowerShell) dejaron de responder a mitad de la tarea 2 — hasta un `echo hi` devolvía exit code 1 sin salida. No es un problema del proyecto ni de los scripts, es el entorno. Retoma justo donde quedó.

**Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md` completo** — sigue siendo la fuente de verdad general, EXCEPTO en el punto de la tarea 2 que se corrige abajo (ese documento asume que las fotos de los 12 legacy no se habían subido; **eso ya no es cierto**, ver hallazgo).

## Contexto de acceso

- Tienda: `brenson-0.myshopify.com`. Necesito que me des `SHOPIFY_ADMIN_TOKEN` (app "Brenson Admin Scripts") al empezar — no persiste entre sesiones. Ya tiene todos los scopes necesarios (`write_products`, `read_products`, `write_files`, `read_themes`, `write_themes`, `read_discounts`, `write_discounts`, etc. — confirmado en esta sesión con `GET /admin/oauth/access_scopes.json`, no hace falta reverificar).
- `SHOPIFY_API_VERSION=2025-07`, `THEME_ID=143001354315` (Brenson Staging).
- Contenido real de Brenson: `.tmp_extract/DOC PAGINA WEB/` dentro del repo (en `.gitignore`, ~870 MB). Si no existe en esta sesión, pide al usuario el ZIP original (`DOC PAGINA WEB-20260917T201504Z-1-001.zip`, estaba en `C:\Users\USER\Downloads\`).
- **Nota técnica de shell**: en esta máquina, `node -e "..."` con rutas Windows embebidas a veces se corrompe vía Bash — mejor escribir el script a un archivo `.mjs` con la tool Write y ejecutarlo con `node`. Para importar `scripts/lib/shopify-admin.mjs` desde un script fuera del repo (ej. en el scratchpad), usa un import con URL `file:///C:/Users/...` (ruta absoluta normal falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME`).
- **Si Bash/PowerShell dejan de responder** (exit code 1 sin salida en comandos triviales como `echo hi`): no es el proyecto, es el entorno de esta máquina/sesión. No pierdas tiempo reintentando muchas veces ni intentando "arreglarlo" — repórtalo al usuario y detente ahí, documentando el estado exacto para la siguiente sesión (como se hace aquí).

## Hallazgo clave de esta sesión (parte 2) — corrige el estado documentado

**Los 12 vehículos legacy NO están sin fotos.** Ya tienen entre 6 y 14 imágenes subidas cada uno (confirmado vía GraphQL `media(first: 30)` por producto). Esto contradice `docs/ESTADO_GENERAL_18SEP2026.md` §2 y §4.2 ítem 16, que asumían que la migración de fotos no se había hecho — en realidad se hizo, parcial o totalmente, en algún momento no documentado (posiblemente por el usuario directamente en el Admin, no por script).

Conteo verificado hoy (`media(first:30)` por producto):

| Producto | ID | Fotos ya subidas |
|---|---|---|
| Corato | 7431772307531 | 7 |
| Dakota | 7400617279563 | 9 |
| Dallas | 7395042918475 | 14 |
| Furgón | 7400626159691 | 6 |
| Maxi | 7400626618443 | 8 |
| Milán | 7613873258571 | 8 |
| Mobility | 7400627273803 | 7 |
| Monaco | 7431770112075 | 7 |
| Platón | 7400566685771 | 13 |
| Vera | 7549564420171 | 9 |
| Verona | 7400026669131 | 10 |
| Zero | 7468152455243 | 6 |

Los nombres de archivo en Shopify están saneados (sin tildes, sin espacios, a veces con sufijos `_1`/`-copia` por colisión de nombre), así que no calzan letra por letter con los nombres locales — hay que normalizar antes de comparar (quitar acentos, espacios, guiones, paréntesis, extensión, y el sufijo "copia") para saber qué falta.

**Verificado con Corato como ejemplo**: de 12 fotos válidas en la carpeta local `corato/`, solo ~7 están subidas (bajo nombres distintos: `frontal.png`→`frontal_1.png`, `trasera diagonal.png`→`traseradiagonal.png`, etc.). Faltan al menos: `Interior.png`, `baul.png`, `interior atras.png`, `lateral.png`, `trasera - copia.png`, `vidrios.png`. **Esto no se verificó todavía para los otros 11 productos** — el script de diff se escribió pero no llegó a correr antes del corte de terminal.

## Lo que falta hacer (nada de esto se completó)

1. **Ejecutar el script de diff que ya está escrito** en el scratchpad de la sesión anterior (se perdió al cerrar la sesión — hay que reescribirlo, la lógica ya está probada arriba). Compara, por cada uno de los 12 productos, los archivos locales válidos (excluyendo los ya identificados como no-fotos, ver tabla de exclusiones abajo) contra los nombres ya subidos, normalizando: `NFD` + quitar diacríticos, minúsculas, quitar extensión, quitar espacios/guiones/paréntesis/puntos, quitar sufijo "copia" final. Un archivo local "falta" si ningún nombre subido normalizado coincide o contiene/está contenido en el nombre local normalizado.
2. Revisar el resultado del diff a ojo (los nombres cortos genéricos tipo `Tablero.png`, `Lateral.png` pueden dar falsos negativos/positivos con la heurística de substring — confirmar visualmente los casos dudosos antes de subir duplicados).
3. Escribir `scripts/import-legacy-vehicle-photos.mjs` (no existe todavía) que suba SOLO los archivos faltantes confirmados, seso patrón estándar Shopify: `stagedUploadsCreate` (resource `IMAGE`, `httpMethod: POST`) → `fetch` multipart POST al `url` devuelto con los `parameters` → `productCreateMedia` con `originalSource` = la URL firmada devuelta, `mediaContentType: IMAGE`. Usa `scripts/lib/shopify-admin.mjs` (`gql`, `sleep`, `envOrDie`) como base.
4. **No subas specs (`brenson.*` metafields)** para estos 12 todavía — siguen sin llegar de Brenson (ítem 16 de `ESTADO_GENERAL_18SEP2026.md` §4.2). Solo fotos.
5. Al terminar, actualizar `docs/ESTADO_GENERAL_18SEP2026.md` §2 y §4.2 ítem 16 para reflejar que la migración de fotos de los 12 legacy está completa (o el estado real que quede).

### Archivos locales que NO son fotos de producto (no subir, ya confirmado en sesión anterior)

- `dakota/Dakota Pro (1)_page-0001.jpg` (página de PDF/brochure)
- `furgon/ficha tecnica.png` (ficha técnica)
- `milan/Captura de pantalla 2026-03-12 082613.png` (screenshot)
- `mobility/ficha tecnica sencilla.png` (ficha técnica)
- `platon/Carry Platón_page-0001 (1).jpg` (página de PDF/brochure)
- `vera/Captura de pantalla 2026-02-25 084502.png` (screenshot)

## Tareas 3-7 (sin empezar, tal como estaban)

Sin cambios respecto al prompt anterior — ver `docs/PROMPT_CONTINUACION_17SEP_PARTE2.md` §"Tareas 3-7" si hace falta el detalle completo (carrusel de videos, videos de producto en ficha, exclusión de accesorios, actualizar documentación, campos de vocero en `brenson_caso_uso`).

## Reglas de trabajo (ya vigentes, no las repitas al usuario)

Responde en español; prefijo `brenson-` en archivos nuevos; `npm run theme:check` en 0 errores antes de cada push; después de cada push, verifica con `theme pull --only <archivo>` + grep — "pushed successfully" no es confiable por sí solo; nunca escribas tildes/ñ directo en un comando de bash que vaya a Shopify — usa Node con escapes Unicode o edita el archivo con la tool Write y luego súbelo; nunca publiques testimonios/aliados/contadores sin `verificado: true`; no reabras decisiones ya firmadas en `docs/DECISIONES_BRENSON.md`.
