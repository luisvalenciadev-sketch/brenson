# Revisión — Homepage desktop (Stitch)

Screen: `projects/6680964782534882674/screens/e764872914cc46bebe0e3a8d0dcb5b15`
Captura: `home-desktop-full.png` · Código: `home-desktop.html`

## Cumple
- Orden de secciones aprobado (G3): anuncio → header → hero → confianza → categorías → más vendidos → financiación → casos → testimonios → aliados/contadores → CTA Empresas → blog → newsletter → footer.
- Cuota mensual protagonista en cada card, precio contado secundario (C8, G7).
- Barra de anuncios con mensaje de financiación (G5).
- Tono "tú" en B2C y "usted" en el bloque Empresas (B3).
- Badge "Certificado Brenson · 12 puntos de inspección" en el hero.
- Botón WhatsApp en header y flotante.

## Ajustar al llevar a Liquid
- **Aliados**: Stitch puso marcas reales (Bancolombia, Davivienda, Sura, Enel X, Celsia). En el tema los aliados vienen del metaobject `brenson_aliado` con `[MOCK]` hasta que Brenson autorice logos reales (S8).
- **Hero**: usar video en loop (G2); Stitch generó imagen estática. La sección Liquid soporta ambos.
- **Simulador del banner**: el resultado mostrado ($ 255.664) no coincide con la cuota de referencia del City 1500 ($ 289.000 a 36 meses con 10 % inicial y 1,9 %). En Liquid la cifra se calcula, no se escribe.
- **Contadores**: marcar `verificado = false` hasta recibir cifras (B13).
- **Tabs "Todos / Trabajo / Personal"** en Más vendidos: buena idea, se implementa con el metafield `uso`.

## Mapeo a secciones del tema
| Bloque Stitch | Sección Liquid |
|---|---|
| Anuncio | `announcement-bar` (Dawn) |
| Header | `header` (Dawn, extendido con CTA WhatsApp y menú Empresas) |
| Hero | `brenson-hero` |
| Confianza | `brenson-trust-bar` |
| Categorías | `brenson-category-grid` |
| Más vendidos | `featured-collection` (Dawn) con `card-product` extendido |
| Financiación | `brenson-financing-banner` |
| Casos de uso | `brenson-case-studies` |
| Testimonios | `brenson-testimonials` |
| Aliados + contadores | `brenson-partners` + `brenson-counters` |
| CTA Empresas | `brenson-empresas-cta` |
| Blog | `featured-blog` (Dawn) |
| Newsletter | `newsletter` (Dawn) |
| Footer | `footer` (Dawn) |
