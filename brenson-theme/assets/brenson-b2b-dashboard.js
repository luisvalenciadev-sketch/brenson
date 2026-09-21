/**
 * Botón "Aceptar cotización" en el dashboard B2B (Módulo 08, flujo cotización → pedido).
 * POST {brenson_services_url}/quotes/:numero/accept → el worker crea el pedido borrador y marca
 * la cotización como aceptada. Actualización optimista del DOM: el resto del dashboard es
 * server-rendered estático, así que no recargamos la página por una sola fila.
 */
(function () {
  'use strict';
  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('[data-accept-quote]');
    if (!btn) return;
    var wrap = btn.closest('[data-endpoint]');
    var endpoint = ((wrap && wrap.dataset.endpoint) || '').replace(/\/$/, '');
    var customerId = wrap && wrap.dataset.customerId;
    if (!endpoint) return;

    var original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generando pedido…';

    try {
      var res = await fetch(endpoint + '/quotes/' + encodeURIComponent(btn.dataset.quoteNumero) + '/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, token: btn.dataset.quoteToken })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'brenson_quote_accept', numero: btn.dataset.quoteNumero });
      var row = btn.closest('[data-quote-row]');
      var estadoCell = row && row.querySelector('[data-quote-estado]');
      if (estadoCell) estadoCell.innerHTML = '<span class="brenson-status brenson-status--ok">Aceptada</span>';
      btn.remove();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = original;
      alert('No pudimos procesar la aceptación. Intente de nuevo o escríbanos por WhatsApp.');
    }
  });
})();
