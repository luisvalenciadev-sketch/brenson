/**
 * brenson-b2b-flotas — Filtro por categoría de la gama industrial (/pages/empresas-flotas).
 * Progresivo: sin JS la página muestra todas las unidades y los chips no se renderizan como activos.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-b2b-flotas]');
  if (!root) return;

  var chips = root.querySelectorAll('[data-flota-filtro]');
  var tarjetas = root.querySelectorAll('[data-flota-cat]');
  var vacio = root.querySelector('[data-flota-vacio]');
  if (!chips.length || !tarjetas.length) return;

  function filtrar(categoria) {
    var visibles = 0;

    for (var i = 0; i < tarjetas.length; i++) {
      var coincide = categoria === 'todas' || tarjetas[i].dataset.flotaCat === categoria;
      tarjetas[i].hidden = !coincide;
      if (coincide) visibles++;
    }

    for (var j = 0; j < chips.length; j++) {
      var activo = chips[j].dataset.flotaFiltro === categoria;
      chips[j].classList.toggle('is-active', activo);
      chips[j].setAttribute('aria-pressed', activo ? 'true' : 'false');
    }

    if (vacio) vacio.hidden = visibles > 0;
  }

  for (var k = 0; k < chips.length; k++) {
    chips[k].addEventListener('click', function (evento) {
      filtrar(evento.currentTarget.dataset.flotaFiltro);
    });
  }
})();
