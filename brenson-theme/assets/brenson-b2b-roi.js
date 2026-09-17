/**
 * brenson-b2b-roi — Simulador de TCO de la página /pages/empresas-beneficios.
 * Recalcula el costo anual de flota a combustión vs. eléctrica según el número de unidades.
 * Sin JS la sección ya viene renderizada con el valor por defecto desde Liquid.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-b2b-roi]');
  if (!root) return;

  var input = root.querySelector('[data-roi-input]');
  if (!input) return;

  var gasUnidad = parseInt(root.dataset.gasUnidad, 10) || 0;
  var eleUnidad = parseInt(root.dataset.eleUnidad, 10) || 0;

  var salidaGas = root.querySelector('[data-roi-gas]');
  var salidaEle = root.querySelector('[data-roi-ele]');
  var salidaAhorro = root.querySelector('[data-roi-ahorro]');
  var salidasUnidades = root.querySelectorAll('[data-roi-unidades]');

  var formato;
  try {
    formato = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    });
  } catch (e) {
    formato = null;
  }

  function money(valor) {
    if (formato) return formato.format(valor);
    return '$ ' + String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function actualizar() {
    var unidades = parseInt(input.value, 10) || 0;
    var gas = gasUnidad * unidades;
    var ele = eleUnidad * unidades;

    if (salidaGas) salidaGas.textContent = money(gas);
    if (salidaEle) salidaEle.textContent = money(ele);
    if (salidaAhorro) salidaAhorro.textContent = '+' + money(gas - ele);

    for (var i = 0; i < salidasUnidades.length; i++) {
      salidasUnidades[i].textContent = String(unidades);
    }
  }

  input.addEventListener('input', actualizar);
  actualizar();
})();
