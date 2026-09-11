# REGISTRO DE DECISIONES — BRENSON S.A.S.

Respuestas al `CUESTIONARIO_SPRINTS_BRENSON.md`, sesión del 11 de septiembre de 2026.
Estado: ✅ decidido · ⏳ pendiente de verificar o entregar · ⚠️ genera cambio o riesgo en el plan.

---

## Sprint 0 — Arquitectura

| # | Decisión | Estado |
|---|---|---|
| A1 | Rehacer el tema sobre **Dawn**. EDrop queda como respaldo no publicado y se elimina a los 90 días. | ✅ |
| A2 | Tipo de cuentas de cliente (clásicas/nuevas): **verificar en Sprint 1**. Si son nuevas, cambiar a clásicas antes del Sprint 4. | ⏳ |
| A3 | Aceptados los dos ajustes: facetas nativas + Section Rendering API; B2B con cuentas clásicas + tags + Shopify Function sin Plus. | ✅ |
| A4 | Alcance: **versión completa, 16 semanas**, Sprints 1 a 8. | ✅ |
| A5 | Plan de Shopify: **verificar en Sprint 1**. | ⏳ |
| A6 | Acceso dev: colaborador con todos los permisos excepto facturación. | ✅ |
| A7 | Entorno: temas no publicados (Staging y Live) en la tienda real + Shopify CLI. | ✅ |
| A8 | Código en **GitHub de Brenson**, Enlaces Digitales como colaborador. Brenson debe crear la organización. | ✅ ⏳ |

## Sprint 1 — Marca, catálogo, confianza, financiación, B2B, WhatsApp, apps

### Marca y diseño
| # | Decisión | Estado |
|---|---|---|
| B1 | Existe manual de marca completo. Brenson lo entrega en Sprint 1. | ⏳ entrega |
| B2 | **El diseño UI/UX lo produce el desarrollador con Stitch** (no hay diseñador Figma). Se generan las 7 pantallas clave y se aprueban antes de codificar. | ✅ ⚠️ cambia plan |
| B3 | Tono **mixto**: "tú" en B2C, "usted" en B2B. | ✅ |
| B4 | Referencia visual única: Kavak. | ✅ |

### Catálogo y contenido
| # | Decisión | Estado |
|---|---|---|
| B5 | Categorías: bicicletas eléctricas, ciclomotores/motos, motocarros, cuadriciclos. **Sin accesorios ni repuestos.** Se elimina `product.accesorio.json`. | ✅ |
| B6 | Menos de 20 productos activos. Carga de metafields manual o por CSV simple. | ✅ |
| B7 | **Specs no documentadas.** Enlaces Digitales entrega plantilla Excel en semana 1; Brenson devuelve 80 % antes de semana 5 (inicio Sprint 3). | ⚠️ riesgo |
| B8 | **Hay que producir todo el material foto/video.** Sesión de producción en semanas 1 a 4. Bloquea la ficha (Sprint 3) y el hero. | ⚠️ riesgo |
| B9 | Fichas técnicas PDF se generan automáticamente desde metafields (PDFMonkey, Fase 3). | ✅ |
| B10 | Variantes mixtas según modelo; algunas cambian precio. Simulador y tier reaccionan a la variante. | ✅ |
| B11 | Inventario real en Shopify. | ✅ |
| B12 | URLs actuales pueden cambiar; sin campañas ni SEO relevante. Redirecciones 301 mínimas. | ✅ |

### Confianza
| # | Decisión | Estado |
|---|---|---|
| B13 | Contadores con datos reales de: vehículos vendidos, clientes/empresas, años de operación, ciudades con entregas. Brenson entrega cifras. | ⏳ entrega |
| B14 | **La Certificación Brenson no existe: hay que diseñarla** (proceso de inspección de 10 a 15 puntos). Workshop en Sprint 1. El badge no se publica hasta tener el proceso real. | ⚠️ |
| B15 | Garantía definida verbalmente. Brenson entrega meses por componente en Sprint 1; texto legal por su abogado antes del Sprint 3. | ⏳ ⚠️ |
| B16 | Autorización de logos: Parque Tayrona, Comfandi, IsaMotos y demás mencionados. | ✅ |
| B17 | Existen testimonios reales con autorización. Se cargan como metaobjects verificados. | ✅ ⏳ entrega |
| B18 | Envíos a toda Colombia, costo cotizado según destino. Tiempos por región: Brenson los envía. | ✅ ⏳ entrega |

