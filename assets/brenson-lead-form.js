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
    var t = form.querySelector('[name="cf-turnstile-response"]');
    if (t) data.turnstile = t.value;
    return data;
  }

  function track(payload) {
    window.dataLayer = window.dataLayer || [];
    var p = { event: 'brenson_lead_submit', tipo: payload.tipo, vehiculo: payload.vehiculo, uso: payload.uso, cantidad: payload.cantidad, prueba: payload.prueba_modalidad };
    window.dataLayer.push(p);
    document.dispatchEvent(new CustomEvent('brenson:track', { detail: p }));
  }

  function setupTestDrive(form) {
    var wrap = form.querySelector('[data-lead-testdrive]');
    if (!wrap) return;
    var hidden = wrap.querySelector('[name="contact[prueba_modalidad]"]');
    var fields = wrap.querySelector('[data-testdrive-fields]');
    var city = wrap.querySelector('[data-testdrive-city]');
    var sedeHint = wrap.querySelector('[data-testdrive-sede-hint]');
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('[data-testdrive]');
      if (!b) return;
      var mode = b.dataset.testdrive;
      hidden.value = mode;
      wrap.querySelectorAll('[data-testdrive]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      fields.hidden = mode === 'no';
      city.hidden = mode !== 'domicilio';
      sedeHint.hidden = mode !== 'sede';
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

    form.addEventListener('submit', async function (e) {
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
        var res = await fetch(endpoint + '/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        track(payload);
        ok.hidden = false; err.hidden = true;
        form.querySelectorAll('input:not([type=hidden]), select').forEach(function (el) { el.disabled = true; });
      } catch (ex) {
        console.warn('[brenson] lead fallback a formulario nativo:', ex);
        // Respaldo: envío nativo de Shopify (contact form) para no perder el lead
        form.removeEventListener('submit', arguments.callee);
        HTMLFormElement.prototype.submit.call(form);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || btn.textContent; }
      }
    });
  }

  document.querySelectorAll('[data-brenson-lead-form]').forEach(init);
})();