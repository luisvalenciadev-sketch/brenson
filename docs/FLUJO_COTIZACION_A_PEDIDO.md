# De la cotización al pedido — estado real y decisión pendiente

**Fecha:** 18 de septiembre de 2026 · **Estado:** pendiente de decisión de negocio
**Contexto:** surgió al probar el portal en vivo. La pregunta fue: *"después de la cotización, ¿cuál es el proceso que haría Brenson para generar esos pedidos con ese valor?"*

Este documento deja por escrito qué existe, qué falta y qué hay que decidir antes de construir. No propone código todavía: la decisión de fondo es **cómo quiere vender Brenson**, no un asunto técnico.

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
| 2 | Pulsa "Aceptar cotización" → estado `aceptada` | ❌ falta |
| 3 | Le llega aviso al asesor asignado | ❌ falta — depende de Resend (pendiente 2b del estado general) |
| 4 | El asesor genera un **pedido borrador** con los mismos ítems y el valor exacto cotizado | ❌ falta |
| 5 | Shopify envía el enlace de pago / factura | ✅ nativo, no hay que construirlo |
| 6 | La empresa paga en línea, o el asesor marca la transferencia | ✅ nativo |
| 7 | El pedido aparece solo en "Pedidos" | ✅ nativo, en cuanto exista un pedido real |
| 8 | Al despachar, se registran las unidades con número de serie → alimenta "Mis unidades" y las garantías | ❌ falta — ver pendiente 2e |

**Lo importante del cuadro:** los pasos 5, 6 y 7 son nativos de Shopify. Lo que falta construir son el 2, 3, 4 y 8.

### El paso 4 es el crítico

Es automatizable y conviene que lo sea: un endpoint en el worker que tome la cotización y cree el pedido borrador con `draftOrderCreate`, respetando el precio negociado **línea por línea**.

Si se deja manual, el asesor retecleará precios y el valor del PDF y el del pedido podrán diferir. En un documento de ~$10 millones con factura electrónica de por medio, esa diferencia es un problema real, no una molestia.

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

**Opción A como camino principal, Opción B como complemento para recompras.** No son excluyentes, pero definen qué se construye primero.

---

## 4. Qué se construye según lo que se decida

**Si es A:**
1. Botón "Aceptar cotización" en el portal → `estado: aceptada` + aviso al asesor.
2. Endpoint `POST /b2b/order` en brenson-services: cotización → `draftOrderCreate` con los ítems y precios congelados.
3. Enviar la factura del pedido borrador desde Shopify.
4. Registro de unidades al despachar (paso 8), que conecta con el pendiente 2e.

**Si es B:**
1. Desplegar la Función de `brenson-b2b-functions` como descuento automático.
2. Verificar que el descuento por tier se aplique en el carrito y en el checkout, no solo en la cotización.
3. Definir qué pasa cuando el precio del catálogo cambia y hay una cotización vigente.

En ambos casos hace falta antes el **correo real (Resend)**: sin él, nadie en Brenson se entera de que hay una cotización aceptada esperando.

---

## 5. Relación con otros pendientes

- **2b — Correo real (Resend)**: bloquea el paso 3 de cualquiera de las dos opciones.
- **2e — Unidades con `cliente_id`**: bloquea el paso 8.
- **2f — PDF real (PDFMonkey)**: hoy la cotización que se adjunta a una negociación no es un PDF de verdad.
- **Riesgo R-A1 de la propuesta** (control de acceso B2B sin Shopify Plus): la Opción B depende de la Función, que es la mitigación planteada ahí y sigue sin desplegarse.

Referencias en la propuesta: Módulo 08 (pág. 9), flujo B2B (pág. 6) y el nivel 4 del funnel (pág. 18), que describen el ciclo hasta la cotización y el seguimiento del asesor, sin detallar el cierre.
