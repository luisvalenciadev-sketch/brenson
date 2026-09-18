# Prompt de continuación — sesión 17-sep-2026 (parte 2): migración de fotos de catálogo legacy

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify). La sesión anterior se cortó porque las herramientas de terminal (Bash y PowerShell) dejaron de responder a mitad de la tarea 2 — no fue un problema del proyecto, fue el entorno. Retoma justo donde quedó, sin repetir lo ya verificado abajo.

**Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md` completo** — es la fuente de verdad del estado del proyecto. No repitas verificaciones que ese documento ya deja resueltas.

## Contexto de acceso

- Tienda: `brenson-0.myshopify.com`. Necesito que me des `SHOPIFY_ADMIN_TOKEN` (app "Brenson Admin Scripts") al empezar — no persiste entre sesiones. El token ya tiene TODOS los scopes necesarios incluidos `read_themes`, `write_themes`, `read_discounts`, `write_discounts` (se reinstaló la app el 17-sep con éxito — no hace falta volver a tocar esto).
- `SHOPIFY_API_VERSION=2025-07`, `THEME_ID=143001354315` (Brenson Staging).
- Contenido real de Brenson: `.tmp_extract/DOC PAGINA WEB/` dentro del repo (en `.gitignore`, ~870 MB). Si no existe en esta sesión, pide al usuario el ZIP original (`DOC PAGINA WEB-20260917T201504Z-1-001.zip`, estaba en `C:\Users\USER\Downloads\`).
- Poppler (para convertir PDF/imagen si hace falta) puede no estar en el PATH de la sesión; el binario queda en `C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin`. Ojo con la resolución: usar `-r 150` o menor para logos/vectores, `-r 600` generó un PNG que Shopify rechazó por exceder 20 MP.
- **Nota técnica de shell**: en esta máquina, `node -e "..."` con rutas Windows (backslash) embebidas en el string a veces se corrompe vía Bash — mejor escribir el script a un archivo `.mjs`/`.js` con la tool Write y ejecutarlo con `node ruta\al\script.js`, en vez de pasar código inline con `-e`.

## Lo que se verificó y quedó resuelto en esta sesión (no lo repitas)

### Tarea 1 — Scopes del token y estado real de publicación (COMPLETA)
- El token nuevo ya tiene `read_themes`/`read_discounts` (y de paso `write_themes`, `write_discounts`, `write_orders`, `read/write_online_store_pages`). Confirmado con `GET /admin/oauth/access_scopes.json`.
- **Hallazgo importante**: el tema realmente publicado en producción (`brenson.co`) es **"Brenson Theme"** (ID `132909596747`, role `main`), actualizado el 17-sep a las 16:27 — y **NO es nuestro trabajo nuevo**. Tiene la paleta negro/rojo vieja, Montserrat, apps de dropshipping activas (Ryviu, AddZap, "mostrar_estrelas_ryviu"), y el footer dice "Diseñado por EnlacesDigitales.com".
- El tema no publicado `140398723147` ("Brenson/main") **también** es el tema viejo (mismo footer EnlacesDigitales, Montserrat, sin tokens de marca nuevos) — no es el que corresponde a nuestro trabajo.
- **"Brenson Staging"** (`143001354315`, unpublished) es el único tema que sí tiene la marca real: confirmado leyendo `assets/brenson-tokens.css` de ese tema — contiene `#29a800`, `#96ed0b`, `#02b2b2` y `Ubuntu`. Este es el tema en el que hay que seguir trabajando.
- **Function de descuento B2B: no existe en la tienda.** Query GraphQL `shopifyFunctions` y `automaticDiscountNodes` devolvieron 0 resultados — nunca se desplegó (o se desplegó y se eliminó). Queda pendiente investigar el código en `brenson-b2b-functions/` si se retoma esta tarea.
- El usuario decidió explícitamente: seguir con las tareas 2-7 del plan original y dejar la publicación a producción / Function B2B documentadas como pendientes (no re-litigar esta decisión).

### Tarea 2 — Migrar fotos de los 12 vehículos legacy (EN CURSO, se cortó antes de subir nada)

Mapeo producto↔carpeta ya confirmado contra la lista real de productos de Shopify (sin ambigüedad):

| Carpeta en `.tmp_extract/DOC PAGINA WEB/Fotografías de productos en alta resolución./` | Producto Shopify | Product ID (numérico) |
|---|---|---|
| corato | Cuadriciclo eléctrico Corato | 7431772307531 |
| dakota | Ciclomotor Electrico DAKOTA PRO | 7400617279563 |
| dallas | Bicicleta Eléctrica Brenson Dallas | 7395042918475 |
| furgon | Motocarro Eléctrico CARRY FURGÓN | 7400626159691 |
| maxi | Motocarro Eléctrico MAXI | 7400626618443 |
| milan | VELMPU MILÁN 500WATTS 2026 | 7613873258571 |
| mobility | Ciclomotor Eléctrico Brenson Mobility | 7400627273803 |
| monaco | Cuadriciclo eléctrico Monaco | 7431770112075 |
| platon | Moto Carro Eléctrico CARRY PLATÓN | 7400566685771 |
| vera | Ciclomotor electrico VERA 2026 | 7549564420171 |
| verona | Ciclomotor eléctrico Verona | 7400026669131 |
| zero | Cuadriciclo Zero | 7468152455243 |

