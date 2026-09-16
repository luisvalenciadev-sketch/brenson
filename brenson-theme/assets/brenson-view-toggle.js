(function () {
  function init() {
    var toggle = document.querySelector('[data-brenson-view-toggle]');
    if (!toggle) return;
    var wrapper = document.querySelector('.facets-vertical');
    if (!wrapper) return;

    var saved = 'grid';
    try { saved = localStorage.getItem('brenson_catalog_view') || 'grid'; } catch (e) {}
    apply(saved);

    toggle.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-view]');
      if (!btn) return;
      apply(btn.dataset.view);
      try { localStorage.setItem('brenson_catalog_view', btn.dataset.view); } catch (e) {}
    });

    function apply(view) {
      wrapper.classList.toggle('brenson-view--list', view === 'list');
      document.querySelectorAll('#product-grid .card').forEach(function (card) {
        card.classList.toggle('card--horizontal', view === 'list');
      });
      toggle.querySelectorAll('[data-view]').forEach(function (b) {
        b.classList.toggle('is-active', b.dataset.view === view);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
