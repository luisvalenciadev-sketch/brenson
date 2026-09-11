# Guía de publicación — Brenson Ecosistema

Cómo llevar todo lo construido a producción, en orden, con los comandos exactos. Cada paso indica qué necesita y cómo se verifica. Tiempo estimado total con accesos listos: 2 a 3 días de trabajo técnico más los tiempos de espera de Brenson (contenido, aprobaciones).

## 0. Requisitos previos

| Necesito | Quién lo da | Para qué |
|---|---|---|
| Acceso colaborador al Admin de Shopify (temas, productos, clientes, apps, descuentos, Custom data, Flow, navegación, políticas) | Brenson | Todo lo de Shopify |
| App custom en la tienda con token Admin: scopes `read_products, write_products, read_customers, write_customers, read_metaobjects, write_metaobjects, write_metaobject_definitions, write_content, read_orders` | Brenson crea la app en Admin → Apps → Desarrollar apps; el dev define scopes | Scripts de definiciones e importación; `brenson-services` |
| Cuenta Cloudflare (gratuita sirve) a nombre de Brenson | Brenson | Worker, KV, R2, Turnstile |
| Partner Dashboard o Dev Dashboard con acceso a la tienda | Dev con permiso de Brenson | Shopify Function (app custom aparte) |
| Repositorio GitHub de Brenson | Brenson crea la organización | Integración GitHub ↔ tema |
| Cuentas: GA4 + GTM (existen), Meta Business Manager, Klaviyo, Junip, Resend, PDFMonkey | Brenson / agencia | Fases 4 a 6 |

Variables de entorno usadas por los scripts (PowerShell):

```powershell
$env:SHOPIFY_SHOP = "brenson-co.myshopify.com"     # confirmar dominio .myshopify real
$env:SHOPIFY_ADMIN_TOKEN = "shpat_..."
$env:SHOPIFY_API_VERSION = "2025-07"
```

## 1. Verificaciones del Sprint 1 (30 min)

Anotar resultados en `docs/VERIFICACIONES_SPRINT1.md`:

1. **Cuentas de cliente**: Admin → Configuración → Cuentas de clientes. Deben ser **clásicas**. Si son "nuevas", cambiar a clásicas (el tema no usa `<shopify-account>`).
2. **Plan de Shopify**: Admin → Configuración → Plan.
3. **Apps instaladas**: listar; marcar para desinstalar Ryviu, A2Reviews, AliExpress Reviews, GemPages, Quantity Offers (EDrop), AddZap y notificaciones de compra (pendiente confirmación de Brenson, decisión F1).
4. **WhatsApp**: preguntar al equipo comercial si usan App o API (GoHighLevel).
5. **Pasarelas**: Admin → Configuración → Pagos.
6. **Facturación electrónica**: qué app emite factura DIAN.
7. **GoHighLevel / ChatThunder**: ¿existe subcuenta? ¿quién administra? Si no existe, el backend sigue en `CRM_PROVIDER=mock`.
8. **Search Console**: páginas con tráfico orgánico para redirigir.

## 2. Datos en Shopify (1 h)

```powershell
cd C:\Users\lvalencia\Downloads\brenson-ecosistema
npm run definitions:dry      # revisar qué va a crear
npm run definitions          # metaobjects + metafields de producto, colección, cliente y tienda
npm run import:mocks:dry
npm run import:mocks         # colecciones, 12 vehículos, metaobjects, clientes B2B mock, unidades, cotizaciones
node scripts/import-blog.mjs # 6 artículos como borrador
```

Después, a mano en Admin:

