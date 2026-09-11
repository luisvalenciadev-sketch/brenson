# Shopify Flow — Automatizaciones Brenson

Shopify Flow está disponible en todos los planes. Estas cuatro automatizaciones se crean en Admin → Apps → Flow. Sin ellas el portal Empresas funciona (el guard lee la nota), pero la aprobación y el CRM dependen de ellas.

## Flow 1 · Solicitud corporativa recibida

| Campo | Valor |
|---|---|
| Trigger | **Customer created** |
| Condición | `customer.note` starts with `B2B {` |
| Acción 1 | **Add customer tags**: `b2b-pendiente` |
| Acción 2 | **Update customer metafield**: namespace `brenson_b2b`, key `estado_b2b`, value `pendiente` |
| Acción 3 | **Update customer metafield**: `brenson_b2b.tipo_cliente` = `empresa` |
| Acción 4 | **Send internal email** a `empresas@brenson.co`: asunto "Solicitud B2B: {{customer.displayName}}", cuerpo con `{{customer.note}}` y enlace al cliente en Admin |
| Acción 5 | **Send HTTP request** POST `https://<brenson-services>/webhooks/shopify/customers-create` (o dejar que el webhook nativo lo haga; no duplicar) |

Nota: los datos de empresa (razón social, NIT, sector, ciudad, flota, cargo, WhatsApp) llegan en la nota como JSON. Un paso opcional con **Run code** puede parsearlos y escribirlos en los metafields `brenson_b2b.*`; si no, el aprobador los copia a mano al aprobar.

## Flow 2 · Aprobación corporativa

| Campo | Valor |
|---|---|
| Trigger | **Customer tags added** |
| Condición | tag added = `cliente-corporativo` |
| Acción 1 | **Remove customer tags**: `b2b-pendiente` |
| Acción 2 | **Update customer metafield**: `brenson_b2b.estado_b2b` = `aprobado` |
| Acción 3 | **Update customer metafield**: `brenson_b2b.fecha_aprobacion` = `{{ scheduledAt | date: "%Y-%m-%d" }}` |
| Acción 4 | **Send marketing email / Klaviyo event** "b2b_aprobado" (bienvenida corporativa, tono usted) |
| Acción 5 | **Send HTTP request** al Worker si se quiere notificar a GHL de inmediato |

Antes de agregar el tag, el aprobador debe asignar en la ficha del cliente los metafields `brenson_b2b.tier` y `brenson_b2b.asesor` (referencias a metaobjects). El checklist de aprobación está en `MANUAL_ADMIN.md`.

## Flow 3 · Rechazo o suspensión

| Campo | Valor |
|---|---|
| Trigger | **Customer tags added** |
| Condición | tag added = `b2b-rechazado` o `b2b-suspendido` |
| Acción 1 | **Remove customer tags**: `cliente-corporativo`, `b2b-pendiente` |
| Acción 2 | **Update customer metafield**: `brenson_b2b.estado_b2b` = `rechazado` (o `suspendido`) |
| Acción 3 | Email interno al asesor asignado |

## Flow 4 · Segmentación B2C desde el registro

| Campo | Valor |
|---|---|
| Trigger | **Customer created** |
| Condición | `customer.note` contains `Ciudad` AND NOT starts with `B2B {` |
| Acción | **Run code**: extraer `Ciudad` y `Uso previsto` de la nota (formato `Ciudad: X\nUso previsto: Y`) y escribir `brenson.ciudad`, `brenson.uso_previsto` |

## Flow 5 · Pedido entregado

| Campo | Valor |
|---|---|
| Trigger | **Order fulfilled** |
| Acción 1 | **Wait** 14 días → evento a Junip / Klaviyo "solicitar reseña" (decisión K7) |
| Acción 2 | **Send internal email** a servicio@brenson.co: "Registrar unidades del pedido {{order.name}}" con enlace a Metaobjects → Unidad vendida (el número de serie se asigna en bodega) |

## Webhooks nativos hacia brenson-services

Admin → Configuración → Notificaciones → Webhooks (formato JSON, versión 2025-07):

| Topic | URL |
|---|---|
| Customer creation | `https://<worker>/webhooks/shopify/customers-create` |
| Customer update | `https://<worker>/webhooks/shopify/customers-update` |
| Checkout creation | `https://<worker>/webhooks/shopify/checkouts-create` |
| Order creation | `https://<worker>/webhooks/shopify/orders-create` |
| Order fulfillment | `https://<worker>/webhooks/shopify/orders-fulfilled` |

El secreto que muestra Shopify al crear el primer webhook va en `SHOPIFY_WEBHOOK_SECRET`.
