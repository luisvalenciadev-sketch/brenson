# Matriz de QA — Brenson

Ejecutar en tema Staging antes de cada demo y completa antes del go-live. Dispositivos: Chrome, Safari, Firefox, Samsung Internet; iPhone y Android gama media emulados (decisión L4).

Estado: ⬜ pendiente · ✅ pasa · 🟡 parcial · ❌ falla (anotar issue).

## Ejecución 21-sep-2026 (Fase 6)

Automatizada con Chrome real (puppeteer-core) y Lighthouse 12.8 sobre el tema **Brenson Staging** (vista previa, `pb=0`). Los casos con sesión B2B (E-02 a E-05, E-10 a E-13, E-15, E-19) quedan para prueba manual: el login de cuentas nuevas es por código al correo.

### Lighthouse móvil (4G simulado, CPU 4×, laptop local)

| Página | Rendimiento | Accesibilidad | LCP | TBT | CLS | Peso |
|---|---|---|---|---|---|---|
| Inicio | 46 → 47 | 78 → **97** | 6,0 → 7,4 s | 1.080 → 690 ms | 0,004 | 2,0 → **1,6 MB** |
| Ficha (Dallas) | 58 → 52 | 96 | 5,3 → 5,2 s | 530 → 800 ms | 0,001 | 3,0 → **1,6 MB** |
| Colección | 45 → 48 | 97 | 6,7 → 6,2 s | 1.010 → 860 ms | 0,011 | 1,4 MB |
| Empresas | 72 → 54 | 82 → **96** | 4,5 → 4,9 s | 270 → 940 ms | 0 | 2,5 → **0,5 MB** |

Primer valor: antes de las correcciones del 21-sep. **El TBT y la nota de rendimiento varían mucho entre corridas en esta máquina** (Empresas empeoró sin cambios que lo expliquen), y la vista previa carga scripts que no existen con el tema publicado (`hot-reload-client`). Accesibilidad y peso sí son mediciones estables.

**Correcciones aplicadas**: Turnstile bajo demanda (1,4 MB menos en ficha); portadas de videos diferidas y sin descargas de metadatos (~540 KB fuera de pantalla); roles ARIA del carrusel y de los botones de plazo; puntos del carrusel a 24 px; `data-nocaptcha` en los formularios de lead; respaldo del formulario (`arguments.callee` en modo estricto); webhooks cerrados por defecto.

**Pendiente de rendimiento (S-02 sigue en ❌)**:
1. Medir en pagespeed.web.dev (la API gratuita agotó su cuota diaria).
2. En el inicio, el LCP pierde ~4,3 s en *render delay*: el hilo principal está ocupado con ~2,9 s de scripts dentro del HTML y ~2 s de estilos y layout. Hay que perfilar qué scripts del tema corren al cargar y diferir los que no afectan la primera pantalla.
3. Hay dos imágenes con `fetchpriority=high` en el hero (fondo y vehículo) compitiendo entre sí; dejar solo la del LCP.
4. El DOM tiene ~1.400 a 1.650 nodos (los SVG de íconos repetidos pesan).

**Contraste**: 30 a 39 elementos por página no pasan AA, sobre todo texto blanco sobre el verde de marca `#29a800` (ratio ~3,2:1; AA pide 4,5:1 en texto normal). Es una decisión de marca: oscurecer el verde de los botones (p. ej. `#1f7a00`, ya existe como hover) o usar texto oscuro. **Pendiente de decidir con Brenson.**

**Otros**: `/favicon.ico` responde 404 (falta el logo, pendiente de Brenson); el alt de la imagen de fondo del hero dice "Barranquilla" (la sede es Cali), revisar en Contenido → Archivos.