### Financiación (Módulo 05)
| # | Decisión | Estado |
|---|---|---|
| C1 | Financia un **aliado financiero** externo. Simulador informativo. | ✅ ⏳ nombre del aliado |
| C2 | Tasa única mensual, editable desde Admin. Brenson entrega el valor. | ⏳ valor |
| C3 | Plazos 12/24/36/48 meses; iniciales 0/10/20/30 %. | ✅ |
| C4 | Disclaimer estándar, revisado por abogado de Brenson. | ✅ |
| C5 | Mencionar costos no incluidos: matrícula/trámites, SOAT, estudio de crédito/seguro. | ✅ |
| C6 | CTA "Solicitar financiamiento" → lead a asesor con vehículo, plazo, inicial y cuota (+20 pts GHL). | ✅ |
| C7 | Simulador visible según metafield `financiable` por producto. | ✅ |
| C8 | Precio: **cuota mensual protagonista**, precio contado debajo. | ✅ |

### B2B (Módulos 07 y 08)
| # | Decisión | Estado |
|---|---|---|
| D1 | 3 tiers: 10+, 20+, 50+ unidades. | ✅ |
| D2 | Porcentaje de descuento por tier sobre precio público, con override por producto. **Brenson entrega los %**. | ✅ ⏳ valores |
| D3 | Aprobación manual en Shopify Admin, compromiso 24 h hábiles. | ✅ |
| D4 | Registro B2B: NIT + razón social + contacto y cargo + sector y ciudad + flota estimada + **adjunto cámara de comercio o RUT**. | ✅ ⚠️ cambia plan |
| D5 | Cliente B2B puede cotizar en PDF **y** comprar en checkout con descuento. | ✅ |
| D6 | Catálogo B2B: productos públicos con descuento + modelos exclusivos de flota (`b2b_disponible`). | ✅ |
| D7 | Plantilla de cotización PDF se diseña desde cero. | ✅ |
| D8 | Validez de cotización: 15 días, configurable. | ✅ |
| D9 | Asesor B2B asignado manualmente al aprobar. | ✅ |
| D10 | Formas de pago en cotización: transferencia/PSE, crédito 30/60 días, leasing/renting con aliado, tarjeta en checkout. | ✅ |
| D11 | Hay clientes corporativos actuales a migrar. Brenson envía lista con NIT y tier. | ⏳ entrega |

### WhatsApp (Módulo 10)
| # | Decisión | Estado |
|---|---|---|
| E1 | Número oficial: **+57 316 482 0543**. El +57 324 519 5830 y el correo VMFULLSTORE se eliminan. | ✅ |
| E2 | Un solo número con mensajes precargados distintos por contexto (B2C, B2B, servicio, garantía). | ✅ |
| E3 | Herramienta de WhatsApp (App vs API): **verificar en Sprint 1**. Define si hay respuestas automáticas. | ⏳ |
| E4 | Horario: lunes a viernes 8:00 a 18:00, sábado 9:00 a 13:00. | ✅ |

### Apps y pagos
| # | Decisión | Estado |
|---|---|---|
| F1 | Desinstalación de apps residuales: **revisar con Brenson en Sprint 1** con la lista completa. | ⏳ |
| F2 | App de reviews: **Junip**, sin migración de reseñas. | ✅ |
| F3 | El equipo dev levanta la lista de apps con su acceso en Sprint 1. | ✅ |
| F4 | Pasarelas: verificar en Sprint 1. | ⏳ |

## Sprint 2 — Homepage y catálogo
| # | Decisión | Estado |
|---|---|---|
| G1 | Menú: Vehículos (4 categorías) · Financiación · Empresas · Garantía · Blog · Contacto. | ✅ |
| G2 | Hero: video en loop + titular + buscador por categoría + CTA. Depende de producción de video (B8). | ✅ ⚠️ |
| G3 | Orden del home aprobado: Hero → Categorías → Confianza → Destacados → Financiación → Casos → Testimonios → Aliados → Contadores → CTA Empresas → Blog → Newsletter. | ✅ |
| G4 | Destacados: colección manual editable por Brenson. | ✅ |
| G5 | Barra de anuncios: "Financia tu vehículo eléctrico desde $X/mes". | ✅ |
| G6 | Políticas existentes: privacidad (Ley 1581), términos y condiciones, garantía/devoluciones/retracto. Brenson entrega textos. | ✅ ⏳ entrega |
| G7 | Card: autonomía + velocidad + carga + "desde $X/mes". | ✅ |
| G8 | Facetas confirmadas: categoría, uso, precio, autonomía, velocidad, carga, financiable, requiere licencia, disponibilidad. | ✅ |
| G9–G12 | Rangos desde datos reales · orden por precio, más vendidos, novedades, cuota · vista rápida completa · badges asignados por Brenson. | ✅ |

