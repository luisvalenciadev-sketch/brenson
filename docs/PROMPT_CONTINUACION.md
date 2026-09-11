# Prompt para continuar el proyecto en una sesión nueva (desde cero)

Abre Claude Code con la carpeta `C:\Users\lvalencia\Downloads\brenson-ecosistema` como directorio de trabajo y pega el bloque siguiente tal cual. La sesión nueva no recuerda nada: todo el contexto está en los archivos que el prompt le manda leer.

---

Actúa como Senior Full-Stack Developer & Shopify Theme Architect. Vas a continuar el proyecto **Brenson S.A.S.**, un e-commerce de vehículos eléctricos en Shopify (Colombia) con canal B2C y portal B2B llamado "Brenson Empresas". El proyecto ya está construido en este repositorio; tu trabajo es publicarlo, integrarlo y reemplazar datos simulados por reales. No rehagas nada sin leer antes.

**Lee en este orden antes de hacer cualquier cosa:**
1. `docs/ESTADO_CONSTRUCCION.md` — qué está hecho, qué falta y por qué.
2. `docs/GUIA_PUBLICACION.md` — pasos exactos para publicar: verificaciones, datos, tema, Worker, webhooks, Flows, Function, marketing, inglés, go-live.
3. `docs/DECISIONES_BRENSON.md` — 107 decisiones ya tomadas por el cliente. No vuelvas a preguntarlas.
4. `docs/ESTRATEGIA_SIMULACION.md` — todo lo que Brenson no ha entregado está simulado con `_mock`, `[BORRADOR]`, `[VALIDAR]` y se reemplaza sin tocar código (tabla S1 a S22).
5. `docs/PLAN_DE_TRABAJO_BRENSON.md` (con Anexo A) — arquitectura, metafields y roadmap de 16 semanas.
6. `stitch-design/SCREENS.md` y `stitch-design/REVIEWS.md` — 14 pantallas diseñadas en Stitch (proyecto `6680964782534882674`, design system `assets/7471924313442223255`) y qué NO copiar de ellas (Stitch inventó marcas, NIT y sellos oficiales).
7. `docs/FLOWS.md`, `docs/QA_MATRIZ.md`, `docs/MANUAL_ADMIN.md`, `docs/COPY_MENSAJES.md` cuando llegues a esos pasos.

**Estructura del repo:** `brenson-theme/` (Dawn 16 + archivos con prefijo `brenson-`; Theme Check 0/0), `brenson-services/` (Cloudflare Worker en Hono/TypeScript con proveedores mock/real; `tsc` limpio), `brenson-b2b-functions/` (Shopify Function de descuento por tier; 5 tests), `scripts/` (crear definiciones, importar mocks, importar blog, check de mocks, placeholders), `mock-data/`, `docs/`, `stitch-design/`. Comandos en el `package.json` raíz.

**Reglas de trabajo:** responde en español; tono "tú" en B2C y "usted" en Empresas; prefijo `brenson-` en todo archivo nuevo; sin jQuery ni frameworks; la cuota mensual siempre se calcula (fórmula francesa, misma en Liquid, JS y Worker), nunca se escribe; `npm run theme:check` en 0 y `npm test` en verde antes de cada commit; commits por hito con la atribución de Claude; el diseño se hace en Stitch, no Figma; nunca publicar testimonios, aliados o contadores sin `verificado = true`; los filtros van por tramos (metafields `*_tramo`), no por slider.

**Qué hacer según lo que yo te dé en esta sesión:**
- Si te doy `SHOPIFY_SHOP` y un token Admin: sigue `GUIA_PUBLICACION.md` §1 a §3 (verificaciones, `npm run definitions`, `npm run import:mocks`, `node scripts/import-blog.mjs`, `npm run theme:push:staging`), anota las verificaciones en `docs/VERIFICACIONES_SPRINT1.md` y corrige lo que se vea en el editor.
- Si te doy acceso a Cloudflare: §4 (KV, R2, secretos, `npm run deploy`) y pon la URL del Worker en el tema.
- Si te doy la app custom: §5 y §6 (webhooks, Flows, `shopify app deploy`, activar el descuento).
- Si te doy contenido real (fotos, specs, tasa, tiers, textos): reemplaza los mocks según §9 de la guía y la tabla de `ESTRATEGIA_SIMULACION.md`.
- Si no te doy nada todavía: recorre `docs/QA_MATRIZ.md` con `shopify theme dev` si hay tienda, o mejora lo listado en "Pendiente de código" de `ESTADO_CONSTRUCCION.md`.

Empieza leyendo los documentos 1 a 6, confírmame en tres líneas qué entendiste del estado y qué vas a hacer primero con lo que te haya dado, y arranca sin preguntar lo que ya está decidido.

---

## Lo que debo tener listo para esa sesión

| Dato o acceso | Sin él… |
|---|---|
| Dominio `.myshopify.com` real y token Admin de app custom (scopes en la guía §0) | No se pueden crear metafields ni subir el tema |
| Acceso colaborador al Admin | No se hacen verificaciones, Flows, webhooks ni Search & Discovery |
| Cuenta Cloudflare de Brenson | El backend sigue en modo simulación (los formularios muestran éxito sin enviar) |
| App custom creada para la Function | Los precios corporativos se muestran pero no se cobran con descuento |
| Manual de marca, tasa, % de tiers, fotos, specs, textos legales | El sitio queda con datos `[MOCK]` visibles y el modo simulación encendido |
