# Prompt de continuación — Validación visual Stitch vs Shopify

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el mismo repo (`C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`).

---

Estoy publicando la tienda Brenson en Shopify y validando que el tema (`brenson-theme/`) se vea idéntico a los mockups de `stitch-design/` (14 pantallas). Ya llevamos el home y el catálogo bastante avanzados. Necesito que sigas con las pantallas restantes: **03-ficha, 04-empresas-dashboard, 05-cuenta, 06-financiacion, 07-empresas-landing, 08-cotizador, 09-home-mobile, 10-ficha-mobile, 11-empresas-estados, 12-catalogo-mobile, 13-cotizador-mobile, 14-garantia-blog**, y una segunda pasada de 01-home y 02-catalogo por si quedó algo suelto.

## Contexto de acceso (ya configurado, no repitas el setup)

- Tienda: `brenson-0.myshopify.com`
- Tema de trabajo: **"Brenson Staging"**, id `143001354315` (NO crear temas nuevos, seguir usando este)
- Preview: `https://brenson-0.myshopify.com?preview_theme_id=143001354315`
- Token Admin API con scopes ya ampliados (products, customers, metaobjects, content, orders, files, online_store_navigation, publications): si necesitas volver a autenticarte, hay un script OAuth en el scratchpad de la sesión anterior (`oauth-bootstrap.mjs`) que monta un servidor local en `:8787` y hace el intercambio con el Client ID/Secret de la app "Brenson Admin Scripts" en el Dev Dashboard. Si no tienes el token a mano, pide al usuario que te dé Client ID + Secret de esa app (Dev Dashboard → Brenson Admin Scripts → Configuración de la app → Credenciales) y repite el flujo.
- Variables para los scripts: `SHOPIFY_SHOP=brenson-0.myshopify.com`, `SHOPIFY_API_VERSION=2025-07`, `SHOPIFY_ADMIN_TOKEN=<el token>`.
- Todos los scripts de datos ya existen en `scripts/` (create-definitions.mjs, import-mocks.mjs, create-navigation.mjs, create-pages.mjs, publish-online-store.mjs, import-home-images.mjs, etc.) — reutiliza el patrón (`scripts/lib/shopify-admin.mjs` expone `gql`, `userErrors`, `sleep`).

## Hallazgos importantes de la sesión anterior (no los repitas, ya están corregidos)

1. **`html { font-size: 62.5% }`** (Dawn): 1rem = 10px, no 16px. Todo el CSS custom de Brenson (`assets/brenson-*.css`, estilos inline en `sections/brenson-*.liquid`) ya fue reescalado x1.6. Si tocas un archivo Brenson NUEVO con valores en `rem` que no uses las variables `var(--brenson-text-*)`/`var(--brenson-space-*)`, tenlo en cuenta (multiplica el valor deseado en px por 1.6 y divide entre 16, o simplemente usa las variables del token file).
2. **`sections/header-group.json` y `sections/footer-group.json`** son la fuente real de verdad para header/footer/announcement-bar (arquitectura de "section groups" de Dawn) — **NO** `config/settings_data.json` (ese quedó con configuración huérfana sin efecto, ignóralo).
3. **Todo lo creado por Admin API necesita `publishablePublish`** al canal "Tienda Online" (`gid://shopify/Publication/119092904011`) — si algo se ve como producto/colección demo genérico de Shopify, casi seguro es esto. Ver `scripts/publish-online-store.mjs`.
4. **Dawn en este tema usa flexbox (width/max-width por `.grid__item`), NO CSS Grid**, para las grillas de producto — si haces overrides de layout, apunta a `width`/`max-width`, no a `grid-template-columns`.
5. Imágenes de producto/colección/testimonios: se suben con `fileCreate`/`productCreateMedia` usando `originalSource: <url>` (Shopify descarga y hostea). Las fotos de los mockups de Stitch son imágenes IA alojadas en `lh3.googleusercontent.com` — extráelas así:
   ```js
   const tagRe = /<img\b[^>]*>/g;
   // alt = tag.match(/\balt="([^"]*)"/)[1]  (nombre corto)
   // src = tag.match(/\bsrc="([^"]*)"/)[1]
   ```
   (usar `\b` antes de `alt=`/`src=` para no confundir con `data-alt=`).
6. Ya tienen foto los 12 productos (9 con foto real del mockup, 3 con foto "prestada" de un producto similar de su misma categoría porque Stitch nunca los mostró: Trail E500→foto Urban E250, Pasajeros Tuk→foto Quad Tour, Quad Cargo 4x4→foto Quad Work 4x2).
7. No tienes navegador con capacidad de screenshot — compara leyendo el HTML/CSS de `stitch-design/*/*.html` (o el `.png` con la tool Read, que sí puedes ver como imagen) contra el código del tema, y pide capturas al usuario para verificar antes/después de cada fix.
8. Después de cualquier cambio: `shopify theme check --path brenson-theme` (debe dar 0 errores, warnings existentes son aceptables) y luego `shopify theme push --path brenson-theme --theme 143001354315 --store brenson-0.myshopify.com` (usar `--theme <id>`, NO `--unpublished --theme "nombre"` que crea un tema duplicado nuevo cada vez).

## Cómo validar cada pantalla

1. Lee el `.html` y el `.png` de la carpeta correspondiente en `stitch-design/`.
2. Identifica la plantilla/sección real equivalente en `brenson-theme/templates/` y `brenson-theme/sections/`.
3. Pide al usuario una captura de esa página en el preview (dale la URL exacta) SOLO si no puedes verificar algo por código (ej. contraste real, si un CSS realmente se está aplicando).
4. Compara: tipografía/tamaños (ya deberían coincidir tras el fix del punto 1), colores, fondos, imágenes faltantes, contenido que no debería estar (secciones reusadas de otra pantalla, como pasó con `brenson-empresas-cta` en el catálogo), textos truncados, elementos que dependen de configuración manual pendiente (Search & Discovery, logo real de marca — avisa pero no bloquees).
5. Corrige bugs reales de código/datos. Sé explícito con el usuario sobre qué es "feature nueva que Dawn no trae" (wishlist, toggle grid/lista, etc. — ya construidos para el catálogo, revisa si aplican también a otras pantallas) vs. "bug real".
6. Traduce la retroalimentación del usuario en cambios concretos — cuando compare captura del sitio vs mockup, identifica LA CAUSA (no solo el síntoma) antes de tocar CSS a ciegas; la sesión anterior perdió tiempo iterando sobre efectos visuales (oscurecer hero) sin diagnosticar bien al principio.

## Pendiente conocido sin resolver (documéntalo si no lo resuelves)

- Search & Discovery: el usuario debe activar manualmente las facetas (`brenson.categoria`, `brenson.uso`, tramos, financiable, requiere_licencia) — dale los pasos si no lo ha hecho.
- Logo real de marca: se usa un wordmark provisional (`snippets/brenson-wordmark.liquid`) hasta que Brenson entregue el logo oficial.
- 3 productos sin foto real (ver punto 6 arriba).

Empieza por **03-ficha** (ficha de producto del City 1500), ya que el catálogo enlaza ahí con "Ver vehículo".