Revisé el contenido de cada carpeta y ya filtré qué archivos NO son fotos de producto reales (no subir):
- `dakota/Dakota Pro (1)_page-0001.jpg` (página de PDF/brochure, no foto)
- `furgon/ficha tecnica.png` (imagen de ficha técnica, no foto de producto)
- `milan/Captura de pantalla 2026-03-12 082613.png` (screenshot)
- `mobility/ficha tecnica sencilla.png` (ficha técnica, no foto)
- `platon/Carry Platón_page-0001 (1).jpg` (página de PDF/brochure, no foto)
- `vera/Captura de pantalla 2026-02-25 084502.png` (screenshot)

El resto de archivos en cada carpeta (variantes con "copia", fotos de WhatsApp, etc.) se consideraron fotos reales válidas — súbelas todas salvo que al mirarlas de cerca resulten duplicados idénticos.

**Lo que falta hacer (nada de esto se ejecutó todavía)**:
1. Verificar cuántas fotos ya tiene cada uno de los 12 productos en Shopify hoy (`media(first: 30)` por producto vía GraphQL) — para no duplicar si alguna ya se subió en una sesión anterior. Nadie ha confirmado esto aún.
2. No existe todavía un script de staged upload para archivos locales en `scripts/` — el único ejemplo (`scripts/import-catalog-images.mjs`) sube desde URLs externas, no desde disco. Hay que escribir uno nuevo (ej. `scripts/import-legacy-vehicle-photos.mjs`) siguiendo el patrón estándar de Shopify: `stagedUploadsCreate` (resource `IMAGE`, `httpMethod: POST`) → `fetch` multipart POST al `url` devuelto con los `parameters` → `productCreateMedia` con `originalSource` = la URL firmada devuelta, `mediaContentType: IMAGE`. Usa `scripts/lib/shopify-admin.mjs` (función `gql`, `sleep`, `envOrDie`) como base.
3. **No subas specs (`brenson.*` metafields)** para estos 12 todavía — siguen sin llegar de Brenson (ítem 16 de `ESTADO_GENERAL_18SEP2026.md` §4.2). Solo fotos por ahora.
4. Sube en la misma pasada el logo de marca de alta calidad si hace falta un tamaño distinto al ya subido (verificar primero si hace falta, puede que no).

## Tareas 3-7 (sin empezar, tal como estaban en el prompt anterior)

Estas siguen exactamente como se describieron antes — no se tocaron en esta sesión:

3. **Carrusel de videos** (testimonios + casos de éxito) — fuentes en `.tmp_extract/DOC PAGINA WEB/testimonios/` y `CASOS DE EXITO/`. Revisar primero si hay un patrón de carrusel reutilizable (`assets/component-slider.css`, `sections/slideshow.liquid`, `brenson-b2b-flotas.js`/`brenson-b2b-roi.js`) antes de construir uno nuevo. Sin autoplay con sonido, sin bloquear scroll.
4. **Videos de producto en la ficha** — carpeta `.tmp_extract/DOC PAGINA WEB/videos de productos /` (15 videos). Solo enlazar los que tengan nombre identificable con certeza (ej. `DAKOTA verde menta.mp4`, `PLATON.mp4`); los que solo tienen códigos numéricos (`0202.mp4`, etc.) hay que preguntarle al usuario a qué modelo corresponden, no adivinar.
5. **Excluir accesorios sueltos** (decisión B5, baterías/cargadores) — solo si el usuario confirma que ya tiene respuesta de Brenson. Empezar preguntando.
6. **Actualizar documentación** — al cerrar, actualizar/crear la versión con fecha de esta sesión de `docs/ESTADO_GENERAL_18SEP2026.md`.
7. **Campos de vocero en el metaobject `brenson_caso_uso`** — agregar nombre/cargo/foto del vocero (evaluar reusar `brenson_testimonio` en vez de duplicar campos), luego actualizar `sections/brenson-case-studies-carousel.liquid` para renderizarlo. Nunca inventar el nombre/cargo real — pedirlo al usuario.

## Reglas de trabajo (ya vigentes, no las repitas al usuario)

Responde en español; prefijo `brenson-` en archivos nuevos; `npm run theme:check` en 0 errores antes de cada push; **después de cada push, verifica con `theme pull --only <archivo>` + grep** — "pushed successfully" no es confiable por sí solo; nunca escribas tildes/ñ directo en un comando de bash que vaya a Shopify — usa Node con escapes Unicode o edita el archivo con la tool Write y luego súbelo; nunca publiques testimonios/aliados/contadores sin `verificado: true`; no reabras decisiones ya firmadas en `docs/DECISIONES_BRENSON.md`.
