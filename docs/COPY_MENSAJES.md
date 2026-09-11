# Copy de mensajes automáticos — Brenson

Borradores para validación de Brenson (decisiones J4, K4). Tono "tú" en B2C y "usted" en B2B. Variables entre llaves. Nada se envía sin la autorización de datos aceptada.

## A. Seguimiento de leads en GoHighLevel (B2C)

**+2 h · WhatsApp**
> Hola {nombre}, soy {asesor} de Brenson. Vi que te interesa el {vehiculo}. ¿Te cuento cómo quedaría la cuota mensual y los tiempos de entrega a {ciudad}? Responde este mensaje y te atiendo de inmediato.

**+24 h · Email** · Asunto: `Tu {vehiculo} te está esperando`
> Hola {nombre}, ayer simulaste una cuota de {cuota}/mes para el {vehiculo}. Te dejo tres cosas útiles: la ficha técnica en PDF, los 12 puntos de la Certificación Brenson y el enlace para agendar una prueba de manejo. Si prefieres, escríbeme por WhatsApp: {whatsapp}.

**+48 h · Tarea de llamada para el asesor**
> Llamar a {nombre} ({whatsapp}). Interés: {vehiculo}, uso {uso}, cantidad {cantidad}. Score {score}. Guion: confirmar necesidad, ofrecer prueba de manejo, cerrar cita.

**+7 días sin respuesta · WhatsApp de cierre**
> {nombre}, no quiero llenarte de mensajes. Te dejo mi contacto por si retomas la idea del {vehiculo}: {whatsapp}. Cuando quieras, aquí estoy.

## B. Seguimiento B2B en GoHighLevel

**Solicitud recibida · Email** · Asunto: `Recibimos la solicitud de {empresa}`
> Estimado(a) {nombre}: recibimos la solicitud de acceso corporativo de {empresa} (NIT {nit}). La validaremos en un plazo máximo de 24 horas hábiles. Si desea adelantar la conversación, su ejecutivo asignado es {asesor}: {whatsapp_asesor}.

**Cotización generada · WhatsApp al asesor**
> {empresa} generó la cotización {numero}: {unidades} unidades, total {total}. Contactar hoy.

**Cotización por vencer (día 12 de 15) · Email al cliente**
> Estimado(a) {nombre}: la cotización {numero} vence el {fecha}. Si desea extender la validez o ajustar cantidades, responda este correo o escriba a {asesor}.

## C. Klaviyo — flujos de email

### 1. Bienvenida B2C (registro o newsletter)
- **Email 1 (inmediato)** · `Bienvenido a Brenson: así funciona la movilidad eléctrica certificada`. Qué es la Certificación Brenson, cómo simular la cuota, enlace a las 4 categorías.
- **Email 2 (+3 días)** · `¿Cuánto ahorras frente a la gasolina?` Comparativo mensual y CTA al simulador.
- **Email 3 (+7 días)** · `Preguntas que todos hacen antes de comprar` Licencia, SOAT, carga, garantía.

### 2. Bienvenida B2B (evento `b2b_aprobado`, tono usted)
- **Email 1 (inmediato)** · `Su acceso a Brenson Empresas está activo`. Tier asignado, descuento, cómo entrar al portal, asesor con foto y WhatsApp.
- **Email 2 (+2 días)** · `Cómo generar su primera cotización de flota en 2 minutos`. Video corto o pasos.

### 3. Carrito abandonado (B2C, checkout iniciado)
- **+2 h** · `Tu {producto} sigue disponible`. Recordatorio, cuota estimada, WhatsApp del asesor.
- **+24 h** · `¿Dudas antes de decidir?` Garantía, prueba de manejo, financiación.
- **+72 h** · `Última nota sobre tu {producto}`. Sin descuentos artificiales; solo disponibilidad y contacto.

### 4. Post-compra
- **Al pagar** · `Gracias. Así preparamos tu vehículo` Explica los 12 puntos de inspección y tiempos por región.
- **Al entregar** · `Tu vehículo ya está en tus manos: guía de los primeros 30 días`. Carga, cuidados de batería, cómo consultar la garantía por número de serie en la cuenta.
- **+14 días** · Solicitud de reseña (Junip), sin incentivo.

### 5. Lead frío (+7 días sin respuesta en GHL, sincronizado por tag)
- **Email único** · `Cuando quieras retomar, aquí está todo`. Ficha, simulador, WhatsApp. Se detiene si el lead vuelve a interactuar.

## D. Plantillas de WhatsApp Business (si hay API)

| Nombre | Texto |
|---|---|
| `brenson_fuera_horario` | Gracias por escribir a Brenson. Nuestro horario es lunes a viernes de 8:00 a 18:00 y sábados de 9:00 a 13:00. Te respondemos al inicio de la próxima jornada. |
| `brenson_bienvenida_lead` | Hola {{1}}, soy {{2}} de Brenson. Recibí tu interés en el {{3}}. ¿Cuándo te viene bien que hablemos? |
| `brenson_cotizacion_b2b` | Estimado(a) {{1}}, su cotización {{2}} está lista: {{3}}. Su ejecutivo {{4}} queda atento. |
| `brenson_garantia_recibida` | Recibimos su caso de garantía para la unidad {{1}}. Un técnico le contactará en menos de 24 horas hábiles. |

## E. Mensajes del sitio (ya implementados)

- Botón flotante: "Hablar con un asesor" · estado "En línea / Fuera de horario".
- Desde ficha: "Hola Brenson, me interesa el {modelo}. ¿Me dan más información?"
- Desde Empresas: "Buen día, represento a una empresa y quisiera información sobre flotas eléctricas Brenson."
- Formulario enviado: "Recibimos tu solicitud. Un asesor te contactará en horario de atención."
- Portal pendiente: "Estamos validando su empresa. Nuestro equipo la revisa en un plazo de 24 horas hábiles."
