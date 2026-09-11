# Estrategia de simulación — Brenson

Decisión del 11 de septiembre de 2026: **se construye el ecosistema completo ahora**. Todo dato, servicio o texto que Brenson aún no ha entregado o confirmado se reemplaza por una simulación que cumple tres reglas:

1. **Misma forma que el dato real.** El código lee el mock exactamente igual que leerá el dato definitivo (mismo metafield, mismo metaobject, mismo endpoint). Reemplazar el mock nunca implica tocar Liquid ni JS.
2. **Marcado como simulado.** Cada mock lleva `"_mock": true` en JSON o el sufijo `[BORRADOR]` en textos, y el tema muestra un aviso discreto en staging cuando `settings.brenson_modo_simulacion` está activo. En producción ese ajuste se apaga.
3. **Un solo lugar para reemplazar.** Cada simulación tiene una fila en la tabla de abajo con el archivo mock, el destino real y quién entrega el dato.

## Capas de simulación

| # | Qué falta | Simulación | Destino real | Quién entrega | Cómo se reemplaza |
|---|---|---|---|---|---|
| S1 | Specs de vehículos | `mock-data/vehiculos.json`: 12 vehículos, 3 por categoría, specs completas y coherentes con el mercado colombiano | Metafields `brenson.*` por producto en Shopify | Brenson (plantilla Excel) | Script `scripts/import-products.mjs` lee JSON o CSV con el mismo esquema y escribe metafields vía Admin API |
| S2 | Fotos y video | Imágenes placeholder generadas por categoría (SVG con silueta + nombre) y video de stock libre en el hero | Shopify Files | Brenson (producción) | Subir a Files y reasignar en Admin; los handles de imagen no están en código |
| S3 | Tasa de financiación, aliado | Metaobject `parametros_financiacion` con tasa 1,9 % mensual, plazos 12/24/36/48, iniciales 0/10/20/30, aliado "Aliado Financiero [BORRADOR]" | Mismo metaobject con valores reales | Brenson + aliado | Editar la entrada del metaobject en Admin |
| S4 | Porcentajes de tier B2B | `tiers_b2b`: 8 % (10+), 12 % (20+), 18 % (50+) | Mismo metaobject | Brenson | Editar metaobject; la Shopify Function lo lee en cada ejecución |
| S5 | Checklist Certificación Brenson | 12 puntos de inspección propuestos (batería, motor, frenos, luces, torque, prueba de ruta, etc.) | Metaobject `certificacion` | Workshop Brenson | Editar metaobject |
| S6 | Términos de garantía y disclaimer | Textos redactados por el equipo, con sufijo `[BORRADOR]` | Mismos metafields/metaobjects | Abogado de Brenson | Reemplazar texto en Admin |
| S7 | Contadores (ventas, clientes, años, ciudades) | Valores redondos con `_mock` (250 vehículos, 120 clientes, 6 años, 18 ciudades) | Metaobject `contador` | Brenson | Editar valores |
| S8 | Testimonios, casos de uso, aliados | 6 testimonios, 2 casos de uso y 5 aliados ficticios con nombres genéricos y foto placeholder. Nunca se publican en producción | Metaobjects | Brenson (con autorización) | Reemplazar entradas; el tema oculta las que tengan `verificado = false` cuando el modo simulación está apagado |
| S9 | Asesores | 4 asesores ficticios (B2C, B2B, servicio, garantías) con el número oficial +57 316 482 0543 | Metaobject `asesor` | Brenson | Editar entradas |
| S10 | GoHighLevel / CRM | Adaptador `crm/mock.ts` en `brenson-services`: guarda el lead como cliente Shopify con tags y score, envía email al asesor y registra en log. Misma interfaz que `crm/ghl.ts` | Adaptador `crm/ghl.ts` con webhook real | Brenson (confirmar cuenta) | Variable de entorno `CRM_PROVIDER=ghl` + `GHL_WEBHOOK_URL`. Sin cambio de código |
| S11 | WhatsApp API (App vs API) | Solo enlaces `wa.me` con mensaje precargado; respuesta fuera de horario mostrada en el sitio, no enviada | WhatsApp Business API vía GHL | Verificación Sprint 1 | Si hay API, GHL envía la plantilla; el sitio no cambia |
| S12 | Cuentas de cliente clásicas | Se asume clásicas. Templates `customers/*.json` construidos para clásicas | Verificar en Admin | Dev con acceso | Si son nuevas: cambiar el ajuste en Admin (reversible) |
| S13 | Clientes B2B a migrar | `clientes_b2b.json`: 3 empresas ficticias con NIT válido (dígito de verificación correcto), una por tier | Clientes reales con tag y metafields | Brenson (lista) | Script `scripts/import-b2b-customers.mjs` |
| S14 | Unidades vendidas (garantías) | `unidades.json`: 8 unidades con serie, ligadas a los clientes mock | Metaobject `unidad` | Brenson registra al entregar | Mismo script de importación |
| S15 | Cotizaciones históricas | `cotizaciones.json`: 3 cotizaciones de ejemplo para poblar el historial | Metaobject `cotizacion_b2b` generado por `/quote` | Se genera solo | Borrar entradas mock |
| S16 | PDFMonkey, Resend, Cloudflare | En desarrollo local: PDF generado con plantilla HTML y `wrangler dev`; email a consola | Cuentas reales | Brenson crea cuentas | Variables de entorno |
| S17 | Políticas legales | Páginas con estructura y texto `[BORRADOR]` basado en Ley 1581 y Estatuto del Consumidor | Textos de Brenson | Brenson | Editar página en Admin |
| S18 | Tiempos de entrega por región | 5 regiones con tiempos estimados genéricos | Settings del tema | Brenson | Editor de tema |
| S19 | FAQ | 10 preguntas base sobre normativa colombiana de movilidad eléctrica, marcadas `[VALIDAR]` | Metaobject `faq` | Brenson valida | Editar entradas |
| S20 | Manual de marca | Tokens derivados del tema actual: Montserrat, negro `#050709`, rojo `#EE0000`, gris `#F4F4F4` | Manual de marca oficial | Brenson | Editar `assets/brenson-tokens.css` (un solo archivo) |
| S21 | Contenido en inglés | Traducción automática de secciones y specs, marcada para revisión | Translate & Adapt con revisión humana | Brenson / traductor | Editar en Translate & Adapt |
| S22 | Blog | 6 artículos redactados por el equipo, publicados como borrador | Artículos validados | Brenson valida | Publicar desde Admin |

## Modo simulación en el tema

- Setting global `brenson_modo_simulacion` (checkbox en `settings_schema.json`, grupo "Brenson · Desarrollo").
- Cuando está activo: banner fijo inferior "Sitio en construcción: datos de demostración", y las secciones muestran contenido con `_mock` o `verificado = false`.
- Cuando está apagado: se ocultan testimonios, aliados y contadores no verificados, y cualquier texto con `[BORRADOR]` o `[VALIDAR]` se reemplaza por su fallback neutro (ej.: la garantía muestra "Consulta los términos con tu asesor").
- El checklist de go-live incluye apagar el modo simulación y verificar que no queden marcadores.

## Modo simulación en brenson-services

```
CRM_PROVIDER=mock | ghl
MAIL_PROVIDER=console | resend
PDF_PROVIDER=html | pdfmonkey
STORAGE_PROVIDER=local | r2
```

Cada proveedor implementa la misma interfaz. Cambiar de mock a real es cambiar una variable de entorno.

## Comando de verificación pre-lanzamiento

`npm run check:mocks` recorre el tema, los mock-data importados y las páginas, y falla si encuentra `_mock`, `[BORRADOR]` o `[VALIDAR]` en contenido publicado.
