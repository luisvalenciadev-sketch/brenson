/**
 * brenson-reviews.js — Captura de reseñas de producto.
 * Abre el diálogo desde [data-brenson-review-open] y envía a {endpoint}/review. El worker crea la reseña
 * en borrador: el éxito solo se anuncia con el radicado que devuelve, y queda pendiente de moderación.
 */
(function () {
  'use strict';

  var dialog = document.getElementById('brenson-review-dialog');
  if (!dialog) return;
  var form = dialog.querySelector('[data-brenson-review-form]');
  var ok = form.querySelector('[data-review-success]');
  var err = form.querySelector('[data-review-error]');
  var btn = form.querySelector('[data-review-submit]');
  var endpoint = (form.dataset.endpoint || '').replace(/\/$/, '');

  function showError(msg) {
    err.textContent = msg;
    err.hidden = false;
    ok.hidden = true;
  }

  document.querySelectorAll('[data-brenson-review-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      var first = form.querySelector('input[name="calificacion"]');
      if (first) first.focus();
    });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    err.hidden = true;
    if (!form.querySelector('input[name="calificacion"]:checked')) { showError('Elige una calificación de 1 a 5 estrellas.'); return; }
    if (!form.reportValidity()) return;
    if (form.website && form.website.value) return;
    if (!endpoint) { showError('Las opiniones no están disponibles en este momento.'); return; }

    var data = {
      product_id: form.dataset.productId,
      calificacion: Number(form.querySelector('input[name="calificacion"]:checked').value),
      nombre: form.nombre.value,
      ciudad: form.ciudad.value,
      titulo: form.titulo.value,
      texto: form.texto.value,
      email: form.email.value,
      acepta: form.acepta.checked
    };

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Enviando…';
    try {
      if (window.brensonTurnstileToken) data.turnstile = await window.brensonTurnstileToken(form);
      var abort = new AbortController();
      var reloj = setTimeout(function () { abort.abort(); }, 20000);
      var res, body;
      try {
        res = await fetch(endpoint + '/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: abort.signal });
        body = await res.json().catch(function () { return null; });
      } finally { clearTimeout(reloj); }
      if (!res.ok || !body || !body.id) throw new Error((body && body.error) || '');

      form.querySelector('[data-review-id]').textContent = 'R-' + body.id;
      ok.hidden = false;
      form.querySelectorAll('input, textarea').forEach(function (el) { el.disabled = true; });
      btn.hidden = true;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'brenson_review_submit', calificacion: data.calificacion });
    } catch (ex) {
      showError((ex && ex.name === 'AbortError')
        ? 'El envío tardó demasiado. Verifica tu conexión e intenta de nuevo.'
        : (ex && ex.message) || 'No pudimos enviar tu opinión. Intenta de nuevo.');
    } finally {
      if (!btn.hidden) { btn.disabled = false; btn.textContent = label; }
    }
  });
})();