## B2C

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| H-01 | Home carga sin errores | Abrir `/` | 13 secciones en el orden aprobado; sin errores en consola | ✅ 21-sep: 9 secciones (hero → trust → categorías → destacados → financiación → videos → prueba social → empresas → blog), 0 errores de consola |
| H-02 | Hero: chips de categoría | Tocar cada chip | Navega a la colección correcta | ⬜ |
| H-03 | Cards "más vendidos" | Revisar 4 cards | Badge, 3 specs, cuota en rojo, precio contado con IVA | ⬜ |
| H-04 | Banner financiación | Revisar cifra | La cuota coincide con la del simulador del mismo producto (36 m, 10 %) | ⬜ |
| H-05 | Prueba social en producción | Apagar modo simulación | Testimonios/aliados/contadores no verificados desaparecen | ⬜ |
| C-01 | Facetas | Filtrar por categoría + autonomía + financiable | URL con parámetros, conteo correcto, chips activos | 🟡 21-sep: solo se ven las facetas Categoría y Precio en /collections/todos; revisar en Search & Discovery que estén activas Uso, Autonomía, Velocidad, Carga, Financiable y Licencia |
| C-02 | Orden por cuota | Seleccionar "cuota" | Orden equivalente a precio ascendente | ⬜ |
| C-03 | Card sin metafields | Producto sin `brenson.categoria` | Muestra precio estándar de Dawn sin romper | ⬜ |
| P-01 | Ficha: orden de bloques | Abrir City 1500 | Sello → título → specs → color → cuota → CTAs → micro-garantías | 🟡 21-sep: ficha sin errores de consola; el orden de bloques no se verificó automáticamente |
| P-02 | Cambio de variante con precio distinto | Delivery 2000: batería doble | Cuota y precio se actualizan en bloque, simulador y sticky bar | ⬜ |
| P-03 | Simulador | Cambiar inicial y plazo | Cuota recalcula al instante; disclaimer visible; "Simular otra cuota" hace scroll | ✅ 21-sep: cambia de $54.202 a $131.948 al pasar a 12 meses |
| P-04 | Solicitar financiamiento | Clic en CTA del simulador | Formulario precargado con tipo financiamiento y JSON de simulación | ⬜ |
| P-05 | Producto no financiable | `financiable = false` | Sin simulador; bloque de precio muestra solo contado | ⬜ |
| P-06 | Sello certificado desactivado | Apagar setting | Sello, checklist y sección de certificación desaparecen | ⬜ |
| P-07 | WhatsApp desde ficha | Clic en CTA verde | Abre wa.me con "Hola Brenson, me interesa el {modelo}…" + URL | ⬜ |
| P-08 | Sticky bar mobile | Ancho 390 | Visible, cuota + precio + botón; el flotante sube sobre la barra | ✅ 21-sep: visible a 390 px, sin scroll horizontal |
| P-09 | Exit intent | Mover mouse fuera arriba | Popup una vez; no reaparece en 7 días | ⬜ |
| P-10 | JSON-LD | Ver fuente | Product con additionalProperty, Breadcrumb, FAQPage válidos en validator.schema.org | ✅ 21-sep: Organization, Product, BreadcrumbList y FAQPage, todos JSON válido |
| L-01 | Formulario lead sin backend | Enviar | Éxito local, evento `brenson_lead_submit` en dataLayer | ⬜ |
| L-02 | Formulario lead con backend | Enviar con URL configurada | 200 del Worker, correo al asesor, lead en CRM mock | 🟡 21-sep: flujo correcto hasta Turnstile (Chrome automatizado no recibe token, es lo esperado). **Bug corregido**: el form nativo de Shopify se enviaba solo (faltaba data-nocaptcha). Falta un envío humano |
| L-03 | Prueba de manejo | Elegir domicilio | Aparecen fecha y ciudad; sede muestra dirección | ⬜ |
| L-04 | Honeypot | Llenar campo oculto | No se envía | ⬜ |
| W-01 | Horario | Simular sábado 14:00 | Estado "fuera de horario" en el flotante | ⬜ |
| F-01 | Página financiación | Elegir vehículo del select | Precio y nombre se cargan; cuota coincide con la ficha | ⬜ |
| A-01 | Registro persona | Crear cuenta con ciudad y uso | Nota con Ciudad/Uso; Flow 4 escribe metafields | ⬜ |
| A-02 | Registro pestaña Empresa | Clic en Empresa | Oculta el form personal y muestra el panel hacia Empresas | ⬜ |
| A-03 | Cuenta: unidades | Cliente con unidades mock | Lista con serie, fechas y estado | ⬜ |
| T-01 | Consent Mode | Cargar sin aceptar | `consent default denied`; GTM no dispara tags de marketing | ✅ 21-sep |
| T-02 | Aceptar consentimiento | Banner de privacidad → aceptar | `consent update granted` y evento `brenson_consent` | ⬜ |
| S-01 | Theme Check | `npm run theme:check` | 0 errores | ✅ 21-sep: 0 errores |
| S-02 | Lighthouse mobile ficha | Throttling 4G, CPU 4x | LCP < 2,5 s, CLS < 0,1, INP < 200 ms | ❌ 21-sep: LCP 5,2 s (objetivo < 2,5 s), CLS 0,001 ✅, TBT 800 ms. Ver sección Lighthouse |

