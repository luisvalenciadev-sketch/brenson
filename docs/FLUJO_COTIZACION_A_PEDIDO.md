# De la cotización al pedido — estado real y decisión pendiente

**Fecha:** 18 de septiembre de 2026 · última actualización 19 de septiembre de 2026 · **Estado:** Opción A implementada y validada en staging; Opción B en construcción (bloqueada a medias, ver §6)
**Contexto:** surgió al probar el portal en vivo. La pregunta fue: *"después de la cotización, ¿cuál es el proceso que haría Brenson para generar esos pedidos con ese valor?"*

Este documento nació como una decisión de negocio pendiente; ya se decidió (Opción A como principal, ver §3) y esa parte **ya está construida y probada de punta a punta en staging**. Lo que queda abierto es la Opción B (descuento automático para recompras), documentado en la §6.

---

## 1. Lo que existe hoy (verificado contra la tienda real)

```
Empresa aprobada → entra al portal → arma cotización → PDF → …y ahí se acaba
```

| Hecho | Cómo se verificó |
|---|---|
| **No existe ningún código que convierta una cotización en pedido** | Búsqueda de `draftOrder`, `draft_order`, `orderCreate` en `brenson-services/`, `brenson-theme/sections/` y `brenson-b2b-functions/`: **cero referencias** |
| **"Pedidos" del menú no lleva a nada propio** | `brenson-b2b-header.liquid:25` apunta a `routes.account_url`, el portal alojado de Shopify. Si nunca se crea un pedido, siempre estará vacío |
| **La Función de descuento por tier NO está desplegada** | `automaticDiscountNodes` en la tienda devuelve **0**. Si una empresa arma un carrito y paga, **paga precio público**. El 8/12/18 % solo existe dentro del cálculo de la cotización y como número en pantalla |
| **Una cotización nunca puede llegar a `aceptada`** | El estado se pinta en la tabla y está en los datos de prueba, pero `quote.ts` solo asigna `borrador` y `enviada`. No hay forma de que la empresa diga "la acepto" |

Conclusión: el portal **insinúa** un ciclo comercial completo (pedidos, estado "aceptada", descuento por volumen) que todavía no existe detrás.

---

## 2. El flujo completo, y qué falta de cada paso

Para venta de flota en Colombia (10+ vehículos, transferencia bancaria, factura electrónica DIAN) el camino natural es el **pedido borrador**, no el checkout con tarjeta.

| # | Paso | Estado |
|---|---|---|
| 1 | La empresa arma su cotización en el portal | ✅ existe |
| 2 | Pulsa "Aceptar cotización" → estado `aceptada` | ✅ **implementado y probado** (19-sep) |
| 3 | Le llega aviso al asesor asignado | ✅ implementado — hoy sale por `[mail:console]` (log) porque `MAIL_PROVIDER` sigue en modo consola; el código de Resend ya existe, solo falta activar la variable (pendiente 2b) |
| 4 | Se genera un **pedido borrador** con los mismos ítems y el valor exacto cotizado, automáticamente al aceptar | ✅ **implementado y probado** — ver §5 |
| 5 | Shopify envía el enlace de pago / factura | ✅ nativo, no hay que construirlo |
| 6 | La empresa paga en línea, o el asesor marca la transferencia | ✅ nativo |
| 7 | El pedido aparece solo en "Pedidos" | ✅ nativo, en cuanto el draft order se facture/pague (mientras esté sin pagar solo se ve en Admin → Borradores) |
| 8 | Al despachar, se registran las unidades con número de serie → alimenta "Mis unidades" y las garantías | ❌ falta — ver pendiente 2e |

**Lo importante del cuadro:** los pasos 2, 3 y 4 ya están construidos y verificados en staging (draft order real creado, precio congelado, sin duplicados). Solo queda el paso 8, que depende de otro pendiente (2e), y la Opción B (§6).

### El paso 4 — ya resuelto, y cómo

Se automatizó del todo: `POST /quotes/:numero/accept` en `brenson-services` hace, en una sola llamada atómica, la creación del draft order (`draftOrderCreate`, precio negociado congelado línea por línea con `originalUnitPrice`) y marca la cotización como `aceptada`. No quedó como paso manual del asesor — así se elimina el riesgo que motivó todo este documento: que el asesor reteclee precios y el valor del PDF y el del pedido difieran.

---

## 3. La decisión pendiente

### Opción A — El asesor cierra con pedido borrador *(recomendada)*

La empresa acepta la cotización, el asesor genera el pedido borrador y Shopify se encarga del cobro y del pedido.

- Preserva el valor cotizado exactamente, incluida cualquier negociación manual.
- No necesita la Función de descuento desplegada.
- Encaja con cómo se paga realmente una flota: transferencia y factura, no tarjeta.
- Contra: un paso humano por pedido. Aceptable en venta de alto ticket y bajo volumen.

### Opción B — La empresa compra sola desde el portal

Se despliega la Función de descuento y el catálogo corporativo permite comprar directo.

- Sirve bien para **recompras pequeñas** (un repuesto, una unidad suelta).
- Contra: la cotización queda congelada 15 días mientras el precio del catálogo puede moverse, así que el precio pagado puede no coincidir con el cotizado.
- Contra: una compra de $10 millones rara vez se paga con tarjeta.

### Recomendación

**Opción A como camino principal, Opción B como complemento para recompras.** No son excluyentes, se están construyendo las dos, en ese orden.

---

## 4. Qué se construyó (Opción A) — 19 de septiembre de 2026

Implementado, desplegado en staging y **probado de punta a punta con una cotización real** (COT-2026-0009 → draft order `#D1`):