## Sprint 3 — Ficha, simulador, WhatsApp
| # | Decisión | Estado |
|---|---|---|
| H1 | Orden de ficha aprobado: Galería/precio/CTAs → Simulador → Certificación → Specs → Garantía → Envíos → FAQ → Casos → Relacionados → Reseñas. | ✅ |
| H2 | Mensaje WhatsApp: "Hola Brenson, me interesa el {modelo}. ¿Me dan más información?" | ✅ |
| H3 | Simulador compacto junto al precio que expande el completo. | ✅ |
| H4 | Formulario cotización: nombre, WhatsApp, ciudad, uso, cantidad; vehículo oculto precargado. | ✅ |
| H5 | FAQ: Enlaces Digitales redacta 8 a 10 base; Brenson valida. | ✅ |
| H6 | Precio con IVA incluido, sin precios tachados. | ✅ |
| H7 | CTA principal **WhatsApp/cotización**; comprar en línea secundario. | ✅ |
| H8–H10 | Galería con zoom y YouTube · sticky bar mobile (cuota + precio + WhatsApp) · página de servicio técnico con formulario. | ✅ |

## Sprint 4 — Portal B2B, cuentas, leads
| # | Decisión | Estado |
|---|---|---|
| I1 | URL **/pages/empresas**, nombre "Brenson Empresas". | ✅ ⚠️ cambia plan |
| I2 | Cuatro estados de acceso aprobados (sin sesión, pendiente, aprobado, rechazado/suspendido). | ✅ |
| I3 | Dashboard B2B: asesor + tier · última cotización + cotizador · pedidos y garantías por unidad · documentos descargables. | ✅ |
| I4 | Cotizador: selección por producto con cantidad + observaciones. | ✅ |
| I5 | Garantías registradas **por número de serie/chasis**. Se modela metaobject `brenson_unidad`. | ✅ ⚠️ cambia plan |
| I6 | Prueba de manejo: en sede **y** a domicilio; el usuario elige modalidad. Brenson entrega dirección de sede y ciudades cubiertas. | ✅ ⏳ |
| I7 | Exit intent: ficha técnica PDF en fichas, 1 vez cada 7 días. | ✅ |
| I8–I9 | Registro B2C con ciudad y uso · facturas desde app de facturación electrónica de Shopify (verificar cuál). | ✅ ⏳ |

## Sprint 5 — Backend, GHL, infraestructura
| # | Decisión | Estado |
|---|---|---|
| J1 | **GoHighLevel no está activo o no se sabe.** Verificar en Sprint 1. Si no existe, bloquea Módulos 09, 11 y 16. | ⚠️ riesgo |
| J2 | Dos pipelines (B2C y B2B): Nuevo → Contactado → Demo → Cotización → Cerrado/Perdido. | ✅ |
| J3 | Scoring confirmado: +10/+20/+30/+40/+50, alerta > 60. | ✅ |
| J4 | Seguimiento: WhatsApp 2 h → email 24 h → tarea llamada 48 h. | ✅ |
| J5 | Backend en **Cloudflare Workers**, cuenta de Brenson. | ✅ ⏳ crear cuenta |
| J6 | Email transaccional **Resend** con dominio brenson.co (requiere DNS). | ✅ ⏳ DNS |
| J7 | Menos de 50 cotizaciones/mes: PDFMonkey plan gratuito/básico. | ✅ |
| J8–J10 | Eventos a GHL (5) · Cloudflare Turnstile · secretos en vault del proveedor + gestor de contraseñas de Brenson. | ✅ |

## Sprint 6 — Analytics, email, remarketing
| # | Decisión | Estado |
|---|---|---|
| K1 | Existen GA4 + GTM y Search Console. **No existen Meta Business Manager propio ni Klaviyo**: se crean en Sprint 6 (Meta se coordina con la agencia de pauta). | ✅ ⏳ |
| K2 | Banner de consentimiento con **Consent Mode v2, bloqueo estricto** hasta aceptar. | ✅ |
| K3 | KPIs Looker: leads por fuente/asesor · simulador y WhatsApp · cotizaciones y accesos B2B · ventas por categoría. | ✅ |
| K4 | 5 flows de Klaviyo; textos los redacta Enlaces Digitales y Brenson valida. | ✅ |
| K5 | Pauta en Meta con **agencia externa**. Coordinar Pixel, CAPI y catálogo con ella. | ✅ ⏳ contacto |
| K6 | GHL maestro de leads; Klaviyo solo email masivo; sincronía por tag. | ✅ |
| K7 | Solicitud de reseña automática 14 días tras entrega, sin incentivo. | ✅ |

## Sprint 7 — SEO, performance, contenido
| # | Decisión | Estado |
|---|---|---|
| L1 | Blog: Enlaces Digitales redacta 5 a 8 artículos; Brenson valida. | ✅ |
| L2 | Estudio de keywords lo hace el especialista SEO en Sprint 7. | ✅ |
| L3 | Tráfico orgánico actual: revisar en GSC en Sprint 1. | ⏳ |
| L4 | Performance: solo emulación en Chrome DevTools. **Recomendación no aceptada** de dispositivos reales; se documenta como limitación. | ✅ ⚠️ |
| L5–L6 | **brenson.co + inglés para turismo.** Añade Translate & Adapt + Shopify Markets y traducción de contenido. | ✅ ⚠️ cambia plan |