- **Search & Discovery** (app gratuita de Shopify): Filtros → agregar `Categoría`, `Uso`, `Autonomía (tramo)`, `Velocidad (tramo)`, `Carga (tramo)`, `Financiable`, `Requiere licencia`, Precio, Disponibilidad.
- **Navegación**: menú `main-menu` con Vehículos (submenú de 4 colecciones) · Financiación (`/pages/financiacion`) · Empresas (`/pages/empresas`) · Garantía (`/pages/garantia`) · Blog · Contacto (`/pages/contacto`). Menús `footer-vehiculos`, `footer-empresa`, `footer-ayuda`.
- **Páginas**: crear `financiacion`, `garantia`, `contacto`, `empresas`, `empresas-acceso`, `cotizador` y asignarles la plantilla del mismo nombre (se ve en el editor tras subir el tema).
- **Políticas**: pegar los textos oficiales (estructura en `mock-data/POLITICAS_BORRADOR.md`).
- **Privacidad del cliente**: Admin → Configuración → Privacidad del cliente → activar banner de cookies para Colombia. El tema escucha ese banner para Consent Mode.
- **Imágenes**: subir `mock-data/img/*.svg` a Contenido → Archivos y asignarlas a las colecciones mientras no haya fotos.

Verificación: en Admin → Productos, cada vehículo muestra sus metafields; Contenido → Metaobjects tiene entradas en los 11 tipos.

## 3. Tema (30 min)

```powershell
npm run theme:check                    # debe dar 0 errores
npm run theme:push:staging             # crea el tema "Brenson Staging" sin publicar
```

En el editor del tema:

1. Configuración del tema → Logo: subir logo. Los colores y Montserrat ya vienen en `settings_data.json`.
2. Configuración → **Brenson · Empresas** → Colección del catálogo corporativo = `Catálogo corporativo`.
3. Página de inicio: revisar que las secciones `Brenson ·` cargan; asignar colecciones en Hero y Grid de categorías si no se resolvieron por handle.
4. Plantilla `page.empresas`, `page.empresas-acceso`, `page.cotizador`: verificar que usan el layout oscuro.
5. Probar con un cliente mock: `compras@logisticacaribe-mock.co` (crear contraseña desde Admin → Clientes → Enviar invitación) → `/pages/empresas` debe mostrar el dashboard.
6. Recorrer `docs/QA_MATRIZ.md` secciones B2C y Empresas.

Integración GitHub (opcional pero recomendada): Tienda online → Temas → Agregar tema → Conectar desde GitHub → rama `develop` = Staging, rama `main` = Live.

## 4. Backend `brenson-services` (45 min)

```powershell
cd brenson-services
npm install
npx wrangler login
npx wrangler kv namespace create KV            # copiar id a wrangler.toml
npx wrangler kv namespace create KV --preview  # preview_id
npx wrangler r2 bucket create brenson-b2b-docs
npx wrangler secret put SHOPIFY_ADMIN_TOKEN
npx wrangler secret put SHOPIFY_WEBHOOK_SECRET  # después del paso 5
npx wrangler secret put QUOTE_SIGNING_SECRET    # cualquier cadena larga aleatoria
npx wrangler secret put TURNSTILE_SECRET        # Cloudflare → Turnstile → crear widget (dominio brenson.co)
npm run deploy
```

Editar `wrangler.toml`: `ALLOWED_ORIGINS` con el dominio real, `SHOPIFY_SHOP`, `STORAGE_PROVIDER = "r2"`, `ENVIRONMENT = "production"`. Cuando existan las cuentas: `MAIL_PROVIDER = "resend"` + `RESEND_API_KEY` (verificar dominio en Resend con los registros DNS), `PDF_PROVIDER = "pdfmonkey"` + claves, `CRM_PROVIDER = "ghl"` + `GHL_WEBHOOK_URL`.

En el tema: Configuración → Brenson · Empresas → **URL de brenson-services** = `https://brenson-services.<cuenta>.workers.dev` (o dominio propio `api.brenson.co`). Configuración → Brenson · Desarrollo → Turnstile site key.

Verificación: `GET /health` responde; enviar el formulario de cotización desde staging y ver el lead en logs (`npx wrangler tail`).