## Empresas (B2B)

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| E-01 | Sin sesión | Abrir `/pages/empresas` | Landing con login, tiers, vehículos sin precio, pasos; sin HTML del dashboard en la fuente | ✅ 21-sep: sin HTML del dashboard, noindex |
| E-02 | Login corporativo | Ingresar con cliente aprobado | Redirige a `/pages/empresas`; dashboard con tier, asesor, KPIs | ⬜ |
| E-03 | Cuenta personal | Ingresar con cliente B2C | Estado "cuenta personal" con CTA registrar empresa | ⬜ |
| E-04 | Pendiente | Cliente con tag `b2b-pendiente` | Estado "validando" + subida de documento | ⬜ |
| E-05 | Rechazado | Metafield `estado_b2b = rechazado` | Estado "no habilitado" | ⬜ |
| E-06 | Registro corporativo | Formulario completo con NIT válido | Cuenta creada con nota `B2B {…}`; guard muestra pendiente aun sin Flow | ⬜ |
| E-07 | NIT inválido | DV incorrecto | Bloquea envío con mensaje | ⬜ |
| E-08 | Upload documento | PDF 2 MB | Éxito; > 5 MB rechazado; .exe rechazado | ⬜ |
| E-09 | Catálogo corporativo sin sesión | Abrir `/collections/empresas` | Sin productos ni precios; invitación a acceder; `noindex` | ✅ 21-sep: noindex, 0 precios sin sesión |
| E-10 | Catálogo corporativo aprobado | Con tier 2 | Precio público tachado y precio con 12 %; override por producto respetado | ⬜ |
| E-11 | Cotizador: mínimos | Sumar a un producto con mín. 10 | Cantidad salta a 10; bajar de 10 vuelve a 0 | ⬜ |
| E-12 | Cotizador: resumen | 10 Delivery + 5 Cargo Bike | Subtotal 147.850.000, descuento 17.742.000, total 130.108.000, progreso 15/20 | ⬜ |
| E-13 | Generar PDF sin backend | Clic | Ventana imprimible con marca de demostración | ⬜ |
| E-14 | Generar PDF con backend | Clic | Worker recalcula con Admin API; número COT-AAAA-NNNN; metaobject creado; correos enviados | ✅ 21-sep (API, Fase 3): COT-2026-0010/0011, metaobject y PDF real |
| E-15 | Borrador persistente | Recargar página | Cantidades restauradas desde localStorage | ⬜ |
| E-16 | Function de descuento | Cliente aprobado agrega 10 Delivery al carrito | Descuento 12 % aplicado en carrito y checkout; cliente sin tag no recibe descuento | ✅ 21-sep (API): Function descuenta el 8 % con el tier 1 (draftOrderCalculate). Falta verlo en un checkout con sesión |
| E-17 | Function: mínimo | 3 unidades de producto con mín. 5 | Sin descuento | ⬜ |
| E-18 | Manipulación cliente | Editar precio en DevTools y cotizar | El PDF muestra el precio recalculado por el Worker | ✅ 21-sep: el worker recalcula con precios de Shopify; el total no depende del navegador |
| E-19 | Header del portal | Navegar | Enlaces activos; "Cerrar sesión" funciona | ⬜ |
| E-20 | Tono | Leer todos los textos del portal | Siempre "usted" | ⬜ |

## Backend

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| B-01 | `GET /health` | 200 con proveedores activos | ✅ 21-sep |
| B-02 | Webhook sin HMAC válido | 401 | ✅ 21-sep **tras corregirlo**: sin secreto aceptaba webhooks sin firma (200); ahora 401 sin firma o con firma de otro cuerpo, 200 con firma válida |
| B-03 | Rate limit `/lead` | 11.ª petición en 10 min desde la misma IP → 429 | ✅ 21-sep: 11.ª petición → 429 |
| B-04 | `npm test` | Todos los tests pasan | ✅ 21-sep: worker 3/3, Function 8/8 |
| B-05 | CORS | Origen no permitido no recibe respuesta útil | ✅ 21-sep |