## Sprint 8 — QA y lanzamiento
| # | Decisión | Estado |
|---|---|---|
| M1 | Lanzamiento al cierre de las 16 semanas, entre semana, en madrugada. | ✅ |
| M2 | Go/no-go conjunto Brenson + Enlaces Digitales con checklist. | ✅ |
| M3–M4 | Capacitación por roles, remota + videos grabados. | ✅ |
| M5–M7 | Soporte 30 días con SLA 24 h hábiles · beta B2B con 2 o 3 clientes actuales · Sentry gratuito con alertas por correo. | ✅ |

---

## Impactos en el plan (⚠️)

| Origen | Cambio en `PLAN_DE_TRABAJO_BRENSON.md` |
|---|---|
| B2 | Tarea 1.8/1.9: se reemplaza "Figma por diseñador UI/UX" por "pantallas generadas con Stitch por el dev, aprobadas por Brenson". El perfil Diseñador UI/UX de la propuesta se reduce a validación. |
| B5 | Se elimina `templates/product.accesorio.json`. |
| B7, B8 | Riesgo crítico de contenido: producción foto/video y levantamiento de specs se agregan como tareas 1.14 y 1.15 con fecha límite semana 5. Si no llegan, el Sprint 3 se reordena para hacer primero portal B2B (UI). |
| B14 | Nueva tarea 1.16: workshop para diseñar el proceso de Certificación Brenson. El badge se publica solo cuando el proceso esté operando. |
| D4 | El registro B2B requiere **subida de archivo**. Shopify no permite adjuntos en `customer_register`: se agrega endpoint `POST /upload` en `brenson-services` con almacenamiento en Cloudflare R2 y enlace guardado en metafield `brenson_b2b.documento_url`. |
| I1 | Todas las rutas `/pages/corporativo` pasan a `/pages/empresas`; archivos `page.empresas.json`, `page.empresas-acceso.json`, `collection.empresas.json`, `layout/theme.empresas.liquid`. El tag `cliente-corporativo` se mantiene. |
| I5 | Nuevo metaobject `brenson_unidad` (serie/chasis, producto, pedido, cliente, fecha entrega, fin garantía, estado). Dashboard B2C y B2B leen unidades del cliente. |
| J1 | Riesgo alto: GHL no confirmado. Si en Sprint 1 no existe, `brenson-services` envía leads por email + Shopify Customers con tags como fallback hasta activar GHL. |
| L4 | Se documenta la limitación de no probar en dispositivos reales. |
| L5–L6 | Nueva tarea en Fase 5: Shopify Markets (mercado internacional/en), Translate & Adapt, traducción de secciones y metafields clave al inglés, `hreflang`. Estimación: +1 semana de esfuerzo dentro del Sprint 7. |

## Entregables pendientes de Brenson (con fecha límite)

| Entregable | Límite | Bloquea |
|---|---|---|
| Manual de marca | Semana 1 | Diseño Stitch |
| Crear organización GitHub y cuenta Cloudflare | Semana 1 | Setup técnico |
| Acceso colaborador Admin | Semana 1 | Todo |
| Cifras de contadores, logos de aliados, testimonios | Semana 2 | Sprint 2 |
| Nombre del aliado financiero, tasa mensual | Semana 2 | Sprint 3 |
| Porcentajes de descuento por tier | Semana 2 | Sprint 4 y Function |
| Meses de garantía por componente | Semana 2 | Sprint 3 |
| Texto legal de garantía y disclaimer (abogado) | Semana 4 | Sprint 3 |
| Specs de los productos (plantilla Excel) al 80 % | Semana 5 | Sprint 3 |
| Fotos y video producidos | Semana 5 | Sprint 3 y hero |
| Tiempos de entrega por región | Semana 5 | Sprint 3 |
| Dirección de sede y ciudades de prueba de manejo | Semana 7 | Sprint 4 |
| Lista de clientes B2B a migrar (NIT, tier) | Semana 12 | Sprint 6 |
| Textos de políticas legales | Semana 10 | Sprint 6 |
| Contacto de la agencia de pauta Meta | Semana 9 | Sprint 6 |

## Verificaciones técnicas pendientes (equipo dev, Sprint 1)

1. Tipo de cuentas de cliente (A2).
2. Plan de Shopify (A5).
3. Herramienta de WhatsApp: App o API (E3).
4. Lista de apps instaladas y cuáles eliminar (F1, F3).
5. Pasarelas de pago activas (F4).
6. App de facturación electrónica (I9).
7. Estado de GoHighLevel / ChatThunder (J1).
8. Tráfico orgánico actual en Search Console (L3).
