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

  /* ── Borrador de propuesta B2B (barra fija) ──────────────────────────────
     Solo acumula la intención de cotizar: el precio corporativo exige NIT
     validado, así que la barra lleva al flujo de acceso, no a un carrito. */
  var barra = root.querySelector('[data-flota-barra]');
  var conteo = root.querySelector('[data-flota-conteo]');
  var limpiar = root.querySelector('[data-flota-limpiar]');
  var añadir = root.querySelectorAll('[data-flota-add]');
  if (!barra || !conteo || !añadir.length) return;

  var seleccion = [];

  function pintarBarra() {
    conteo.textContent = String(seleccion.length);
    barra.hidden = seleccion.length === 0;

    for (var i = 0; i < añadir.length; i++) {
      var elegido = seleccion.indexOf(añadir[i].dataset.titulo) !== -1;
      añadir[i].textContent = elegido ? 'Quitar de la propuesta' : 'Cotizar modelo';
      añadir[i].classList.toggle('brenson-btn--primary', !elegido);
      añadir[i].classList.toggle('brenson-btn--outline', elegido);
    }
  }

  for (var m = 0; m < añadir.length; m++) {
    añadir[m].addEventListener('click', function (evento) {
      var titulo = evento.currentTarget.dataset.titulo;
      var pos = seleccion.indexOf(titulo);
      if (pos === -1) seleccion.push(titulo);
      else seleccion.splice(pos, 1);
      pintarBarra();
    });
  }

  if (limpiar) {
    limpiar.addEventListener('click', function () {
      seleccion = [];
      pintarBarra();
    });
  }

  pintarBarra();
})();
