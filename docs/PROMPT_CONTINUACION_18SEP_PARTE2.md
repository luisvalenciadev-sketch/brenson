# Prompt de continuación — 18-sep-2026 (parte 2): cierre del canal B2B tras la migración a cuentas nuevas

Pega esto como primer mensaje en la nueva sesión de Claude Code, en el repo `C:\Users\USER\OneDrive\Documentos\X-SOLUTION\brenson`.

---

Continúa el proyecto Brenson (e-commerce de vehículos eléctricos en Shopify). **Antes de hacer nada, lee `docs/ESTADO_GENERAL_18SEP2026.md` completo**, en especial la sección **3b** (migración a cuentas nuevas de cliente) y la tabla de la sección **5** (pendientes técnicos). Es la fuente de verdad, generada verificando en vivo contra la tienda real. No repitas verificaciones que ese documento ya deja resueltas.

## Contexto de acceso

- **Tienda**: `brenson-0.myshopify.com`, API `2025-07`. Tema de staging: **ID 143001354315** — usa siempre el ID numérico en `theme push`, nunca el nombre.
- **Necesito dos tokens al empezar**, no persisten entre sesiones y no se guardan en disco:
  - `SHOPIFY_ADMIN_TOKEN` de la app custom. **Debe incluir `write_customers`** — el alta corporativa usa `customerCreate`. El token que estaba guardado en el worker antes del 18-sep estaba vencido y Shopify lo rechazaba; si vuelve a fallar, el síntoma es `[API] Invalid API key or access token` en los logs del worker.
  - `CLOUDFLARE_API_TOKEN` (+ `CLOUDFLARE_ACCOUNT_ID = e7cdaf8e394616cfa6dd85dfcac67a70`) para desplegar `brenson-services`. Se usan como variables de entorno en cada comando, nunca escritos a disco.
  - Los tokens usados el 18-sep quedaron en el historial de esa conversación y se pidió rotarlos. Asume que los anteriores ya no sirven.
- **Worker**: `https://brenson-services.brenson.workers.dev`, desplegado y funcionando (versión `f909491b`). Secretos ya configurados en Cloudflare: `SHOPIFY_ADMIN_TOKEN` y `QUOTE_SIGNING_SECRET`.
- **Flujo de despliegue del tema, obligatorio**: `theme check` (0 errores; ~96 warnings preexistentes son normales) → `theme push --theme 143001354315` → **verificar con `theme pull` a un directorio aparte + comparar**. El mensaje "pushed successfully" no es confiable por sí solo. Al comparar, ignora las diferencias de los `.json`: Shopify reordena claves y agrega `"settings": {}`, lo que produce falsos positivos — compara el contenido parseado, no el texto.

## Qué se hizo en la sesión anterior (no lo repitas)

Se cerró la decisión A2 y se migró todo el canal B2B a **cuentas nuevas de cliente**. El detalle completo está en `docs/ESTADO_GENERAL_18SEP2026.md` §3b y en `docs/DECISIONES_BRENSON.md` §"Cuentas nuevas". En resumen: el login vive ahora en la pantalla alojada de Shopify (sin contraseña, código al correo), el alta corporativa la hace el worker con Admin API, y se eliminó todo el código de login/registro del tema. **El alta se probó de punta a punta contra la tienda real y funciona.**

No vuelvas a proponer cuentas clásicas: Shopify ya no las ofrece, no es una opción.

Después se probó el portal en vivo con una empresa real y salieron seis fallos más, todos corregidos (detalle en §3c del estado general): nombre del contacto que no se guardaba, rate limit que contaba antes de validar, formulario colgado en "Enviando…", dos enlaces de sesión rotos, títulos invisibles en el portal y "Mis cotizaciones" siempre vacío.

**Dos trampas que costaron tiempo y conviene no repetir:**

- **Los PNG de `stitch-design/` se capturaron sin cargar Tailwind**, así que se ven con fondo blanco aunque el diseño sea oscuro. Estuve a punto de invertir medio portal a modo claro por eso. **Lee el HTML del mockup, no la imagen.**
- **Un `customer_reference` no resuelve de forma fiable en Liquid del storefront** y la documentación de Shopify no lo aclara. Si necesitas filtrar metaobjetos por cliente, guarda el id como texto plano en un campo aparte. Ya está hecho en `brenson_cotizacion_b2b` (`cliente_id`); falta en `brenson_unidad` (tarea 4).
- Relacionado con el color: los mockups usan **rojo** como acento y el tema usa **verde**. Eso es deliberado, el manual de marca real especifica verde; los mockups quedaron desactualizados. No lo "corrijas" de vuelta.

