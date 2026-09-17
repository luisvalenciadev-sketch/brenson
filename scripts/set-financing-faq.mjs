#!/usr/bin/env node
/**
 * Preguntas frecuentes de financiación (categoría "compra"), textuales del mockup Stitch 06.
 * Se muestran automáticamente en /pages/financiacion vía el filtro de categoría ya existente
 * en brenson-faq.liquid — no requiere cambios de plantilla, solo datos.
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/set-financing-faq.mjs [--dry-run]
 */
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const DRY = dryRun();
const F = (key, value) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
const rt = (text) => JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] });
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const preguntas = [
  { pregunta: '¿Cuáles son los requisitos para solicitar el crédito?', respuesta: 'Requisitos básicos: ser mayor de 18 años, cédula de ciudadanía colombiana original, y comprobante de ingresos o extractos bancarios de los últimos 3 meses (empleados o independientes). No necesitas fiador para la mayoría de los perfiles aprobados.' },
  { pregunta: '¿Cuánto tarda el estudio y respuesta de crédito?', respuesta: 'Nuestros aliados financieros cuentan con plataformas de validación en tiempo real. La pre-aprobación inicial tarda entre 5 a 15 minutos en línea. Tras la firma digital de garantías, la aprobación definitiva queda lista el mismo día hábil.' },
  { pregunta: '¿Puedo solicitar financiación si tengo reportes negativos en centrales?', respuesta: 'Contamos con diversos aliados con distintas matrices de riesgo. Si el reporte ya tiene paz y salvo o el saldo castigado es menor, existen alternativas viables aportando una cuota inicial del 20 % o 30 %. Te recomendamos diligenciar el formulario para un análisis personalizado.' },
  { pregunta: '¿Puedo hacer abonos a capital o cancelar anticipadamente sin penalización?', respuesta: 'Sí. En cumplimiento de la legislación colombiana, puedes realizar pagos extraordinarios directos a capital para reducir el plazo o disminuir el valor de tu cuota mensual sin ninguna penalización ni cobro adicional.' },
];

for (const q of preguntas) {
  const handle = slug('compra-' + q.pregunta).slice(0, 60);
  console.log('~', handle);
  if (DRY) continue;
  const d = await gql(
    `mutation($h: MetaobjectHandleInput!, $m: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $h, metaobject: $m) { metaobject { id } userErrors { field message } } }`,
    { h: { type: 'brenson_faq', handle }, m: { fields: [F('pregunta', q.pregunta), F('respuesta', rt(q.respuesta)), F('categoria', 'compra')] } }
  );
  userErrors(d.metaobjectUpsert, handle);
  await sleep(200);
}
console.log('Listo.');
