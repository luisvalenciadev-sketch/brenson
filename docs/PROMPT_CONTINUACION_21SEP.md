# Prompt de continuación — 21-sep-2026: plan post-auditoría, fases 1 y 2

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify + portal B2B). Estamos ejecutando el **plan de 8 fases para dejar el sistema al 100 %**, derivado de `docs/AUDITORIA_BRENSON_ECOSISTEMA_18SEP2026.md`. **Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md`**: la §3d (Fase 1) y las filas 2c, 2f y 2h de la §5 están actualizadas al 21-sep. No repitas verificaciones que ese documento ya da por resueltas.

## Contexto de acceso

- **Tienda**: `brenson-0.myshopify.com`. Tema de staging **ID 143001354315** (usa siempre el ID numérico). El tema publicado en `brenson.co` es otro ("Brenson Theme") y **no llama al worker**.
- **Worker**: `https://brenson-services.brenson.workers.dev` (último despliegue: versión `4674771e`, 21-sep). Secretos ya configurados en Cloudflare: `SHOPIFY_ADMIN_TOKEN`, `QUOTE_SIGNING_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET`.
- **Credenciales por sesión**: no persisten ni se escriben a disco. Pídeselas al usuario al empezar:
  - `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID = e7cdaf8e394616cfa6dd85dfcac67a70`). El token "brenson-workers-deploy" tiene permiso de Workers, KV y Turnstile.
  - Token de Admin de Shopify para scripts: se genera con `scripts/oauth-bootstrap.mjs` (Client ID `d7aa7b649732e4edb4cda78786dd1701` + Client Secret que da el usuario; corre en background y el usuario autoriza en su navegador).
  - ⚠️ El 21-sep se pegaron en el chat: el token de Cloudflare, las claves S3 de R2, la API key de Resend y el Client Secret de Shopify. **Recomendar rotarlos** antes del lanzamiento.
- **Flujos obligatorios** (ver memoria del proyecto):
  - Tema: `theme check` → `theme push --theme 143001354315 --only …` → `theme pull` a un directorio aparte y comparar. "Pushed successfully" no es confiable.
  - Worker: `npx tsc --noEmit` → `npx wrangler deploy` → **petición real** al endpoint, no solo `/health`.
  - **Commits sin línea `Co-Authored-By` de Claude** (pedido explícito del usuario). Haz `git add` de rutas concretas, **no `git add -A`**: el 21-sep se coló en un commit un cambio ajeno (`brenson-hero.css`) y hubo que separarlo.

## Estado de las fases

| Fase | Estado |
|---|---|
| 1. Seguridad y código | ✅ Completa y desplegada (worker + tema) |
| 2. Encender integraciones | 🟡 4 de 6 listas; faltan Resend y R2 (bloqueadas por terceros) |
| 3. Probar el ciclo B2B completo | 🟢 Hecha por API el 21-sep (ver `ESTADO_GENERAL` §3e: 3 fallos críticos corregidos). Faltan la prueba en navegador con sesión real, la de R2 y la limpieza de datos de prueba |
| 4. CRM (GoHighLevel + webhooks) | ⬜ Bloqueada: confirmar si existe GHL |
| 5. Contenido de Brenson | ⬜ En paralelo, depende del cliente |
| 6. QA y performance | ⬜ |
| 7. Analytics y remarketing | ⬜ |
| 8. Lanzamiento | ⬜ |

### Fase 1 — hecho (commit `9b27ebe`)
- `signingSecret()` falla si falta `QUOTE_SIGNING_SECRET` (solo `ENVIRONMENT=development` usa la clave de prueba).
- `/upload` exige token **siempre**. `/b2b/request` guarda un token de 30 días en el metafield `brenson_b2b.upload_token`, que el snippet `brenson-b2b-upload` solo muestra al propio cliente. Verificado en vivo: sin token → 403.
- CORS: deniega por defecto. Verificado.
- Sello Certificado: el PDF exige `CERTIFICACION_ACTIVA="true"` (hoy `false`) y `certificado=true`; el hero de financiación pasa por `brenson-badge`.
- PDFs con la paleta de marca; `cuota_desde_override` blindado contra $0; listener genérico `data-brenson-track` en `brenson-datalayer`, más el evento `brenson_quote_accept`.

### Fase 2 — hecho
- **Function de descuento por tier** (commits `ec178f0`, `6b669c6`). Estaba rota por tres motivos: build recursivo, sin punto de entrada ni codegen, y una consulta que usaba `metafield.reference`, que el input de Functions no soporta. Desplegada como `brenson-admin-scripts-9`. Descuento automático **"Descuento corporativo por tier"** activo: `gid://shopify/DiscountAutomaticNode/1501751541835`, clase PRODUCT, 8/12/18 % (**valores de simulación**). El % vive en `$app:brenson.config`; **hay que correr `scripts/sync-tier-discount-config.mjs` cada vez que cambien los tiers** (es idempotente). Detalle: `docs/FLUJO_COTIZACION_A_PEDIDO.md` §5.
- **Turnstile** (commit `eeab404`): widget "Brenson formularios" (site key `0x4AAAAAAE-9hGIqtJWHkLaK`, en los ajustes del tema de staging) + `TURNSTILE_SECRET` en el worker. Se corrigieron tres formularios que habrían quedado bloqueados: el layout `theme.empresas` no cargaba el widget, y exit intent y la consulta Addi no enviaban token. `window.brensonTurnstile(root)` lee el token y reinicia el widget. Verificado: sin token o con token falso → 403. **Falta confirmar un envío exitoso desde el navegador** (el usuario dijo "listo", pero no hay prueba explícita de un 200).
- **PDF real** (commit `5f3a93d`): `PDF_PROVIDER="browser"` con Cloudflare Browser Rendering (`src/lib/pdf.ts`). Caché en KV: cotización 1 año, ficha 1 día (`pdfbin:v2:ficha-…`; sube la versión si cambias `specSheetHtml`). Si el render falla, se sirve HTML. Verificado con COT-2026-0009 y la ficha del Dallas.
- `RESEND_API_KEY` ya está guardada en el worker (key **solo de envío**).

