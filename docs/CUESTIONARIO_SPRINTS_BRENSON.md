# CUESTIONARIO DE DEFINICIONES POR SPRINT — BRENSON S.A.S.

Complemento de `PLAN_DE_TRABAJO_BRENSON.md`. Cada pregunta indica **por qué importa**, **quién responde** y una **recomendación por defecto**. Si una pregunta no se responde, se aplica la recomendación y se marca como supuesto en el sprint.

Convención de respuesta: escribe debajo de cada pregunta en la línea `> Respuesta:`.

Prioridad: 🔴 bloquea el sprint · 🟡 se puede arrancar con el default · 🟢 se puede resolver durante el sprint.

---

## SPRINT 0 — Decisiones de arquitectura (responder antes de todo)

### A1 🔴 ¿Aprueban rehacer el tema sobre Dawn y descartar EDrop?
- Por qué: define todo el plan. Refactorizar EDrop implica heredar código ofuscado, cloaking y notificaciones falsas.
- Responde: Brenson + Enlaces Digitales.
- Default: **Sí, rehacer sobre Dawn.** EDrop se conserva como tema no publicado por 90 días y luego se elimina.
> Respuesta:

### A2 🔴 ¿La tienda usa cuentas de cliente **clásicas** o **nuevas**? (Admin → Configuración → Cuentas de clientes)
- Por qué: el portal B2B en Liquid (gating por tag, registro con NIT) solo funciona con cuentas clásicas.
- Responde: Dev con acceso Admin.
- Default: si están en "nuevas", cambiar a **clásicas** antes del Sprint 4.
> Respuesta:

### A3 🔴 ¿Aceptan los dos ajustes técnicos frente a la propuesta original?
1. Filtros con facetas nativas + Section Rendering API (no Storefront API).
2. B2B con cuentas clásicas + tags + Shopify Function en app custom (sin Shopify Plus).
- Responde: Enlaces Digitales (autor de la propuesta) + Brenson.
- Default: **aceptar ambos.**
> Respuesta:

### A4 🔴 ¿Alcance contratado: MVP B2C (8 semanas) o versión completa con B2B (16 semanas)?
- Por qué: define si los Sprints 4 a 8 se ejecutan.
- Default: **16 semanas** (recomendado en la propuesta).
> Respuesta:

### A5 🟡 ¿Plan de Shopify actual? (Basic, Shopify, Advanced, Plus)
- Por qué: Advanced habilita reportes y más ubicaciones; Plus cambiaría la estrategia B2B. Shopify Functions y Flow funcionan en todos los planes.
> Respuesta:

### A6 🟡 ¿Quién tendrá acceso de colaborador al Admin y con qué permisos? (temas, productos, clientes, apps, descuentos, Custom data, Flow)
- Por qué: sin permiso de Custom data no se pueden crear metafields; sin permiso de apps no se instala la app custom.
- Default: cuenta de colaborador con todos los permisos excepto facturación y pagos.
> Respuesta:

### A7 🟡 ¿Existe tienda de desarrollo o se trabaja con temas no publicados en la tienda live?
- Default: temas no publicados en la tienda live + Shopify CLI. Sin tienda de desarrollo separada (evita duplicar productos).
> Respuesta:

### A8 🟢 ¿Dónde vive el código? (GitHub de Brenson, de Enlaces Digitales, GitLab, otro) ¿Quién es owner?
- Default: organización GitHub de Brenson, con Enlaces Digitales como colaborador. Brenson debe ser dueño de su código.
> Respuesta:

---

## SPRINT 1 — Auditoría, arquitectura y UX (Semanas 1–2)

### Marca y diseño

### B1 🔴 ¿Existe manual de marca (logo vectorial, colores oficiales, tipografía)?
- Por qué: el tema actual usa Montserrat, negro `#050709` y rojo `#EE0000`. Hay que confirmar si eso es marca o herencia de EDrop.
- Default: partir de Montserrat + negro + rojo y validar con UI/UX en la semana 1.
> Respuesta:

### B2 🟡 ¿Quién hace el diseño UI/UX en Figma: equipo de Enlaces Digitales, freelance o se diseña directamente en código sobre Dawn?
- Por qué: la propuesta contempla wireframes de todas las páginas antes del frontend.
- Default: Figma de las 7 páginas clave (home, colección, ficha, simulador, login/registro, portal B2B, cotizador). El resto se diseña en código.
> Respuesta:

### B3 🟡 ¿Tono de comunicación? (cercano/tú, formal/usted, técnico, aspiracional). ¿Hay copy existente aprobado?
- Default: "tú", directo, orientado a beneficios; términos técnicos con explicación.
> Respuesta:

### B4 🟢 ¿Referencias visuales que les gusten además de Kavak? ¿Alguna que no quieran parecerse?
> Respuesta:

### Catálogo y contenido

### B5 🔴 ¿Cuáles son las categorías definitivas de vehículos y su nombre comercial?
- Propuesta: bicicletas eléctricas, ciclomotores, motocarros, cuadriciclos. ¿Hay más? (patinetas, triciclos de carga, repuestos, accesorios, baterías)
- Por qué: define colecciones, facetas, grid de categorías y menú.
> Respuesta:

### B6 🔴 ¿Cuántos productos activos hay hoy y cuántos se proyectan en 12 meses? ¿Cuántos son vehículos y cuántos accesorios/repuestos?
- Por qué: define si la ficha de accesorio es necesaria y la estrategia de carga de metafields.
> Respuesta:

### B7 🔴 ¿Qué especificaciones técnicas tienen disponibles por vehículo y en qué formato? (Excel, fichas del fabricante en PDF, solo en la cabeza del vendedor)
- Lista mínima que necesitamos: autonomía km, velocidad máx, capacidad de carga kg, potencia W, tipo y capacidad de batería, tiempo de carga, peso, pasajeros, requiere licencia, requiere SOAT, garantía meses, garantía batería meses.
- Por qué: sin esto no hay facetas, ni specs, ni JSON-LD.
- Default: Enlaces Digitales entrega plantilla Excel en semana 1; Brenson la devuelve completa al 80 % antes de la semana 3.
> Respuesta:

### B8 🔴 ¿Fotos y videos: cuántos ángulos por vehículo tienen hoy, en qué resolución y con qué fondo? ¿Hay video del vehículo estrella para el hero?
- Default: mínimo 5 fotos por vehículo (frontal, lateral, trasera, detalle batería, en uso), fondo neutro, 2000 px. Sesión fotográfica si no existen.
> Respuesta:

### B9 🟡 ¿Existen fichas técnicas en PDF por modelo para descarga (exit intent y ficha)?
- Default: si no existen, se generan desde los metafields con PDFMonkey en Fase 3 (misma plantilla que la cotización).
> Respuesta:

### B10 🟡 ¿Los vehículos tienen variantes (color, capacidad de batería, versión)? ¿Cambia el precio por variante?
- Por qué: el simulador y el precio por tier deben reaccionar a la variante seleccionada.
> Respuesta:

### B11 🟡 ¿Manejan inventario real en Shopify o venden bajo pedido/importación? ¿Se muestra "disponible", "bajo pedido" o "agotado"?
- Default: inventario real + estado "bajo pedido, entrega en X semanas" configurable por producto.
> Respuesta:

### B12 🟢 ¿Los handles (URLs) de productos actuales deben conservarse? ¿Hay campañas activas apuntando a URLs específicas?
- Default: conservar handles de productos, redirigir 301 colecciones antiguas.
> Respuesta:

### Confianza (datos reales)

### B13 🔴 ¿Qué datos verificables pueden publicar para los contadores? (vehículos vendidos, clientes, años de operación, ciudades atendidas, km recorridos por la flota)
- Por qué: el módulo de confianza no puede usar datos inventados. Si no hay dato, el contador no se publica.
> Respuesta:

### B14 🔴 ¿Qué incluye la "Certificación Brenson"? Lista de puntos de inspección/preparación que hacen a cada vehículo antes de entregarlo.
- Por qué: es el checklist visible del badge. Debe ser real y defendible.
> Respuesta:

### B15 🔴 Garantía: ¿cuántos meses para vehículo, motor, batería, controlador? ¿Qué cubre y qué excluye? ¿Hay texto legal ya redactado?
> Respuesta:

### B16 🟡 Aliados y clientes: ¿tienen autorización para usar los logos de Parque Tayrona, Comfandi, IsaMotos y otros? ¿Cuáles más?
> Respuesta:

### B17 🟡 Testimonios: ¿tienen testimonios reales con nombre, foto y autorización? ¿Casos de uso documentados (empresa, cuántas unidades, resultado)?
- Default: se publican solo los que tengan autorización escrita. Se marca `verificado`.
> Respuesta:

