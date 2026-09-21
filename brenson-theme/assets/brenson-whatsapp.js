/**
 * brenson-whatsapp.js — Módulo 10
 * - Calcula estado en línea / fuera de horario (hora de Colombia, UTC-5, sin DST).
 * - El evento de analytics de clic (data-brenson-track="whatsapp_click") lo emite brenson-datalayer.liquid.
 * Sin dependencias.
 */
(function () {
  'use strict';

  function parseRange(str) {
    if (!str) return null;
    var m = String(str).trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return { start: +m[1] * 60 + +m[2], end: +m[3] * 60 + +m[4] };
  }

  function bogotaNow() {
    // America/Bogota es UTC-5 todo el año.
    var now = new Date();
    var utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    var day = now.getUTCDay();
    var local = utcMinutes - 300;
    if (local < 0) { local += 1440; day = (day + 6) % 7; }
    return { day: day, minutes: local };
  }

  function isOpen(el) {
    var t = bogotaNow();
    var range;
    if (t.day === 0) range = parseRange(el.dataset.horarioDomingo);
    else if (t.day === 6) range = parseRange(el.dataset.horarioSabado);
    else range = parseRange(el.dataset.horarioSemana);
    if (!range) return false;
    return t.minutes >= range.start && t.minutes < range.end;
  }

  function updateStatus() {
    document.querySelectorAll('[data-brenson-wa-float]').forEach(function (el) {
      var open = isOpen(el);
      el.dataset.status = open ? 'open' : 'closed';
      var s = el.querySelector('[data-brenson-wa-status]');
      if (s) s.textContent = open ? el.dataset.labelOnline : el.dataset.labelClosed;
    });
  }

  // El evento brenson_whatsapp_click lo emite el listener genérico de snippets/brenson-datalayer.liquid.
  updateStatus();
  setInterval(updateStatus, 60000);
})();