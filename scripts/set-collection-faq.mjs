#!/usr/bin/env node
/**
 * Crea preguntas frecuentes específicas por categoría de vehículo (Stitch 02/14, sesión de validación
 * visual) y las asigna al metafield brenson.faq (list.metaobject_reference) de cada colección real.
 * Idempotente por handle de metaobject. El contenido de "Ciclomotores" viene textual del mockup Stitch
 * (02-catalogo); el resto se basa en los artículos ya publicados del blog movilidad-electrica, con el
 * mismo estilo [VALIDAR] que usa el resto del sitio para datos normativos no confirmados por jurídico.
 *   SHOPIFY_SHOP=... SHOPIFY_ADMIN_TOKEN=... node scripts/set-collection-faq.mjs [--dry-run]
 * Scopes: write_metaobjects, write_products (colecciones).
 */
import { gql, userErrors, dryRun, sleep } from './lib/shopify-admin.mjs';

const DRY = dryRun();
const F = (key, value) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) });
const rt = (text) => JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] });
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function upsertMo(type, handle, fields) {
  console.log(`~ metaobject ${type}/${handle}`);
  if (DRY) return null;
  const d = await gql(
    `mutation($h: MetaobjectHandleInput!, $m: MetaobjectUpsertInput!) { metaobjectUpsert(handle: $h, metaobject: $m) { metaobject { id } userErrors { field message } } }`,
    { h: { type, handle }, m: { fields } }
  );
  userErrors(d.metaobjectUpsert, `${type}/${handle}`);
  await sleep(200);
  return d.metaobjectUpsert.metaobject?.id;
}

const DATA = {
  ciclomotores: [
    {
      pregunta: '¿Se requiere licencia de conducción para ciclomotor en Colombia?',
      respuesta: 'Sí. De acuerdo con la Resolución 160 de 2017 del Ministerio de Transporte, los ciclomotores eléctricos están clasificados como vehículos automotores de dos ruedas y requieren que el conductor porte una licencia de conducción de categoría A1 (ciclomotores y motocicletas hasta 125 cc) o A2. En Brenson te asesoramos para que tu proceso de validación ante el RUNT sea completamente transparente y sin contratiempos.',
    },
    {
      pregunta: '¿Es obligatorio el SOAT y la matrícula para ciclomotores?',
      respuesta: 'Sí, es obligatorio contar con matrícula inicial (placa amarilla de ciclomotor) y póliza SOAT vigente. La gran ventaja es que, por la Ley de Movilidad Eléctrica en Colombia, los ciclomotores gozan de una tarifa diferencial reducida de SOAT significativamente más económica que la de una motocicleta a combustión, además de descuentos en la revisión técnico-mecánica tras su segundo año.',
    },
    {
      pregunta: '¿Los ciclomotores eléctricos tienen restricción de pico y placa?',
      respuesta: 'No tienen restricción de pico y placa. En Bogotá, Medellín (Valle de Aburrá), Cali, Barranquilla y Bucaramanga, los vehículos 100 % eléctricos están completamente exentos de la restricción vehicular para fomentar la transición energética y aire limpio. Puedes circular los 365 días del año sin preocuparte por horarios restrictivos.',
    },
    {
      pregunta: '¿Dónde y cómo se recargan estos vehículos?',
      respuesta: 'Se conectan directamente a cualquier tomacorriente convencional de 110V doméstico, el mismo en el que conectas tu teléfono o computador. No requieres instalaciones trifásicas ni transformadores especiales. Nuestros modelos cuentan con baterías de litio extraíbles que puedes subir a tu apartamento u oficina; una recarga completa toma entre 4 y 6 horas.',
    },
  ],
  bicicletas: [
    {
      pregunta: '¿Necesito licencia para una bicicleta eléctrica en Colombia?',
      respuesta: 'No, si el motor solo asiste el pedaleo, la potencia nominal no supera 350 W y la asistencia se corta a 25 km/h: se considera bicicleta y no requiere licencia, matrícula ni SOAT (Resolución 160 de 2017 del Ministerio de Transporte [VALIDAR vigencia y modificaciones]). Sí debes usar casco y respetar las normas de tránsito para ciclistas.',
    },
    {
      pregunta: '¿Las bicicletas Brenson entran en esa categoría?',
      respuesta: 'Sí, nuestras bicicletas Urban E250, Trail E500 y Cargo Bike E350 están dentro de los límites de potencia y velocidad asistida de la categoría "bicicleta con pedaleo asistido", por lo que no requieren trámites de tránsito adicionales para circular.',
    },
    {
      pregunta: '¿Cuánto cuesta cargar la batería en casa?',
      respuesta: 'Una carga completa cuesta pocos cientos de pesos: multiplica la capacidad de la batería en kWh por la tarifa de energía de tu factura (barrio/estrato) [VALIDAR tarifa vigente]. Se carga en cualquier tomacorriente de 110V, sin instalación especial.',
    },
    {
      pregunta: '¿Qué mantenimiento requiere la batería LiFePO4?',
      respuesta: 'Conservan más del 80 % de su capacidad tras 2.000 ciclos (entre 5 y 7 años de uso normal). Recomendamos no descargarla a 0 %, no dejarla al 100 % por semanas si no la vas a usar, protegerla del calor extremo y cargarla solo con el cargador original.',
    },
  ],
  motocarros: [
    {
      pregunta: '¿Qué licencia se necesita para conducir un motocarro eléctrico?',
      respuesta: 'Depende de la categoría homologada del vehículo ante el organismo de tránsito de tu ciudad; en general se exige licencia de conducción para vehículos de carga liviana [VALIDAR con el organismo de tránsito local]. Tu asesor Brenson te confirma la categoría exacta de tu modelo antes de la compra.',
    },
    {
      pregunta: '¿Cómo se matricula un motocarro eléctrico?',
      respuesta: 'Se matricula como vehículo automotor con: factura de compra y certificado de importación (los entrega Brenson), ficha técnica de homologación del modelo, SOAT vigente y documentos del propietario. Con los documentos completos, la matrícula tarda entre 5 y 15 días hábiles según la ciudad [VALIDAR con el organismo de tránsito local].',
    },
    {
      pregunta: '¿Cuánta carga pueden transportar legalmente?',
      respuesta: 'La capacidad de carga certificada de cada modelo aparece en su ficha técnica (sección Especificaciones de cada vehículo). El transporte de carga en vía pública debe respetar además los límites de peso por eje de la normativa de tránsito vigente [VALIDAR normativa de carga].',
    },
    {
      pregunta: '¿Dónde hago el mantenimiento?',
      respuesta: 'En nuestra red de talleres autorizados Brenson o en el taller aliado más cercano a tu ciudad. Escríbenos por WhatsApp con el número de serie de tu vehículo y coordinamos la revisión.',
    },
  ],
  cuadriciclos: [
    {
      pregunta: '¿Dónde pueden circular los cuadriciclos Brenson?',
      respuesta: 'Se usan principalmente en vías privadas: fincas, parques, hoteles, condominios y centros de distribución. Para circular en vía pública deben cumplir con la matrícula, el SOAT y la homologación exigidos por el organismo de tránsito de tu ciudad [VALIDAR uso permitido según el modelo y el municipio].',
    },
    {
      pregunta: '¿Qué documentos necesito para matricularlo si lo voy a usar en vía pública?',
      respuesta: 'Los mismos que para un motocarro: factura de compra y certificado de importación (los entrega Brenson), ficha técnica de homologación, SOAT vigente y documentos del propietario. El trámite tarda entre 5 y 15 días hábiles según la ciudad [VALIDAR con el organismo de tránsito local].',
    },
    {
      pregunta: '¿Requieren licencia de conducción?',
      respuesta: 'Si el cuadriciclo se matricula para circular en vía pública, sí se exige licencia de conducción en la categoría que aplique al vehículo [VALIDAR con el organismo de tránsito local]. Para uso exclusivo en predios privados no aplica.',
    },
    {
      pregunta: '¿Qué garantía tienen los cuadriciclos Brenson?',
      respuesta: 'La misma garantía directa Brenson que el resto del portafolio: cobertura de motor, controlador y batería según los meses indicados en la ficha de cada modelo, con inspección de 12 puntos antes de cada entrega.',
    },
  ],
};