### B18 🟡 Envíos: ¿cubren toda Colombia? ¿Tiempos estimados por región? ¿Costo incluido o cotizado? ¿Quién transporta vehículos grandes (motocarros)?
> Respuesta:

### Financiación (Módulo 05)

### C1 🔴 ¿Brenson financia directamente o a través de un aliado (banco, fintech, cooperativa)? ¿Cuál?
- Por qué: define si el simulador es informativo o si dispara una precalificación real.
> Respuesta:

### C2 🔴 ¿Tasa de interés de referencia para el simulador? (mensual o efectiva anual). ¿Cambia por plazo o por tipo de vehículo?
- Default: una tasa mensual única editable desde Admin. Si varía por plazo, se modela como tabla en el metaobject.
> Respuesta:

### C3 🔴 ¿Plazos disponibles? (propuesta: 12, 24, 36, 48 meses) ¿Cuotas iniciales? (propuesta: 0 %, 10 %, 20 %, 30 %)
> Respuesta:

### C4 🔴 ¿Texto legal del disclaimer? ("Cuota estimada, sujeta a aprobación crediticia. No constituye oferta.") ¿Debe revisarlo un abogado?
> Respuesta:

### C5 🟡 ¿Hay costos adicionales que mostrar? (seguro, matrícula, SOAT, estudio de crédito, IVA incluido o no)
- Default: cuota sobre precio publicado con IVA incluido; nota sobre gastos de matrícula/SOAT no incluidos.
> Respuesta:

### C6 🟡 ¿Qué pasa después de "Solicitar financiamiento"? (lead a asesor, redirección al aliado financiero, formulario de precalificación con datos personales)
- Default: lead a GHL con vehículo, plazo, inicial y cuota; asesor contacta.
> Respuesta:

### C7 🟢 ¿Hay productos NO financiables (accesorios, repuestos)? Se controla con el metafield `financiable`.
> Respuesta:

### B2B (Módulo 07/08) — definir aunque el portal arranque en Sprint 4

### D1 🔴 ¿Cuántos tiers de precio corporativo y cuál es el descuento y el mínimo de unidades de cada uno? (propuesta: 10+, 20+, 50+)
- Por qué: define la Shopify Function y los metaobjects de tier. Sin esto no se puede construir el portal.
> Respuesta:

### D2 🔴 ¿El descuento es porcentaje sobre precio público, precio fijo por tier, o negociado caso a caso?
- Default: porcentaje por tier, con posibilidad de override por producto.
> Respuesta:

### D3 🔴 ¿Quién aprueba las solicitudes de acceso corporativo y en cuánto tiempo? ¿Qué validan? (NIT en RUES, cámara de comercio, referencia comercial)
- Default: aprobación manual en Shopify Admin cambiando el tag. Compromiso de 24 h hábiles.
> Respuesta:

### D4 🔴 ¿Qué datos exigir en el registro corporativo? (NIT con dígito de verificación, razón social, sector, ciudad, flota estimada, cargo del contacto, cámara de comercio adjunta)
- Default: NIT, razón social, sector, ciudad, flota estimada, nombre, cargo, teléfono. Sin adjuntos en el registro.
> Respuesta:

### D5 🔴 ¿El cliente corporativo compra en línea (checkout con descuento aplicado) o solo cotiza y cierra con asesor?
- Por qué: si solo cotiza, la Function de descuento sigue siendo necesaria como validación, pero el botón de compra puede ocultarse.
- Default: ambos: cotización PDF + posibilidad de checkout con descuento.
> Respuesta:

### D6 🟡 ¿Qué productos son B2B? ¿Los mismos del catálogo público, modelos exclusivos de flota, o ambos?
> Respuesta:

### D7 🟡 ¿Qué debe contener la cotización PDF? (logo, datos fiscales Brenson, datos del cliente, tabla de ítems, descuento, IVA, total, validez, condiciones de pago, garantía, asesor, firma)
- ¿Tienen una plantilla actual en Word/Excel para replicar?
> Respuesta:

### D8 🟡 ¿Validez de la cotización? (propuesta: 15 días, configurable)
> Respuesta:

### D9 🟡 ¿Quiénes son los asesores B2B? (nombre, foto, WhatsApp, email). ¿Cómo se asigna un asesor a un cliente? (manual, por región, por sector, round-robin)
- Default: asignación manual al aprobar.
> Respuesta:

### D10 🟡 ¿Formas de pago corporativas? (transferencia, crédito a 30/60 días, leasing, contra entrega)
> Respuesta:

### D11 🟢 ¿Hay clientes corporativos actuales que deban migrarse con acceso ya aprobado?
> Respuesta:

### WhatsApp (Módulo 10)

### E1 🔴 ¿Número(s) oficiales de WhatsApp? El tema actual muestra dos: `+57 316 482 0543` y `+57 324 519 5830`. ¿Cuál es Brenson?
> Respuesta:

### E2 🔴 ¿Un número con menú o números distintos por canal? (ventas B2C, ventas B2B, servicio técnico, garantías)
- Default: un número por canal si existen; si no, uno solo con mensajes precargados distintos.
> Respuesta:

### E3 🟡 ¿Usan WhatsApp Business App o WhatsApp Business API (vía GoHighLevel/ChatThunder u otro proveedor)?
- Por qué: API permite respuestas automáticas y plantillas; App solo permite el enlace `wa.me`.
> Respuesta:

### E4 🟡 ¿Horario de atención? (días, horas, zona horaria). ¿Mensaje fuera de horario?
> Respuesta:

### Apps y herramientas

### F1 🔴 ¿Autorizan desinstalar Ryviu, A2Reviews, AliExpress Reviews, GemPages, Quantity Offers (EDrop), AddZap y el módulo de notificaciones de compra?
- Por qué: siguen inyectando scripts aunque cambie el tema.
- Default: sí, desinstalar en Fase 5 tras verificar que ninguna tiene datos que rescatar.
> Respuesta:

### F2 🟡 ¿Tienen reseñas reales en alguna app actual que deban migrarse? ¿Aceptan Junip como app única de reviews o prefieren otra (Judge.me, Loox)?
- Default: Junip. Migrar solo reseñas verificadas.
> Respuesta:

### F3 🟡 Lista completa de apps instaladas hoy (exportar desde Admin → Apps). ¿Cuáles consideran imprescindibles?
> Respuesta:

### F4 🟢 ¿Usan MercadoPago como pasarela? El tema inyecta su script en colecciones. ¿Qué pasarelas están activas? (Wompi, PayU, Addi, Mercado Pago, Shopify Payments)
> Respuesta:

---

## SPRINT 2 — Fundaciones, homepage y catálogo (Semanas 3–4)

### G1 🔴 Estructura del menú principal: ¿qué ítems y en qué orden? (propuesta: Vehículos ▸ categorías · Financiación · Empresas · Garantía · Blog · Contacto)
> Respuesta:

### G2 🔴 ¿Qué va en el hero? (video del vehículo estrella, imagen, carrusel de 3 slides, mensaje principal, CTA)
- Default: 1 video corto en loop + titular + buscador por categoría + CTA WhatsApp. Sin carrusel.
> Respuesta:

### G3 🟡 Orden de secciones del homepage. Propuesta: Hero → Categorías → Barra de confianza → Destacados → Banner financiación → Casos de uso → Testimonios → Aliados → Contadores → CTA Empresas → Blog → Newsletter.
> Respuesta:

### G4 🟡 ¿Qué productos son "destacados" o "más vendidos" para el home? ¿Se eligen a mano o por ventas?
- Default: colección manual "destacados" editable por Brenson.
> Respuesta:

### G5 🟡 Barra de anuncios: ¿mensaje inicial? (envíos, financiación, promoción)
> Respuesta:

### G6 🟡 Footer: datos fiscales completos (razón social, NIT, dirección, ciudad, correo, teléfono), redes sociales activas (Instagram con 67 k, TikTok, Facebook, YouTube), políticas (privacidad, garantía, envíos, devoluciones, términos, PQRS, retracto).
> Respuesta:

### G7 🟡 Card de producto en catálogo: ¿qué 2 o 3 specs mostrar debajo del nombre? (propuesta: autonomía, velocidad, carga) ¿Mostrar "desde $X/mes"?
> Respuesta:

### G8 🟡 Facetas: ¿confirman estas? Categoría · Uso · Precio · Autonomía · Velocidad · Capacidad de carga · Financiable · Requiere licencia · Disponibilidad. ¿Alguna otra (marca, color, pasajeros)?
> Respuesta:

### G9 🟡 ¿Rangos para los sliders? (autonomía 0–200 km, velocidad 0–80 km/h, carga 0–1000 kg). Se calculan de los datos reales si no responden.
> Respuesta:

### G10 🟢 Ordenamientos: precio ↑↓, más vendidos, novedades, nombre. ¿Alguno más (autonomía, cuota mensual)?
> Respuesta:

### G11 🟢 ¿Vista rápida abre modal con specs + CTA, o solo galería + precio?
- Default: galería, precio, 3 specs, cuota desde, CTA ver ficha y WhatsApp.
> Respuesta:

### G12 🟢 Badges de catálogo: "Más vendido", "Nuevo", "Financiación", "Flota". ¿Cuáles y quién los asigna? (metafield manual)
> Respuesta:

---

## SPRINT 3 — Ficha de vehículo, simulador, confianza, WhatsApp (Semanas 5–6)

### H1 🔴 Orden de bloques de la ficha. Propuesta: Galería + título + precio contado/financiado + CTAs → Simulador → Certificación Brenson → Specs → Garantía → Envíos → FAQ → Casos de uso → Relacionados → Reseñas.
> Respuesta:

### H2 🔴 Mensaje precargado de WhatsApp desde la ficha. Ejemplo: "Hola Brenson, me interesa el {modelo}. ¿Me dan más información?" ¿Incluir precio y cuota simulada?
> Respuesta:

### H3 🟡 ¿El simulador va arriba (visible sin scroll, como dice la propuesta) o después de specs? ¿Versión compacta arriba + completa abajo?
- Default: compacto junto al precio ("Desde $X/mes · simular") que expande el simulador completo.
> Respuesta:

### H4 🟡 Formulario "Solicitar cotización" desde ficha: ¿qué campos? (nombre, teléfono, correo, ciudad, uso previsto, cantidad, mensaje)
- Default: nombre, WhatsApp, ciudad, uso, cantidad. Vehículo precargado oculto.
> Respuesta:

### H5 🟡 FAQ genéricas por categoría: ¿tienen preguntas frecuentes reales de clientes? (licencia, SOAT, matrícula, dónde cargar, repuestos, servicio técnico en mi ciudad)
> Respuesta:

### H6 🟡 ¿Mostrar precio con o sin IVA? ¿Precio tachado/descuento en algún caso?
> Respuesta:

### H7 🟡 ¿Compra directa en línea para B2C (agregar al carrito y pagar) o solo cotización/WhatsApp para vehículos y compra en línea solo para accesorios?
- Por qué: define si el CTA principal es "Comprar" o "Hablar con asesor".
> Respuesta:

### H8 🟢 Galería: ¿zoom, vista 360, video de YouTube o archivo propio?
> Respuesta:

### H9 🟢 Sticky bar mobile: ¿precio + cuota + WhatsApp, o precio + comprar?
> Respuesta:

### H10 🟢 ¿Servicio técnico y repuestos: hay página o sección propia? ¿Red de talleres aliados por ciudad?
> Respuesta:

---

## SPRINT 4 — Cuentas, portal B2B (UI), captación de leads (Semanas 7–8)

### I1 🔴 URL del portal: `/pages/corporativo` (propuesta) o `/pages/empresas`? Nombre público del programa ("Brenson Empresas", "Brenson Flotas")
> Respuesta:

### I2 🔴 Estados del acceso y qué ve cada uno:
- Sin sesión → landing "Brenson Empresas" con beneficios + botón solicitar acceso + login.
- Registrado pendiente → mensaje "estamos validando tu empresa" + asesor.
- Aprobado → dashboard.
- Rechazado/suspendido → mensaje + contacto.
¿De acuerdo? ¿Textos?
> Respuesta:

### I3 🟡 Dashboard B2B: ¿qué widgets? (asesor asignado, tier y descuento, última cotización, pedidos, garantías por unidad, acceso rápido a cotizador y catálogo)
> Respuesta:

### I4 🟡 Cotizador de flota: ¿selección por producto con cantidad, o por "paquetes" predefinidos? ¿Permitir agregar observaciones? ¿Elegir asesor?
> Respuesta:

### I5 🟡 Garantías por unidad en cuenta de cliente: ¿tienen número de serie/chasis por vehículo vendido? ¿Cómo registran hoy la garantía?
- Por qué: define si la garantía se asocia al line item del pedido o a un metaobject por unidad.
> Respuesta:

