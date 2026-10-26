/**
 * brenson-lead-form.js — Módulo 09
 * Envía el lead a brenson-services (POST {endpoint}/lead). Si no hay endpoint configurado
 * (modo simulación S10) muestra éxito local y registra en consola. Si el fetch falla,
 * deja que el formulario nativo de Shopify (contact form) haga el envío tradicional.
 * Escucha brenson:financing-request para precargar la simulación (decisión C6).
 */
(function () {
  'use strict';

  function collect(form) {
    var data = {};
    form.querySelectorAll('[data-name]').forEach(function (el) {
      if (el.type === 'checkbox') data[el.dataset.name] = el.checked;
      else data[el.dataset.name] = el.value;
    });
    data.honeypot = (form.querySelector('[name="contact[website]"]') || {}).value || '';
    data.page = location.href;
    data.ts = new Date().toISOString();
    return data;
  }

  function track(payload) {
    window.dataLayer = window.dataLayer || [];
    var p = { event: 'brenson_lead_submit', tipo: payload.tipo, vehiculo: payload.vehiculo, uso: payload.uso, cantidad: payload.cantidad, prueba: payload.prueba_modalidad };
    window.dataLayer.push(p);
    document.dispatchEvent(new CustomEvent('brenson:track', { detail: p }));
  }

  // Fecha de hoy en Colombia (UTC−5, sin horario de verano), en el formato del input date.
  function todayCO() {
    return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  }

  // Una cita no puede quedar antes de hoy: min en el control + mensaje visible al salir del campo.
  function setupDate(input) {
    if (!input) return;
    var msg = input.parentNode.querySelector('[data-date-error]');
    input.min = todayCO();
    var check = function () {
      var bad = input.value && input.value < input.min;
      input.setCustomValidity(bad ? 'Elige una fecha a partir de hoy.' : '');
      input.setAttribute('aria-invalid', String(!!bad));
      if (msg) msg.hidden = !bad;
      return !bad;
    };
    input.addEventListener('change', check);
    input.addEventListener('blur', check);
    input.addEventListener('focus', function () { input.min = todayCO(); });
    input.brensonCheck = check;
  }

  function setupTestDrive(form) {
    var wrap = form.querySelector('[data-lead-testdrive]');
    if (!wrap) return;
    var hidden = wrap.querySelector('[name="contact[prueba_modalidad]"]');
    var fields = wrap.querySelector('[data-testdrive-fields]');
    var city = wrap.querySelector('[data-testdrive-city]');
    var sedeHint = wrap.querySelector('[data-testdrive-sede-hint]');
    var date = wrap.querySelector('input[type="date"]');
    setupDate(date);
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-testdrive]');
      if (!b) return;
      var mode = b.dataset.testdrive;
      hidden.value = mode;
      wrap.querySelectorAll('[data-testdrive]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      fields.hidden = mode === 'no';
      city.hidden = mode !== 'domicilio';
      sedeHint.hidden = mode !== 'sede';
      // Sin prueba de manejo no se envía fecha (y un valor oculto inválido bloquearía el envío).
      if (mode === 'no' && date) { date.value = ''; date.brensonCheck(); }
    });
  }

  function init(form) {
    setupTestDrive(form);
    var endpoint = (form.dataset.endpoint || '').replace(/\/$/, '');
    var ok = form.querySelector('[data-lead-success]');
    var err = form.querySelector('[data-lead-error]');
    var btn = form.querySelector('[data-lead-submit]');

    document.addEventListener('brenson:financing-request', function (e) {
      var d = e.detail || {};
      var set = function (n, v) { var el = form.querySelector('[data-name="' + n + '"]'); if (el) el.value = v; };
      set('tipo', 'financiamiento');
      if (d.vehiculo) set('vehiculo', d.vehiculo);
      set('simulacion', JSON.stringify(d));
      if (btn) btn.textContent = 'Solicitar financiamiento';
    });

    form.addEventListener('submit', async function onSubmit(e) {
      var fecha = form.querySelector('input[type="date"]');
      if (fecha && fecha.brensonCheck && !fecha.brensonCheck()) { e.preventDefault(); fecha.reportValidity(); return; }
      var payload = collect(form);
      if (payload.honeypot) { e.preventDefault(); return; }

      if (!endpoint) {
        // Modo simulación: no hay backend. Éxito local + log.
        e.preventDefault();
        console.info('[brenson] lead (simulación):', payload);
        track(payload);
        form.querySelectorAll('input:not([type=hidden]), select').forEach(function (el) { el.disabled = true; });
        if (btn) btn.disabled = true;
        ok.hidden = false;
        return;
      }

      e.preventDefault();
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Enviando…'; }
      try {
        if (window.brensonTurnstileToken) payload.turnstile = await window.brensonTurnstileToken(form);
        var res = await fetch(endpoint + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        // Un 4xx es un dato rechazado por la validación del servidor: se muestra y no se reenvía por el
        // formulario nativo, que se saltaría esa validación. El respaldo nativo queda para red y 5xx.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          var body = await res.json().catch(function () { return null; });
          err.textContent = (body && body.error) || 'Revisa los datos del formulario e intenta de nuevo.';
          err.hidden = false; ok.hidden = true;
          return;
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        track(payload);
        ok.hidden = false; err.hidden = true;
        form.querySelectorAll('input:not([type=hidden]), select').forEach(function (el) { el.disabled = true; });
      } catch (ex) {
        console.warn('[brenson] lead fallback a formulario nativo:', ex);
        // Respaldo: envío nativo de Shopify (contact form) para no perder el lead
        // Función con nombre: `arguments.callee` lanza TypeError en modo estricto y el respaldo nunca corría.
        form.removeEventListener('submit', onSubmit);
        HTMLFormElement.prototype.submit.call(form);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
      }
    });
  }

  document.querySelectorAll('[data-brenson-lead-form]').forEach(init);
})();