## Tareas de esta sesión

### 1. Habilitar R2 y cerrar el paso 2 del registro corporativo — lo más urgente

Hoy el documento de la empresa (cámara de comercio / RUT) **no se guarda en ningún lado**, y el problema es peor que una simple funcionalidad faltante: `/upload` responde 200, escribe `documento_tipo` en el cliente, pero `documento_url` queda vacío porque Shopify rechaza el valor `local://…` (el metafield es de tipo `url`). El equipo de habilitación ve en el admin que hay una "cámara de comercio" y no existe ningún archivo. Es un dato que miente.

- Verifica primero si el usuario ya habilitó R2 en el panel de Cloudflare (`wrangler r2 bucket list`; si sigue apagado devuelve `code: 10042`). Requiere método de pago aunque el uso quede en el tier gratis.
- Con R2 activo: crea `brenson-b2b-docs` y `brenson-b2b-docs-dev`, descomenta el bloque `[[r2_buckets]]` de `wrangler.toml`, cambia `STORAGE_PROVIDER` a `"r2"`, despliega y **vuelve a probar la subida verificando que `documento_url` sí quede escrito en el cliente** y que el enlace firmado abra el archivo.
- Si el usuario decide no habilitar R2 por ahora, **no lo dejes como está**: al menos haz que `/upload` falle de forma visible en vez de fingir éxito, para que nadie crea que el documento se guardó.

### 2. Correo real — sin esto el canal B2B no opera

`MAIL_PROVIDER = "console"`: el aviso "Solicitud B2B: <empresa>" se escribe en el log del worker y ahí muere. Una empresa puede registrarse correctamente y quedar en estado `pendiente` para siempre, porque nadie en Brenson se entera de que debe aprobarla.

- Pide la `RESEND_API_KEY` y confirma que el dominio `brenson.co` esté verificado en Resend (el remitente configurado es `cotizaciones@brenson.co`).
- Cambia `MAIL_PROVIDER` a `"resend"` en `wrangler.toml`, guarda el secreto, despliega y **verifica con un envío real** que llega a `empresas@brenson.co`, no solo que el worker no dé error.

### 3. Turnstile — activar los dos lados a la vez

El cableado quedó correcto el 18-sep (el JS ya envía `cf-turnstile-response`), pero falta activarlo.

- **Cuidado con el orden**: si pones `TURNSTILE_SECRET` en el worker sin cargar `brenson_turnstile_site_key` en los ajustes del tema, el widget no se renderiza, no se envía token, y `/b2b/request` rechaza el 100% de las solicitudes con 403. Activa ambos lados en la misma pasada y prueba enviando el formulario de verdad.

### 4. Unidades en flota: el mismo bug que tenían las cotizaciones

`brenson-b2b-dashboard` filtra las unidades con `u.cliente.value.id`. Ese `customer_reference` no resuelve de forma fiable en Liquid del storefront — es exactamente lo que dejaba "Mis cotizaciones" siempre vacío.

- En las cotizaciones se resolvió agregando un campo `cliente_id` (texto plano) al metaobjeto y filtrando por él. Las líneas del dashboard ya quedaron como `u.cliente_id.value | default: u.cliente.value.id`, o sea **esperando ese campo**.
- Falta hacer lo mismo en la definición `brenson_unidad`: crear `cliente_id`, rellenarlo en las unidades existentes y, sobre todo, **definir quién lo llena al registrar una unidad nueva** — hoy las unidades no las crea el worker, se cargan a mano.
- Hoy no se nota porque no hay unidades cargadas para ningún cliente real. El día que se carguen, "Mis unidades en flota" y los KPI de unidades y garantías van a salir en cero sin que nadie entienda por qué.

### 5. PDF real de cotización (Módulo 08)

Lo que hoy se descarga **no es un PDF**: con `PDF_PROVIDER = "html"` el worker guarda el HTML en KV y lo sirve en una URL terminada en `.pdf`. Se ve en el navegador, pero no se puede adjuntar a un correo ni archivar.