### I6 🟡 Prueba de manejo: ¿dónde se realiza? (sede, domicilio, ciudades). ¿Días y horarios? ¿Requiere licencia?
> Respuesta:

### I7 🟡 Exit intent: ¿ofrecer ficha técnica PDF, descuento, o "te llamamos"? ¿En qué páginas? ¿Frecuencia por visitante?
- Default: ficha PDF en fichas de producto, una vez cada 7 días por visitante.
> Respuesta:

### I8 🟢 ¿Registro B2C también con campos extra (ciudad, tipo de uso) para segmentar en Klaviyo?
> Respuesta:

### I9 🟢 Facturas descargables: ¿emiten factura electrónica DIAN desde Shopify (app) o desde otro sistema? ¿Se puede enlazar el PDF?
> Respuesta:

---

## SPRINT 5 — Backend, lógica B2B, integraciones (Semanas 9–10)

### J1 🔴 Acceso a GoHighLevel: ¿sub-cuenta de Brenson en ChatThunder? ¿Quién crea la API key/webhook y los campos personalizados?
> Respuesta:

### J2 🔴 Pipeline GHL: ¿confirman etapas Nuevo → Contactado → Demo → Cotización → Cerrado/Perdido? ¿Un pipeline para B2C y otro para B2B?
- Default: dos pipelines.
> Respuesta:

### J3 🔴 Scoring: ¿confirman puntajes +10 ficha, +20 simulador, +30 cotización/prueba, +40 acceso B2B, +50 PDF flota, y alerta > 60?
> Respuesta:

### J4 🔴 Seguimiento automático: ¿WhatsApp 2 h, email 24 h, llamada 48 h? ¿Quién recibe la tarea de llamada? ¿Textos de los mensajes?
> Respuesta:

### J5 🟡 Hosting de `brenson-services`: ¿Cloudflare Workers (recomendado, gratis hasta 100 k req/día) o Vercel? ¿Cuenta a nombre de Brenson?
> Respuesta:

### J6 🟡 Email transaccional para cotizaciones: ¿Resend, SendGrid, o el SMTP de Google Workspace de Brenson? ¿Dominio para remitente (cotizaciones@brenson.co)?
> Respuesta:

### J7 🟡 PDFMonkey: ¿cuenta a nombre de Brenson? ¿Volumen estimado de cotizaciones al mes? (define plan)
> Respuesta:

### J8 🟡 ¿Qué eventos de Shopify deben llegar a GHL? (cliente creado, cliente B2B aprobado, checkout abandonado, pedido creado, pedido entregado)
- Default: los cinco.
> Respuesta:

### J9 🟡 Anti-spam: ¿aceptan Cloudflare Turnstile (gratuito, sin captcha visible) en formularios?
> Respuesta:

### J10 🟢 ¿Quién administra los secretos (API keys) y dónde se documentan? (1Password, Bitwarden, vault de Cloudflare)
> Respuesta:

---

## SPRINT 6 — Analytics, remarketing, email, reviews (Semanas 11–12)

### K1 🔴 Accesos: ¿existen ya cuentas de GA4, GTM, Meta Business Manager, Pixel, Klaviyo, Google Search Console? ¿Quién es admin? ¿Están a nombre de Brenson?
> Respuesta:

### K2 🔴 Consentimiento (Ley 1581): ¿tienen política de tratamiento de datos publicada? ¿Aviso de privacidad? ¿Autorizan banner con Consent Mode v2 (bloquea Meta/GA hasta aceptar)?
> Respuesta:

### K3 🟡 ¿Qué KPIs quieren en Looker Studio? (leads por fuente, uso de simulador, clics WhatsApp, cotizaciones B2B, conversión por categoría, CAC por canal)
> Respuesta:

### K4 🟡 Klaviyo: ¿flows confirmados? (bienvenida B2C, bienvenida B2B, carrito abandonado, post-compra, lead frío 7 días). ¿Quién escribe los correos? ¿Diseño de plantilla?
> Respuesta:

### K5 🟡 Meta: ¿corren pauta hoy? ¿Con qué agencia? ¿Catálogo dinámico ya conectado? ¿Eventos que hoy usan para optimizar?
> Respuesta:

