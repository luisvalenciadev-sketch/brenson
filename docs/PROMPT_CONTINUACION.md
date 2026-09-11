# Prompt para continuar en otra sesión

Copia y pega esto al iniciar la nueva sesión de Claude Code (abre la carpeta `C:\Users\lvalencia\Downloads\brenson-ecosistema` como directorio de trabajo):

---

Actúa como Senior Full-Stack Developer & Shopify Theme Architect. Continuamos el proyecto **Brenson S.A.S.** (e-commerce de vehículos eléctricos en Shopify, canal B2C + portal B2B "Brenson Empresas").

**Contexto que ya existe en este repo (no lo rehagas, léelo primero):**
1. `docs/ESTADO_CONSTRUCCION.md` — qué está construido y qué falta.
2. `docs/DECISIONES_BRENSON.md` — las 107 decisiones ya tomadas (no vuelvas a preguntarlas).
3. `docs/ESTRATEGIA_SIMULACION.md` — todo lo que Brenson no ha entregado está simulado con marcadores `_mock`, `[BORRADOR]`, `[VALIDAR]`; se reemplaza sin tocar código.
4. `docs/PLAN_DE_TRABAJO_BRENSON.md` (con Anexo A) — arquitectura y roadmap de 16 semanas.
5. `stitch-design/SCREENS.md` y `REVIEWS.md` — pantallas diseñadas en Stitch (proyecto `6680964782534882674`, design system `assets/7471924313442223255`) y correcciones: Stitch inventa marcas y datos reales; nada de eso pasa al tema.

**Estructura:** `brenson-theme/` (Dawn 16 + secciones `brenson-*`, Theme Check 0/0), `brenson-services/` (Cloudflare Worker con proveedores mock/real), `brenson-b2b-functions/` (Shopify Function de descuento por tier, tests pasan), `scripts/` (crear definiciones, importar mocks, importar blog, check de mocks, placeholders), `mock-data/`, `docs/`.

**Reglas de trabajo:** español; tono "tú" en B2C y "usted" en Empresas; prefijo `brenson-` en todo archivo nuevo; sin jQuery ni frameworks; cuota mensual siempre calculada (nunca escrita); Theme Check en 0 antes de cada commit; commits por hito con la atribución de Claude; el diseño se hace en Stitch, no en Figma; no publicar contenido no verificado (testimonios, aliados, contadores).

**Lo que sigue, en orden:**
1. Si ya tengo acceso a la tienda: darte `SHOPIFY_SHOP` y un token Admin de app custom. Entonces: correr `npm run definitions:dry` y `npm run definitions`, luego `npm run import:mocks` y `node scripts/import-blog.mjs`, configurar facetas en Search & Discovery según `docs/metafield-definitions.json`, subir el tema con `npm run theme:push:staging`, revisar en el editor y corregir lo que se vea. Hacer las ocho verificaciones del Sprint 1 (cuentas clásicas, plan, apps a eliminar, WhatsApp App/API, pasarelas, app de facturación, estado de GoHighLevel, tráfico en Search Console) y anotarlas en `docs/VERIFICACIONES_SPRINT1.md`.
2. Si tengo cuenta Cloudflare: `wrangler login`, crear KV y R2, `npm run deploy` en `brenson-services`, poner la URL en Ajustes del tema → Brenson · Empresas, y probar `/lead` y `/quote` desde staging.
3. Si tengo app custom creada: completar `client_id` en `brenson-b2b-functions/shopify.app.toml`, `shopify app deploy`, activar el descuento automático y probar con un cliente `cliente-corporativo`.
4. Crear los 5 Flows de `docs/FLOWS.md` y registrar los webhooks.
5. Sin acceso todavía: completar pantallas Stitch pendientes (revisar `SCREENS.md`), seguir la matriz `docs/QA_MATRIZ.md` en `shopify theme dev` cuando sea posible, y preparar la versión en inglés (Translate & Adapt) limitada a home, catálogo, fichas, financiación y garantía.

Empieza leyendo los cinco documentos del punto "Contexto", dime en una línea qué vas a hacer y arranca.

---

## Datos que debo tener a mano para esa sesión

| Dato | Para qué |
|---|---|
| `SHOPIFY_SHOP` (ej. `brenson-co.myshopify.com`) y token Admin de app custom | Definiciones, importación, push del tema |
| Acceso colaborador al Admin | Verificaciones, Flows, Search & Discovery, webhooks |
| Cuenta Cloudflare de Brenson | Desplegar `brenson-services` |
| App custom en la tienda (client_id) | Desplegar la Function |
| Manual de marca, % de tiers, tasa y aliado financiero | Reemplazar tokens y mocks S3/S4/S20 |
| Fotos y specs reales | Reemplazar S1/S2 con `import-mocks` |