**`brenson-services`:**
- `types.ts` — `Quote.estado` ahora acepta `'borrador' | 'enviada' | 'aceptada' | 'vencida' | 'rechazada'`.
- `lib/shopify.ts` — `fetchQuoteByNumero` (busca por el campo `numero`, no por handle — ver nota abajo sobre por qué), `updateQuoteMetaobject`, `createDraftOrder` (usa `originalUnitPrice` por línea para congelar el precio).
- `index.ts` — nuevo endpoint `POST /quotes/:numero/accept`: rate limit, verifica token HMAC de un solo uso, valida dueño (`cliente_id`), idempotencia (si ya está `aceptada` no crea un segundo draft order), chequeo de vigencia (`validez_dias`), crea el draft order, actualiza el metaobject, envía el correo al asesor. `POST /quote` ahora genera y guarda `accept_token` cuando la cotización pasa a `enviada`.

**`brenson-theme`:**
- `sections/brenson-b2b-dashboard.liquid` — botón "Aceptar cotización" (solo visible en estado `enviada`).
- `assets/brenson-b2b-dashboard.js` (nuevo) — llama al endpoint y actualiza la fila sin recargar la página.

**Schema de Shopify** (`docs/metafield-definitions.json`, aplicado con `scripts/add-quote-accept-fields.mjs`): 3 campos nuevos en `brenson_cotizacion_b2b` — `accept_token`, `pedido_borrador_id`, `pedido_borrador_url`.

**Bugs reales encontrados y corregidos durante la prueba** (quedan documentados porque explican decisiones del código):
1. El endpoint buscaba la cotización por un handle derivado del número (`cot-2026-0004`), pero Shopify le pone un sufijo (`cot-2026-0001-1`) cuando hay colisión de handle — el mismo problema de siembra de datos duplicados que ya documentaba `quote.ts`. Se corrigió buscando por el campo `numero`, no por el handle.
2. La mutación `draftOrderCreate` usaba `note2`, campo que no existe en `DraftOrderInput` en la API 2025-07 — es `note`.
3. El token `SHOPIFY_ADMIN_TOKEN` del worker no tenía el scope `write_draft_orders` (sí tenía `write_orders`, que es un scope distinto) — se agregó manualmente en Shopify Admin → Desarrollo de apps.

**Pendiente, no bloqueante:** activar `MAIL_PROVIDER=resend` en `wrangler.toml` (el código ya funciona, el aviso al asesor hoy queda como log de consola en vez de correo real) — depende del pendiente 2b (verificación DNS).

**Nota sobre "Pedidos" vacío:** un draft order no aparece en `/account/orders` del cliente hasta que se factura/paga — mientras tanto solo existe en Shopify Admin → Borradores. Es el comportamiento nativo esperado (paso 5→6→7 de la tabla), no un bug.

---

## 5. Opción B — descuento automático (en construcción, sesión interrumpida)

Código listo y con tests pasando (`brenson-b2b-functions/extensions/tier-discount`, Shopify Function `cart.lines.discounts.generate.run`). Sirve para **recompras pequeñas** (un repuesto, una unidad suelta) donde no tiene sentido pasar por cotización formal.

**Progreso real al 19-sep:**
- ✅ App de Partners vinculada: `shopify.app.toml` → `client_id = "d7aa7b649732e4edb4cda78786dd1701"`, app "Brenson Admin Scripts" (la misma que ya tenía el custom app token — Shopify permite que una app tenga ambas cosas).
- ✅ `shopify.extension.toml` corregido: el `[extensions.build] command` estaba vacío (bloqueaba cualquier deploy) → se fijó en `"npm run build"`.
- ⚠️ **`npx shopify app deploy` se cuelga en el paso de build de la función** (`npm exec -- shopify app function build`, probablemente compilando con `javy`) y no termina ni con >3 minutos de margen. Se probó:
  - Corriendo el proyecto **fuera de OneDrive** (se copió a un directorio temporal) para descartar que la sincronización en tiempo real de OneDrive fuera la causa — instaló dependencias en 18s (vs. minutos colgado dentro de OneDrive), pero el build se colgó igual en el mismo punto. Conclusión: OneDrive no es la causa raíz, hay otra cosa bloqueando el build de la function en sí (sospecha: descarga o ejecución del compilador `javy`).
  - Conectividad de red a GitHub/npm confirmada OK, no parece ser un bloqueo de red genérico.
- **Siguiente paso al retomar:** investigar el build de `javy` en aislamiento (`cd extensions/tier-discount && npx shopify app function build --verbose`, revisar si hay un proceso `javy`/`cargo` colgado con `tasklist`, o probar fijar una versión distinta de `@shopify/shopify_function`/`javy` en `package.json` si el problema es una versión rota).

**Una vez compile y despliegue**, falta activar el descuento automático — se puede hacer por Admin API (`discountAutomaticAppCreate`, usando el `functionId` que expone `shopifyFunctions` en la Admin GraphQL API una vez la app esté instalada), sin pasar por la UI de Configuración → Descuentos.

---

## 6. Relación con otros pendientes

- **2b — Correo real (Resend)**: el código del aviso al asesor (paso 3) ya está armado; falta solo activar la variable de entorno.
- **2e — Unidades con `cliente_id`**: bloquea el paso 8.
- **2f — PDF real (PDFMonkey)**: hoy la cotización que se adjunta a una negociación no es un PDF de verdad.
- **Riesgo R-A1 de la propuesta** (control de acceso B2B sin Shopify Plus): la Opción B depende de la Función, que es la mitigación planteada ahí y sigue sin desplegarse (ver §5).

Referencias en la propuesta: Módulo 08 (pág. 9), flujo B2B (pág. 6) y el nivel 4 del funnel (pág. 18), que describen el ciclo hasta la cotización y el seguimiento del asesor, sin detallar el cierre.
