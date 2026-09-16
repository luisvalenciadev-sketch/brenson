(function () {
  var KEY = 'brenson_wishlist';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function write(ids) {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (e) {}
  }
  function paint() {
    var ids = read();
    document.querySelectorAll('[data-brenson-wishlist-toggle]').forEach(function (btn) {
      var id = btn.getAttribute('data-brenson-wishlist-toggle');
      var active = ids.indexOf(id) !== -1;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-brenson-wishlist-toggle]');
    if (!btn) return;
    e.preventDefault();
    var id = btn.getAttribute('data-brenson-wishlist-toggle');
    var ids = read();
    var idx = ids.indexOf(id);
    if (idx === -1) ids.push(id); else ids.splice(idx, 1);
    write(ids);
    paint();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paint);
  } else {
    paint();
  }
})();