## 5. Webhooks y Flows (45 min)

- Webhooks: Admin → Configuración → Notificaciones → Webhooks → crear los 5 de `docs/FLOWS.md` apuntando al Worker. Copiar el secreto a `SHOPIFY_WEBHOOK_SECRET`.
- Flows: Admin → Apps → Flow → crear los 5 flujos de `docs/FLOWS.md`. Probar el Flow 1 registrando una empresa de prueba en `/pages/empresas-acceso`.

## 6. Shopify Function de descuento por tier (45 min)

```powershell
cd brenson-b2b-functions
npm install
npx shopify app config link        # vincular a una app nueva "Brenson B2B Functions" en la tienda
npx shopify app deploy
```

En Admin → Descuentos → Crear descuento → elegir "Brenson · Descuento por tier B2B" → activar sin fecha fin, combinable con envíos. Probar: iniciar sesión con un cliente `cliente-corporativo` con tier, agregar 10 unidades de un producto B2B al carrito → aparece el descuento; con cliente sin tag → no aparece.

## 7. Integraciones de marketing (Sprint 6)

- **GTM**: crear contenedor, poner el ID en Brenson · Desarrollo. Dentro de GTM: tag GA4 (configuración + eventos `brenson_*` del dataLayer), Meta Pixel. Respetar Consent Mode (el tema ya envía `default denied` y `update`).
- **Meta**: canal Facebook & Instagram de Shopify para catálogo y Conversions API (server-side sin código). Coordinar con la agencia de pauta.
- **Klaviyo**: instalar app, conectar formulario de newsletter del footer, crear los 5 flows con el copy de `docs/COPY_MENSAJES.md`.
- **Junip**: instalar, agregar app block en `product.json` (sección de reseñas) y en home; activar solicitud automática a 14 días.
- **Looker Studio**: conectar GA4 y armar las 4 vistas de KPIs (decisión K3).

## 8. Inglés (Fase 5, decisión L6)

Admin → Configuración → Idiomas → agregar inglés → app Translate & Adapt. Traducir home, catálogo, fichas, financiación y garantía. El tema ya tiene `en.json` con las claves `brenson.*`. Excluir portal Empresas y blog.

## 9. Reemplazo de mocks (según llegue el contenido)

| Llega | Qué hacer |
|---|---|
| Manual de marca | Ajustar `assets/brenson-tokens.css` y colores en Configuración del tema |
| Fotos y video | Subir a productos y a la sección Hero; borrar SVG placeholder |
| Specs reales | Actualizar `mock-data/vehiculos.json` con el mismo esquema y `npm run import:mocks -- --only=productos` |
| Tasa, aliado, tiers | Editar metaobjects Parámetros de financiación y Tier B2B |
| Certificación, garantía, políticas | Editar metaobject Certificación, metafields de garantía y Políticas |
| Testimonios, aliados, contadores reales | Editar metaobjects y marcar `verificado = true`; borrar los `[MOCK]` |
| Clientes B2B reales | Reemplazar `clientes_b2b` en `mock-data/metaobjects.json` y `npm run import:mocks -- --only=clientes`; borrar los mock |

## 10. Go-live (checklist)

1. `npm run check:mocks:strict` pasa (cero marcadores).
2. Configuración → Brenson · Desarrollo → **Modo simulación apagado**.
3. `wrangler.toml` en `ENVIRONMENT = "production"` y proveedores reales.
4. Matriz de QA completa; Lighthouse móvil con throttling 4G en verde.
5. Redirecciones 301 desde URLs antiguas (`/collections/mas-vendidos`, etc.) en Admin → Navegación → Redirecciones.
6. Desinstalar apps residuales del tema anterior.
7. Publicar el tema "Brenson Staging" (Tienda online → Temas → Publicar). El tema EDrop queda como respaldo 90 días.
8. Monitoreo 7 días: `wrangler tail`, GA4 tiempo real, correos de leads.
