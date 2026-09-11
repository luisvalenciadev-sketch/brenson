# Revisión de pantallas Stitch — 02 Catálogo · 03 Ficha · 04 Dashboard Empresas

Regla general: Stitch tiende a **inventar datos reales** (marcas, NIT, teléfonos, sellos oficiales). Nada de eso pasa al tema. En Liquid todo dato viene de settings, metafields o metaobjects marcados `[MOCK]`.

## 02 · Catálogo Ciclomotores (`c37f3deaf7374b67bae08b5fe4e89f5b`)

Cumple: sidebar de facetas con todas las confirmadas (G8), chips activos, ordenamiento por cuota, cards con badge + 3 specs + cuota protagonista + precio contado + sello verde (G7), CTA WhatsApp intermedio, FAQ de categoría, trust bar.

Corregir al implementar:
- Quitar el badge **"Certificación MinTransporte / RUNT"** del hero de colección: es una afirmación regulatoria no verificable. Sustituir por el sello Brenson.
- Footer con **NIT 901.482.390-1, línea (601) 745 0090, WhatsApp +57 300 248 9910, "Vigilado por la SIC", aliados Bancolombia/Sufi/Addi, showrooms en Bogotá/Medellín**: todo inventado. El footer del tema usa settings Brenson.
- Corazón de favoritos en las cards: no está en alcance. Se omite.
- Toggle "100 % Financiable" se implementa como faceta booleana `brenson.financiable`.

Mapeo: `main-collection-banner` (Dawn, extendido con chips de cuota/garantía) · `main-collection-product-grid` + `facets` (Dawn, extendidos) · `card-product` (extendido) · `brenson-trust-bar` · `brenson-faq` con `categoria`.

## 03 · Ficha Brenson City 1500 (`07ab1951aa524cc8a4871f7acedf549b`)

Cumple: orden de bloques aprobado (H1), sello certificado arriba, 3 specs clave, swatches, bloque de precio con cuota enorme y precio contado debajo (C8), CTA verde WhatsApp primario + cotización secundaria + comprar en línea terciario (H7), micro-garantías, simulador con chips/tabs y tarjeta de resultado, checklist de 12 puntos, specs en 4 grupos, garantía con qué cubre / no cubre, tabla de envíos por región, reseñas, relacionados.

Corregir al implementar:
- "Aliados Bancolombia / Sufi / Addi / Vanti Lista" en simulador y micro-garantías: inventado. El aliado viene del metaobject `parametros_financiacion.aliado_nombre`.
- "Pre-aprobación en 5 min" y "Aprobado por ingeniería Brenson": promesas no acordadas. Se eliminan.
- Precio en cards relacionadas muestra cuota de $ 305.000 para Delivery 2000 (inconsistente con catálogo $ 343.000). En Liquid la cuota se calcula, no se escribe.
- Cuota en tarjeta del simulador: la cifra debe salir del cálculo real: City 1500 a 36 meses, 10 % inicial, 1,9 % mensual = **$ 275.000 aprox.** (P = 7.191.000). El "$ 289.000" del brief era una aproximación; el tema mostrará el valor calculado.

Mapeo: `main-product` (Dawn, con bloques nuevos `brenson_certificado`, `brenson_specs_clave`, `brenson_precio`, `brenson_cta_whatsapp`, `brenson_cta_cotizar`, `brenson_micro_garantias`) · `brenson-simulator` · `brenson-product-certification` · `brenson-product-specs` · `brenson-product-warranty` · `brenson-faq` · `brenson-lead-form` · `related-products` · `brenson-sticky-cta`.

## 04 · Dashboard Brenson Empresas (`fb241b337db64027bbaf64606c55b151`)

Cumple: header oscuro del portal con navegación completa, bienvenida formal (usted) con chips de estado y tier, 4 KPI, asesor con WhatsApp y correo, última cotización con PDF y duplicar, acciones rápidas, documentos, tabla de unidades con serie y garantías por unidad (I5), tabla de tiers con el actual resaltado (I3).

Corregir al implementar:
- "PBX +57 (605) 322 8900 ext. 204", "andres.gomez@brenson.co", "NIT 901.458.239-1", "TK-892", "Brenson Capital", "Bogotá · Medellín": inventados. Asesor y contacto desde metaobject `brenson_asesor` y settings.
- "Telemática y monitoreo" en KPI de unidades: fuera de alcance. Se reemplaza por "unidades en garantía".
- La cifra del ahorro ($ 17.740.045) no cuadra con 12 % de $ 147.850.000 (= $ 17.742.000). En Liquid/JS se calcula.
- Foto del asesor: generada por IA. En el tema, placeholder con inicial hasta tener foto real.

Mapeo: `layout/theme.empresas.liquid` · `page.empresas.json` con `brenson-b2b-gate` → `brenson-b2b-dashboard` (KPIs + asesor + última cotización + acciones + documentos) · `brenson-b2b-units` (tabla `brenson_unidad`) · `brenson-b2b-tiers`.

## 05 · Crear cuenta / Iniciar sesión (`0f26288a660c4391bd41a8525c09d13a`)

Cumple: dos columnas (crear cuenta blanca / login carbón), selector Persona/Empresa, campos ciudad y uso previsto (I8), checkbox Ley 1581, panel hacia Brenson Empresas, beneficios de la cuenta, trust bar.

Corregir: "Facturación electrónica DIAN descargable en PDF y XML" depende de la app de facturación (verificación I9): se deja como "Facturas descargables". Aliados financieros inventados otra vez.

Mapeo: `templates/customers/register.json` + `main-register` (extendido) · `templates/customers/login.json` + `main-login` (extendido).
