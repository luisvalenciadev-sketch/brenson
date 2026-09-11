/**
 * brenson-quick-view.js — Módulo 02. Abre un <dialog> y carga la sección brenson-quick-view
 * del producto vía Section Rendering API (/products/{handle}?section_id=brenson-quick-view).
 * Botón: [data-brenson-quick-view="{handle}"] en card-product.
 */
(function () {
  'use strict';
  var dlg = document.querySelector('[data-brenson-qv]');
  if (!dlg || !('showModal' in dlg)) return;
  var body = dlg.querySelector('[data-brenson-qv-body]');
  var cache = {};

  async function open(handle, url) {
    body.innerHTML = '<div class="brenson-qv-modal__loading">Cargando…</div>';
    dlg.showModal();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'brenson_quick_view', handle: handle });
    try {
      if (!cache[handle]) {
        var res = await fetch((url || '/products/' + handle) + '?section_id=brenson-quick-view', { headers: { Accept: 'text/html' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var html = await res.text();
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var content = doc.querySelector('[data-brenson-qv-content]');
        cache[handle] = content ? content.outerHTML : null;
      }
      if (!cache[handle]) { location.href = url || '/products/' + handle; return; }
      body.innerHTML = cache[handle];
    } catch (e) {
      location.href = url || '/products/' + handle;
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-brenson-quick-view]');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    open(btn.dataset.brensonQuickView, btn.dataset.brensonQuickViewUrl);
  });
})();