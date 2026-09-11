# Matriz de QA — Brenson

Ejecutar en tema Staging antes de cada demo y completa antes del go-live. Dispositivos: Chrome, Safari, Firefox, Samsung Internet; iPhone y Android gama media emulados (decisión L4).

Estado: ⬜ pendiente · ✅ pasa · ❌ falla (anotar issue).

## B2C

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| H-01 | Home carga sin errores | Abrir `/` | 13 secciones en el orden aprobado; sin errores en consola | ⬜ |
| H-02 | Hero: chips de categoría | Tocar cada chip | Navega a la colección correcta | ⬜ |
| H-03 | Cards "más vendidos" | Revisar 4 cards | Badge, 3 specs, cuota en rojo, precio contado con IVA | ⬜ |
| H-04 | Banner financiación | Revisar cifra | La cuota coincide con la del simulador del mismo producto (36 m, 10 %) | ⬜ |
| H-05 | Prueba social en producción | Apagar modo simulación | Testimonios/aliados/contadores no verificados desaparecen | ⬜ |
| C-01 | Facetas | Filtrar por categoría + autonomía + financiable | URL con parámetros, conteo correcto, chips activos | ⬜ |
| C-02 | Orden por cuota | Seleccionar "cuota" | Orden equivalente a precio ascendente | ⬜ |
| C-03 | Card sin metafields | Producto sin `brenson.categoria` | Muestra precio estándar de Dawn sin romper | ⬜ |
| P-01 | Ficha: orden de bloques | Abrir City 1500 | Sello → título → specs → color → cuota → CTAs → micro-garantías | ⬜ |
| P-02 | Cambio de variante con precio distinto | Delivery 2000: batería doble | Cuota y precio se actualizan en bloque, simulador y sticky bar | ⬜ |
| P-03 | Simulador | Cambiar inicial y plazo | Cuota recalcula al instante; disclaimer visible; "Simular otra cuota" hace scroll | ⬜ |
| P-04 | Solicitar financiamiento | Clic en CTA del simulador | Formulario precargado con tipo financiamiento y JSON de simulación | ⬜ |
| P-05 | Producto no financiable | `financiable = false` | Sin simulador; bloque de precio muestra solo contado | ⬜ |
| P-06 | Sello certificado desactivado | Apagar setting | Sello, checklist y sección de certificación desaparecen | ⬜ |
| P-07 | WhatsApp desde ficha | Clic en CTA verde | Abre wa.me con "Hola Brenson, me interesa el {modelo}…" + URL | ⬜ |
| P-08 | Sticky bar mobile | Ancho 390 | Visible, cuota + precio + botón; el flotante sube sobre la barra | ⬜ |
| P-09 | Exit intent | Mover mouse fuera arriba | Popup una vez; no reaparece en 7 días | ⬜ |
| P-10 | JSON-LD | Ver fuente | Product con additionalProperty, Breadcrumb, FAQPage válidos en validator.schema.org | ⬜ |
| L-01 | Formulario lead sin backend | Enviar | Éxito local, evento `brenson_lead_submit` en dataLayer | ⬜ |
| L-02 | Formulario lead con backend | Enviar con URL configurada | 200 del Worker, correo al asesor, lead en CRM mock | ⬜ |
| L-03 | Prueba de manejo | Elegir domicilio | Aparecen fecha y ciudad; sede muestra dirección | ⬜ |
| L-04 | Honeypot | Llenar campo oculto | No se envía | ⬜ |
| W-01 | Horario | Simular sábado 14:00 | Estado "fuera de horario" en el flotante | ⬜ |
| F-01 | Página financiación | Elegir vehículo del select | Precio y nombre se cargan; cuota coincide con la ficha | ⬜ |
| A-01 | Registro persona | Crear cuenta con ciudad y uso | Nota con Ciudad/Uso; Flow 4 escribe metafields | ⬜ |
| A-02 | Registro pestaña Empresa | Clic en Empresa | Oculta el form personal y muestra el panel hacia Empresas | ⬜ |
| A-03 | Cuenta: unidades | Cliente con unidades mock | Lista con serie, fechas y estado | ⬜ |
| T-01 | Consent Mode | Cargar sin aceptar | `consent default denied`; GTM no dispara tags de marketing | ⬜ |
| T-02 | Aceptar consentimiento | Banner de privacidad → aceptar | `consent update granted` y evento `brenson_consent` | ⬜ |
| S-01 | Theme Check | `npm run theme:check` | 0 errores | ⬜ |
| S-02 | Lighthouse mobile ficha | Throttling 4G, CPU 4x | LCP < 2,5 s, CLS < 0,1, INP < 200 ms | ⬜ |

