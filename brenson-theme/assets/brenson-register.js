/**
 * brenson-register.js — Módulo 07
 * - Valida NIT colombiano (dígito de verificación DIAN).
 * - Registro corporativo: serializa los datos de empresa en customer[note] (JSON) antes de enviar el form nativo de Shopify.
 * - Conversión de cuenta personal → corporativa: POST {endpoint}/b2b/request (o simulación).
 * - Subida de documento: POST {endpoint}/upload multipart (o simulación).
 */
(function () {
  'use strict';

  // Dígito de verificación DIAN
  var PRIMES = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  function dvNit(nit) {
    var digits = String(nit).replace(/\D/g, '');
    if (digits.length < 9) return null;
    var sum = 0;
    for (var i = 0; i < digits.length; i++) sum += parseInt(digits[digits.length - 1 - i], 10) * PRIMES[i];
    var r = sum % 11;
    return r > 1 ? 11 - r : r;
  }

  function collect(root) {
    var d = {};
    root.querySelectorAll('[data-b2b]').forEach(function (el) { d[el.dataset.b2b] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    var radio = root.querySelector('[data-b2b-radio]:checked');
    if (radio) d[radio.dataset.b2bRadio] = parseInt(radio.value, 10);
    if (d.nit && d.dv) d.nit_completo = d.nit + '-' + d.dv;
    d.tipo_cliente = 'empresa';
    d.ts = new Date().toISOString();
    return d;
  }

  function validateNit(root) {
    var nit = root.querySelector('[data-b2b="nit"]'), dv = root.querySelector('[data-b2b="dv"]'), hint = root.querySelector('[data-b2b-nit-hint]');
    if (!nit || !dv) return true;
    var expected = dvNit(nit.value);
    var ok = expected !== null && String(expected) === dv.value.trim();
    if (hint) { hint.textContent = ok ? 'NIT válido.' : (expected === null ? 'Ingrese los 9 o 10 dígitos del NIT.' : 'El dígito de verificación no coincide.'); hint.style.color = ok ? 'var(--brenson-certificado)' : 'var(--brenson-error)'; }
    dv.setCustomValidity(ok ? '' : 'Dígito de verificación inválido');
    return ok;
  }

  function track(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var p = Object.assign({ event: 'brenson_' + event }, extra || {});
    window.dataLayer.push(p);
    document.dispatchEvent(new CustomEvent('brenson:track', { detail: p }));
  }

  // Registro nuevo (form nativo Shopify)
  document.querySelectorAll('[data-brenson-b2b-register]').forEach(function (form) {
    ['[data-b2b="nit"]', '[data-b2b="dv"]'].forEach(function (s) { var el = form.querySelector(s); if (el) el.addEventListener('input', function () { validateNit(form); }); });
    form.addEventListener('submit', function (e) {
      if (!validateNit(form)) { e.preventDefault(); return; }
      var data = collect(form);
      delete data.acepta;
      var note = form.querySelector('[data-b2b-note]');
      if (note) note.value = 'B2B ' + JSON.stringify(data);
      track('b2b_request', { sector: data.sector, flota: data.flota_estimada, via: 'register' });
      // El form sigue su envío nativo a Shopify; Flow detecta el tag b2b-pendiente.
    });
  });

  // Conversión de cuenta personal existente
  document.querySelectorAll('[data-brenson-b2b-convert]').forEach(function (form) {
    ['[data-b2b="nit"]', '[data-b2b="dv"]'].forEach(function (s) { var el = form.querySelector(s); if (el) el.addEventListener('input', function () { validateNit(form); }); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validateNit(form)) return;
      var data = collect(form);
      data.customer_id = form.dataset.customerId; data.email = form.dataset.customerEmail;
      var ok = form.querySelector('[data-b2b-success]'), err = form.querySelector('[data-b2b-error]'), btn = form.querySelector('[data-b2b-submit]');
      var endpoint = (form.dataset.endpoint || '').replace(/\/$/, '');
      if (btn) btn.disabled = true;
      try {
        if (endpoint) {
          var res = await fetch(endpoint + '/b2b/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        } else {
          console.info('[brenson] solicitud B2B (simulación):', data);
        }
        track('b2b_request', { sector: data.sector, flota: data.flota_estimada, via: 'convert' });
        ok.hidden = false; err.hidden = true;
      } catch (ex) { err.hidden = false; if (btn) btn.disabled = false; }
    });
  });

  // Subida de documento
  document.querySelectorAll('[data-brenson-b2b-upload]').forEach(function (box) {
    var btn = box.querySelector('[data-upload-submit]'), file = box.querySelector('[data-upload-file]'), type = box.querySelector('[data-upload-type]');
    var ok = box.querySelector('[data-upload-success]'), err = box.querySelector('[data-upload-error]');
    var endpoint = (box.dataset.endpoint || '').replace(/\/$/, '');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var f = file.files && file.files[0];
      if (!f) { file.focus(); return; }
      if (f.size > 5 * 1024 * 1024) { err.hidden = false; err.textContent = 'El archivo supera 5 MB.'; return; }
      btn.disabled = true; btn.textContent = 'Subiendo…';
      try {
        if (endpoint) {
          var fd = new FormData();
          fd.append('file', f); fd.append('tipo', type.value); fd.append('customer_id', box.dataset.customerId || ''); fd.append('email', box.dataset.customerEmail || '');
          var res = await fetch(endpoint + '/upload', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        } else {
          console.info('[brenson] upload (simulación):', f.name, type.value);
        }
        track('b2b_document_upload', { tipo: type.value });
        ok.hidden = false; err.hidden = true; btn.textContent = 'Adjuntado';
      } catch (ex) { err.hidden = false; btn.disabled = false; btn.textContent = 'Adjuntar'; }
    });
  });
})();