const COLLECTIONS = {
  ciclomotores: 'ciclomotores',
  bicicletas: 'bicicletas-electricas',
  motocarros: 'motocarros',
  cuadriciclos: 'cuadriciclos',
};

async function getCollectionId(handle) {
  const d = await gql(`query($h: String!) { collectionByHandle(handle: $h) { id title } }`, { h: handle });
  return d.collectionByHandle;
}

async function setFaqMetafield(collectionId, faqIds) {
  if (DRY) return;
  const d = await gql(
    `mutation($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
    { m: [{ ownerId: collectionId, namespace: 'brenson', key: 'faq', type: 'list.metaobject_reference', value: JSON.stringify(faqIds) }] }
  );
  userErrors({ userErrors: d.metafieldsSet.userErrors }, collectionId);
}

for (const [categoria, preguntas] of Object.entries(DATA)) {
  console.log(`\n=== ${categoria} ===`);
  const ids = [];
  for (const q of preguntas) {
    const id = await upsertMo('brenson_faq', slug(categoria + '-' + q.pregunta).slice(0, 60), [
      F('pregunta', q.pregunta),
      F('respuesta', rt(q.respuesta)),
      F('categoria', categoria),
    ]);
    if (id) ids.push(id);
  }
  const handle = COLLECTIONS[categoria];
  const col = DRY ? null : await getCollectionId(handle);
  if (!DRY && !col) {
    console.warn(`  ⚠ no se encontró la colección ${handle}`);
    continue;
  }
  if (!DRY) {
    console.log(`  → asignando ${ids.length} preguntas a colección "${col.title}" (${handle})`);
    await setFaqMetafield(col.id, ids);
  }
}
console.log('\nListo.');
