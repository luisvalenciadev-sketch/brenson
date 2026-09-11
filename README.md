# Brenson Ecosistema

Ecosistema digital de **Brenson S.A.S.** (vehículos eléctricos, Colombia) sobre Shopify: canal B2C y portal B2B "Brenson Empresas".

**¿Retomas el proyecto en una sesión nueva?** Copia el prompt de [`docs/PROMPT_CONTINUACION.md`](docs/PROMPT_CONTINUACION.md).
**¿Vas a publicar?** Sigue [`docs/GUIA_PUBLICACION.md`](docs/GUIA_PUBLICACION.md).
**¿Qué está hecho?** [`docs/ESTADO_CONSTRUCCION.md`](docs/ESTADO_CONSTRUCCION.md).

| Carpeta | Contenido | Estado |
|---|---|---|
| `brenson-theme/` | Tema Shopify (Dawn 16 + secciones, snippets y assets `brenson-*`) | Código completo · Theme Check 0/0 |
| `brenson-services/` | Backend serverless (Cloudflare Workers, Hono): leads, cotizaciones PDF, documentos B2B, webhooks → CRM | Código completo · `tsc` limpio · tests |
| `brenson-b2b-functions/` | App custom con Shopify Function de descuento por tier B2B | Código completo · tests |
| `scripts/` | Crear definiciones de metafields/metaobjects, importar datos simulados y blog, verificar mocks, placeholders | Probados en dry-run |
| `mock-data/` | 12 vehículos, metaobjects, blog, políticas borrador, imágenes placeholder | Reemplazables sin tocar código |
| `stitch-design/` | 14 pantallas diseñadas en Stitch (PNG + HTML) y sus revisiones | Completo |
| `docs/` | Plan, decisiones, simulación, Flows, QA, manual, copy, publicación, prompt | Completo |

## Comandos

```bash
npm run theme:check          # Theme Check del tema
npm test                     # tests del Worker y de la Function
npm run definitions:dry      # ver definiciones a crear (requiere SHOPIFY_SHOP y SHOPIFY_ADMIN_TOKEN para el real)
npm run import:mocks:dry     # ver datos a importar
npm run check:mocks          # marcadores de simulación pendientes de reemplazar
npm run theme:push:staging   # subir el tema como "Brenson Staging" (sin publicar)
```

## Principios

Confianza visible sin datos inventados · la cuota mensual vende y siempre se calcula · mobile-first · "tú" en B2C y "usted" en Empresas · todo lo simulado está marcado y se reemplaza desde el Admin.