- Pedir la `PDFMONKEY_API_KEY` y las dos plantillas (`PDFMONKEY_TEMPLATE_QUOTE`, `PDFMONKEY_TEMPLATE_SPEC`), cambiar `PDF_PROVIDER` a `"pdfmonkey"` y verificar con una cotización real que el archivo descargado abre como PDF.
- El código del proveedor ya está escrito con reintentos (riesgo 04 de la propuesta). Solo falta la cuenta.
- Aparte: el sello "DOCUMENTO DE PRUEBA · modo simulación" que aparece en la cotización **es correcto** — lo pone `quote.ts` cuando `ENVIRONMENT !== 'production'`. No lo quites en staging. Sí hay que acordarse de cambiar `ENVIRONMENT` en el go-live, o las cotizaciones reales saldrían marcadas como prueba.

### 6. De la cotización al pedido — **no empieces a construir sin la decisión**

El ciclo comercial se corta en la cotización: no existe nada que la convierta en pedido, la Función de descuento por tier no está desplegada (así que quien arme un carrito paga precio público) y el estado `aceptada` se pinta pero nunca se asigna.

**Lee `docs/FLUJO_COTIZACION_A_PEDIDO.md` completo.** Tiene el estado verificado, el flujo paso a paso con lo que falta, las dos opciones de cierre (pedido borrador vs. compra directa) y qué se construye según cada una.

Es una **decisión de negocio de Brenson**, no técnica: ¿cierra el asesor con pedido borrador, o compra la empresa sola desde el portal? Pregúntala antes de escribir código. La recomendación registrada es pedido borrador como camino principal y la Función como complemento para recompras.

### 7. `git push` pendiente

Hay 2 commits locales que `origin/main` no tiene: `83b06d4` (limpieza de plantillas de Dawn) y `585e9a7` (arreglo del 502 + Turnstile + URL del servicio). Confírmalo con el usuario antes de empujarlos.

### 8. Verificar el dashboard de pedidos del cliente (sub-pregunta abierta de A2)

La propuesta promete en el Módulo 07 un "dashboard: pedidos, garantías, facturas descargables". Con cuentas nuevas, Shopify muestra los pedidos en su portal alojado (`https://shopify.com/62219747403/account`).

- Verifica si el tema puede seguir listando `customer.orders` desde una página propia (`/pages/empresas`) o si hay que enlazar al portal de Shopify para esa parte. **No asumas la respuesta**: compruébalo contra la documentación y, si hace falta, renderizando de verdad con una sesión iniciada.
- Según el resultado, actualiza el punto 7 de `docs/ESTADO_GENERAL_18SEP2026.md` §4.1 y la fila M07 de `docs/PLAN_DE_TRABAJO_BRENSON.md`.

### 9. Cerrar la brecha de `/upload` sin token (opcional, según prioridad)

`/upload` acepta un `customer_id` sin token, porque así funciona la subida desde la página de estado pendiente de un cliente con sesión. Eso significa que alguien con un `customer_id` ajeno podría sobrescribir el documento de otra empresa. El token HMAC solo cubre el camino nuevo (alta sin sesión). Cerrarlo requiere un mecanismo de sesión entre el tema y el worker — evalúa el costo antes de proponerlo, no es trivial.

## Cosas que NO debes hacer

- No propongas volver a cuentas clásicas de cliente.
- No recrees `templates/customers/*` ni las secciones `main-login` / `main-register` / `main-account`: se eliminaron a propósito, Shopify no las renderiza.
- No uses `form 'customer_login'` ni `form 'create_customer'` en Liquid: no funcionan con cuentas nuevas.
- No confíes en `customer.note` en Liquid: no es una propiedad del objeto `customer`.
- No quites el sello "DOCUMENTO DE PRUEBA" de las cotizaciones mientras `ENVIRONMENT` sea `staging`: es correcto que esté.
- No valides una pantalla del portal contra un solo estado. Son cinco (sin sesión, personal, pendiente, rechazado, aprobado) y ya hubo que rehacer un arreglo por probarlo solo contra el estado que había a mano.
- No des por desplegado nada sin la verificación posterior (pull + comparación para el tema; una petición real para el worker). Y al subir una sección **y** una plantilla que usa un ajuste nuevo de esa sección, hazlo en **dos push separados**: Shopify valida la plantilla contra el schema anterior y descarta el ajuste en silencio, diciendo "pushed successfully" igual.
