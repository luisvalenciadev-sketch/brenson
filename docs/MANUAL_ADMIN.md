# Manual del equipo Brenson — Administración del ecosistema

Borrador para la capacitación por roles (decisión M3). Cada sección corresponde a una tarea frecuente; en Fase 6 se graban los videos.

## 1. Editar el sitio (rol: contenido)

- **Textos e imágenes del home**: Tienda online → Temas → Personalizar. Cada sección "Brenson · …" tiene sus campos. El orden de secciones se arrastra en el panel izquierdo.
- **Hero**: cargar el video (10 a 20 s, sin audio) en la sección Brenson · Hero. Si no hay video, se usa la imagen.
- **Destacados**: los productos del bloque "Más vendidos" vienen de la colección `destacados`. Agregar o quitar productos en Productos → Colecciones → Destacados.
- **Barra de anuncios, footer, menú**: secciones estándar de Dawn y Navegación → Menús.

## 2. Ajustes globales Brenson (rol: admin)

Personalizar → Configuración del tema (icono de engranaje):

| Grupo | Qué controla |
|---|---|
| Brenson · Contacto y WhatsApp | Número oficial, textos de los botones, mensajes por página, horario |
| Brenson · Confianza y envíos | Activar/desactivar el sello certificado, meses de garantía, tiempos por región, sede y ciudades de prueba |
| Brenson · Empresas (B2B) | Tags de acceso, nombre del portal, colección corporativa, validez de cotización, URL del backend |
| Brenson · Desarrollo | **Modo simulación** (apagar antes del lanzamiento) y ID de Google Tag Manager |

## 3. Productos y fichas (rol: catálogo)

Productos → abrir el vehículo → panel **Metafields** (todos empiezan por "brenson"):

- Specs: autonomía, velocidad, carga, potencia, batería, tiempo de carga, peso, pasajeros, licencia, SOAT.
- Especificaciones adicionales: JSON de filas `[{"label":"Frenos","value":"Disco"}]`.
- Garantía: meses vehículo y batería; términos en texto enriquecido.
- Certificado Brenson: casilla; badge de catálogo (Más vendido / Nuevo / Financiación / Flota).
- Financiable: casilla. Si se desmarca, la ficha no muestra simulador.
- Empresas: disponible para B2B, mínimo de unidades, exclusivo flota, descuento por tier (JSON opcional).
- Ficha técnica PDF y video (URL de YouTube).

Las colecciones por categoría son automáticas: basta fijar el metafield **Categoría**.

## 4. Financiación (rol: admin)

Contenido → Metaobjects → **Parámetros de financiación** (entrada única): tasa mensual, plazos, cuotas iniciales, aliado, disclaimer y costos no incluidos. Cambiar aquí actualiza todas las fichas, cards y el simulador al instante.

## 5. Confianza (rol: contenido)

Contenido → Metaobjects:

- **Certificación**: checklist de puntos de inspección.
- **Testimonio / Aliado / Contador / Caso de uso**: marcar **Autorización verificada** solo cuando exista permiso escrito o dato comprobable. En producción, lo no verificado no se muestra.
- **Pregunta frecuente**: pregunta, respuesta y categoría.
- **Asesor**: nombre, cargo, canal, WhatsApp, correo, horario, foto.

## 6. Aprobar una empresa (rol: Empresas) — compromiso 24 h hábiles

1. Llega el correo "Solicitud B2B" (Flow 1) o se revisa Clientes → filtro tag `b2b-pendiente`.
2. Abrir el cliente. En **Nota** están razón social, NIT, sector, ciudad, flota y cargo. En metafields `brenson_b2b` puede estar el enlace al documento.
3. Verificar NIT en RUES y el documento adjunto.
4. En metafields del cliente: asignar **Tier B2B** y **Asesor asignado**. Completar razón social y NIT si la nota no se copió.
5. **Agregar el tag `cliente-corporativo`**. Flow 2 quita el tag pendiente, marca aprobado y envía la bienvenida.
6. Para rechazar: agregar tag `b2b-rechazado` (Flow 3).
7. Para migrar clientes existentes (decisión D11): mismo procedimiento o `npm run import:mocks -- --only=clientes` con el JSON real.

## 7. Cotizaciones B2B (rol: Empresas)

Contenido → Metaobjects → **Cotización B2B**: cada cotización generada por el portal aparece con número, cliente, ítems, total, estado y enlace al PDF. Cambiar **Estado** a aceptada, vencida o rechazada según el cierre. Para cotizar en nombre del cliente, iniciar sesión con su cuenta o usar el cotizador y enviar el PDF.

## 8. Registrar unidades vendidas (rol: servicio)

Al entregar un vehículo: Contenido → Metaobjects → **Unidad vendida** → Agregar: número de serie, producto, cliente, pedido, fecha de entrega, fin de garantía vehículo y batería, estado activa. El cliente la ve en su cuenta y, si es empresa, en el dashboard. Al abrir un reclamo, cambiar el estado a "en reclamo".

## 9. Leads y CRM (rol: ventas)

Cada formulario, simulación y clic en WhatsApp queda registrado. Con GoHighLevel activo, los leads entran al pipeline con su puntaje (10 ficha, 20 simulador, 30 cotización o prueba, 40 acceso B2B, 50 PDF de flota). Score mayor a 60 exige contacto el mismo día. Sin GHL, los leads llegan por correo y quedan como clientes en Shopify con tags.

## 10. Antes de lanzar (rol: admin + agencia)

1. Reemplazar todos los datos `[MOCK]`, `[BORRADOR]` y `[VALIDAR]` (`npm run check:mocks:strict` debe pasar).
2. Apagar **Modo simulación**.
3. Confirmar que la política de privacidad, términos y garantía están publicadas.
4. Verificar la lista de la matriz de QA.