### K6 🟡 ¿Coordinación GHL ↔ Klaviyo para no enviar doble mensaje al mismo lead? ¿Cuál es el sistema maestro de contactos?
- Default: GHL maestro para leads; Klaviyo para email marketing masivo; sincronía por tag.
> Respuesta:

### K7 🟢 Reviews: ¿solicitar reseña automáticamente X días después de la entrega? ¿Incentivo?
> Respuesta:

---

## SPRINT 7 — SEO, performance, contenido (Semanas 13–14)

### L1 🔴 ¿Quién produce los 5–8 artículos del blog? (Brenson, Enlaces Digitales, redactor externo). ¿Temas prioritarios? (motocarro eléctrico Colombia, licencia ciclomotor, cuánto cuesta cargar, mantenimiento, normativa)
> Respuesta:

### L2 🟡 Palabras clave objetivo por categoría. ¿Tienen estudio de keywords o lo hace el especialista SEO?
> Respuesta:

### L3 🟡 ¿Hay posicionamiento actual que proteger? (páginas que reciben tráfico orgánico hoy, según GSC)
> Respuesta:

### L4 🟡 Dispositivos de prueba: ¿pueden facilitar 2 Android de gama media reales o se prueban en laboratorio de Enlaces Digitales?
> Respuesta:

### L5 🟢 ¿Dominio brenson.co se mantiene? ¿Subdominios (empresas.brenson.co) o todo bajo /pages?
- Default: todo bajo brenson.co.
> Respuesta:

### L6 🟢 ¿Idiomas adicionales? (inglés para turismo/Parque Tayrona)
- Default: solo español.
> Respuesta:

---

## SPRINT 8 — QA, capacitación y lanzamiento (Semanas 15–16)

### M1 🔴 Fecha objetivo de lanzamiento y ventana permitida (día/hora de menor tráfico). ¿Hay campañas o temporadas que evitar?
> Respuesta:

### M2 🔴 ¿Quién da la aprobación final (go/no-go)? ¿Criterios de aceptación adicionales a los del plan?
> Respuesta:

### M3 🟡 ¿Quiénes del equipo Brenson reciben capacitación y en qué roles? (admin de tema, catálogo/metafields, aprobación B2B, ventas/GHL, contenido/blog)
> Respuesta:

### M4 🟡 Formato de capacitación: ¿presencial en Barranquilla, remota, videos grabados, o combinación?
> Respuesta:

### M5 🟡 Soporte post-lanzamiento: ¿alcance y duración del acompañamiento después de los 7 días de monitoreo? ¿SLA de respuesta?
> Respuesta:

### M6 🟢 ¿Clientes o aliados que puedan participar en una prueba beta del portal B2B antes del lanzamiento público?
> Respuesta:

### M7 🟢 Monitoreo: ¿aceptan Sentry (plan gratuito) para errores JS y alertas por correo/Slack/WhatsApp? ¿A quién llegan?
> Respuesta:

---

## Resumen de preguntas bloqueantes (🔴) por orden de urgencia

| # | Pregunta | Sprint que bloquea |
|---|---|---|
| A1, A3, A4 | Aprobar Dawn, ajustes técnicos y alcance | Todos |
| A2 | Cuentas clásicas vs nuevas | 4 |
| B5, B6, B7, B8 | Categorías, cantidad de productos, specs, fotos | 2, 3 |
| B13, B14, B15 | Datos reales de contadores, certificación, garantía | 2, 3 |
| C1, C2, C3, C4 | Modelo de financiación, tasa, plazos, disclaimer | 3 |
| D1, D2, D3, D4, D5 | Tiers, descuento, aprobación, registro, compra B2B | 4, 5 |
| E1, E2 | Números de WhatsApp | 3 |
| F1 | Autorizar eliminar apps | 1, 7 |
| G1, G2 | Menú y hero | 2 |
| H1, H2 | Orden de la ficha y mensaje WhatsApp | 3 |
| I1, I2 | URL y estados del portal | 4 |
| J1, J2, J3, J4 | Acceso y configuración GHL | 5 |
| K1, K2 | Accesos analytics y política de datos | 6 |
| L1 | Autoría del blog | 7 |
| M1, M2 | Fecha de lanzamiento y aprobador | 8 |

Con las respuestas 🔴 del Sprint 0 y Sprint 1 se puede arrancar. El resto se recoge en la reunión de planificación de cada sprint.