### Fase 2 — pendiente
1. **Resend**: el dominio `brenson.co` **no está agregado** en Resend. El DNS está en **GoDaddy** (ns47/ns48.domaincontrol.com), no en Cloudflare. El usuario pidió a Brenson **acceso delegado** a GoDaddy (mensaje ya enviado). Pasos:
   1. Agregar `brenson.co` en Resend, región us-east-1. Hazlo tú si el usuario da una API key "Full access"; si no, lo hace él.
   2. Cargar en GoDaddy los 3 registros (DKIM `resend._domainkey`, MX y TXT SPF en `send`). **No tocar el MX principal**.
   3. Verificar el dominio en Resend.
   4. Poner `MAIL_PROVIDER="resend"`, desplegar y enviar una prueba real a `empresas@brenson.co`.
   Para probar sin enviar a nadie real: `to: delivered@resend.dev`.
2. **R2**: sigue apagado (`wrangler r2 bucket list` → error 10042). El usuario debe activarlo en el Dashboard de Cloudflare (pide tarjeta). Después:
   1. Crear `brenson-b2b-docs` y `-dev`.
   2. Descomentar `[[r2_buckets]]` en `wrangler.toml` y poner `STORAGE_PROVIDER="r2"`.
   3. Desplegar y probar una subida real, **verificando que `documento_url` quede escrito en el cliente** y que el enlace firmado abra el archivo.

## Fase 3 — lo siguiente (no depende de terceros)

Probar contra la tienda real, con un cliente de prueba, el ciclo completo:

registro `/b2b/request` → documento (R2, si ya está) → aprobación en el Admin (tag `cliente-corporativo`, `estado_b2b=aprobado`, tier y asesor) → catálogo con tier → cotización → PDF real → aceptar → pedido borrador → **checkout con el descuento de la Function aplicado**.

Verificar que el precio de la cotización y el del checkout coinciden.

Además:
- Borrar las cotizaciones de prueba del 18-sep. Tienen PDF desfasado y el diseño viejo; COT-2026-0004/5/6 apuntan a los PDF 0001/2/3. **Confirmar con el usuario antes de borrar.**
- Pendiente 2e: agregar el campo `cliente_id` a la definición de `brenson_unidad`. El dashboard ya lo lee con respaldo a `cliente`; falta el campo en Shopify y definir quién lo llena.
- Ojo con los clientes que quedaron en "pendiente" antes del 21-sep: no tienen `upload_token`, así que su subida responde 403 con el mensaje de WhatsApp.

## Fases 4 a 8 (resumen del plan)

- **4. CRM**: confirmar si existe la subcuenta de GoHighLevel (decisión J1). Luego `CRM_PROVIDER="ghl"` + `GHL_WEBHOOK_URL`, y crear los webhooks de Shopify al worker (customers-create/update, checkouts-create, orders-create/fulfilled). Ver al menos un lead en el pipeline.
- **5. Contenido de Brenson**: garantía en meses, disclaimer del simulador, políticas legales, tasa real, % reales de tiers (y después correr el script de sync), aprobación del checklist de Certificación (solo entonces `CERTIFICACION_ACTIVA="true"` y `brenson_show_certificado`), specs de los 12 vehículos legacy, contadores y testimonios verificados, blog validado. `check:mocks` hoy da 54 marcadores y tiene que llegar a 0.
- **6. QA**: ejecutar `docs/QA_MATRIZ.md` completa, Lighthouse móvil con 4G, un Android físico de gama media, contraste en secciones oscuras, redirecciones 301.
- **7. Analytics**: GTM/GA4 con ID real; Meta Pixel/CAPI y Klaviyo cuando exista el Business Manager (si no, documentarlo como fase 2).
- **8. Lanzamiento**:
  - `brenson_modo_simulacion=false` y `check:mocks` en 0;
  - `ENVIRONMENT="production"` en el worker (quita el sello "DOCUMENTO DE PRUEBA");
  - apagar `brenson_show_certificado` si la certificación no está aprobada;
  - checklist GO/NO-GO de la auditoría (§19);
  - publicar el tema y monitorear 7 días con `wrangler tail` **sin** `--status error`.

## Trampas conocidas

- `automaticDiscountNodes` **no lista** los descuentos de app con `discountClasses`. Usa `discountNodes` o `discountNode(id)`.
- `shopify app execute` no sirve: la tienda no pertenece a la organización de Partners. Usa el token OAuth.
- Si un build de la Function se cuelga, `timeout` solo mata al proceso padre. Mata los procesos huérfanos: `Get-CimInstance Win32_Process | ? CommandLine -match 'function build' | Stop-Process`.
- La descarga de javy a veces da 504: reintentar.
- Para ver el tema de staging con `curl` hace falta un cookie jar: `preview_theme_id` redirige a `brenson.co` y guarda el tema en una cookie.
- No hay Python en esta máquina: usa Node para los scripts auxiliares.