## Empresas (B2B)

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| E-01 | Sin sesión | Abrir `/pages/empresas` | Landing con login, tiers, vehículos sin precio, pasos; sin HTML del dashboard en la fuente | ⬜ |
| E-02 | Login corporativo | Ingresar con cliente aprobado | Redirige a `/pages/empresas`; dashboard con tier, asesor, KPIs | ⬜ |
| E-03 | Cuenta personal | Ingresar con cliente B2C | Estado "cuenta personal" con CTA registrar empresa | ⬜ |
| E-04 | Pendiente | Cliente con tag `b2b-pendiente` | Estado "validando" + subida de documento | ⬜ |
| E-05 | Rechazado | Metafield `estado_b2b = rechazado` | Estado "no habilitado" | ⬜ |
| E-06 | Registro corporativo | Formulario completo con NIT válido | Cuenta creada con nota `B2B {…}`; guard muestra pendiente aun sin Flow | ⬜ |
| E-07 | NIT inválido | DV incorrecto | Bloquea envío con mensaje | ⬜ |
| E-08 | Upload documento | PDF 2 MB | Éxito; > 5 MB rechazado; .exe rechazado | ⬜ |
| E-09 | Catálogo corporativo sin sesión | Abrir `/collections/empresas` | Sin productos ni precios; invitación a acceder; `noindex` | ⬜ |
| E-10 | Catálogo corporativo aprobado | Con tier 2 | Precio público tachado y precio con 12 %; override por producto respetado | ⬜ |
| E-11 | Cotizador: mínimos | Sumar a un producto con mín. 10 | Cantidad salta a 10; bajar de 10 vuelve a 0 | ⬜ |
| E-12 | Cotizador: resumen | 10 Delivery + 5 Cargo Bike | Subtotal 147.850.000, descuento 17.742.000, total 130.108.000, progreso 15/20 | ⬜ |
| E-13 | Generar PDF sin backend | Clic | Ventana imprimible con marca de demostración | ⬜ |
| E-14 | Generar PDF con backend | Clic | Worker recalcula con Admin API; número COT-AAAA-NNNN; metaobject creado; correos enviados | ⬜ |
| E-15 | Borrador persistente | Recargar página | Cantidades restauradas desde localStorage | ⬜ |
| E-16 | Function de descuento | Cliente aprobado agrega 10 Delivery al carrito | Descuento 12 % aplicado en carrito y checkout; cliente sin tag no recibe descuento | ⬜ |
| E-17 | Function: mínimo | 3 unidades de producto con mín. 5 | Sin descuento | ⬜ |
| E-18 | Manipulación cliente | Editar precio en DevTools y cotizar | El PDF muestra el precio recalculado por el Worker | ⬜ |
| E-19 | Header del portal | Navegar | Enlaces activos; "Cerrar sesión" funciona | ⬜ |
| E-20 | Tono | Leer todos los textos del portal | Siempre "usted" | ⬜ |

## Backend

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| B-01 | `GET /health` | 200 con proveedores activos | ⬜ |
| B-02 | Webhook sin HMAC válido | 401 | ⬜ |
| B-03 | Rate limit `/lead` | 11.ª petición en 10 min desde la misma IP → 429 | ⬜ |
| B-04 | `npm test` | Todos los tests pasan | ⬜ |
| B-05 | CORS | Origen no permitido no recibe respuesta útil | ⬜ |
