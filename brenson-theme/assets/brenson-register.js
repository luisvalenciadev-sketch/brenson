/**
 * brenson-register.js — Módulo 07
 * - Valida NIT colombiano (dígito de verificación DIAN).
 * - Solicitud de acceso corporativo: POST {endpoint}/b2b/request (o simulación).
 *   Cuentas NUEVAS de cliente: el tema ya no puede crear cuentas con `form 'create_customer'`,
 *   así que el worker crea o actualiza el cliente por Admin API y devuelve customer_id +
 *   upload_token para habilitar el paso 2 sin recargar la página.
 *     modo "register" → visitante sin sesión (el worker crea la cuenta).
 *     modo "convert"  → cliente B2C con sesión que convierte su cuenta en corporativa.
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

  // Solicitud de acceso corporativo (registro nuevo o conversión de cuenta personal)
  document.querySelectorAll('[data-brenson-b2b-request]').forEach(function (form) {
    var mode = form.dataset.b2bMode === 'convert' ? 'convert' : 'register';
    ['[data-b2b="nit"]', '[data-b2b="dv"]'].forEach(function (s) { var el = form.querySelector(s); if (el) el.addEventListener('input', function () { validateNit(form); }); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!validateNit(form) || !form.reportValidity()) return;

      var data = collect(form);
      delete data.acepta;
      if (mode === 'convert') { data.customer_id = form.dataset.customerId; data.email = form.dataset.customerEmail; }

      var ok = form.querySelector('[data-b2b-success]'), err = form.querySelector('[data-b2b-error]');
      var btn = form.querySelector('[data-b2b-submit]'), legal = form.querySelector('[data-b2b-legal]');
      var endpoint = (form.dataset.endpoint || '').replace(/\/$/, '');
      if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
      err.hidden = true;

      try {
        var body = null;
        if (endpoint) {
          var res = await fetch(endpoint + '/b2b/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
          body = await res.json().catch(function () { return null; });
          // El worker manda un mensaje en español listo para mostrar (cupo excedido, correo inválido…).
          if (!res.ok) throw new Error((body && body.error) || '');
        } else {
          // Modo simulación (sin URL de servicio configurada): no hay cuenta real que crear.
          console.info('[brenson] solicitud B2B (simulación):', data);
          body = { customer_id: form.dataset.customerId || 'simulado' };
        }
        track('b2b_request', { sector: data.sector, flota: data.flota_estimada, via: mode });

        // Esa empresa ya está habilitada: no tiene sentido pedirle el documento otra vez.
        if (body && body.ya_aprobado) { window.location.href = form.dataset.loginUrl || '/pages/empresas'; return; }

        revealStepTwo(form, body);
        ok.hidden = false;
        if (legal) legal.hidden = true;
        ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (ex) {
        err.textContent = (ex && ex.message) || 'No pudimos enviar la solicitud. Escríbanos por WhatsApp o intente de nuevo.';
        err.hidden = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Enviar solicitud de acceso corporativo'; }
      }
    });
  });

  /**
   * Tras crear/actualizar el cliente: bloquea los campos ya enviados, oculta el aviso del paso 2
   * y revela la caja de subida con el customer_id y el token que devolvió el worker.
   */
  function revealStepTwo(form, body) {
    var btn = form.querySelector('[data-b2b-submit]');
    if (btn) { btn.hidden = true; btn.disabled = true; }
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (!el.closest('[data-b2b-doc-slot]')) el.readOnly = el.disabled = true;
    });

    var link = form.querySelector('[data-b2b-login-link]');
    if (link && form.dataset.loginUrl) link.href = form.dataset.loginUrl;

    var placeholder = form.querySelector('[data-b2b-doc-placeholder]');
    if (placeholder) placeholder.hidden = true;

    var slot = form.querySelector('[data-b2b-doc-slot]');
    if (!slot) return;
    var box = slot.querySelector('[data-brenson-b2b-upload]');
    if (box && body) {
      if (body.customer_id) box.dataset.customerId = body.customer_id;
      if (body.upload_token) box.dataset.uploadToken = body.upload_token;
      if (body.email) box.dataset.customerEmail = body.email;
    }
    slot.hidden = false;
  }

  // Subida de documento (paso 2). El token lo emite /b2b/request y ata el archivo a ese cliente.
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
          if (box.dataset.uploadToken) fd.append('token', box.dataset.uploadToken);
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