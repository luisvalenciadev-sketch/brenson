/**
 * <brenson-simulator> — Módulo 05
 * Web Component sin dependencias. Calcula la cuota con sistema francés:
 *   cuota = P * i / (1 - (1 + i)^-n),  P = precio - inicial,  i = tasa mensual / 100
 * Sincroniza con el bloque de precio de la ficha ([data-brenson-price]) y con el cambio de variante de Dawn.
 * CTA: abre el formulario de lead (#brenson-lead-form) precargando vehículo, plazo, inicial y cuota (decisión C6),
 *      o si no existe, hace scroll al formulario de contacto.
 */
(function () {
  'use strict';

  var fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  function cuota(price, inicialPct, plazo, tasaPct) {
    var P = price * (1 - inicialPct / 100);
    var i = tasaPct / 100;
    if (plazo <= 0) return 0;
    if (i === 0) return P / plazo;
    var f = Math.pow(1 + i, plazo);
    return (P * i * f) / (f - 1);
  }

  function parseCOP(str) {
    var digits = String(str || '').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  class BrensonSimulator extends HTMLElement {
    connectedCallback() {
      this.tasa = parseFloat(this.dataset.tasa) || 1.9;
      this.plazo = parseInt(this.dataset.plazo, 10) || 36;
      this.inicial = parseInt(this.dataset.inicial, 10) || 10;
      // data-price viene en centavos (Shopify) cuando es producto
      this.price = this.dataset.price ? parseInt(this.dataset.price, 10) / 100 : 0;
      this.vehicleName = this.dataset.productTitle || '';
      this.vehicleHandle = this.dataset.productHandle || '';

      this.$cuota = this.querySelector('[data-sim-cuota]');
      this.$priceOut = this.querySelector('[data-sim-price-out]');
      this.$inicialOut = this.querySelector('[data-sim-inicial-out]');
      this.$principal = this.querySelector('[data-sim-principal]');
      this.$vehicleName = this.querySelector('[data-sim-vehicle-name]');
      this.$vehicleSel = this.querySelector('[data-sim-vehicle]');
      this.$priceInput = this.querySelector('[data-sim-price-input]');

      this.addEventListener('click', this.onClick.bind(this));
      if (this.$vehicleSel) this.$vehicleSel.addEventListener('change', this.onVehicle.bind(this));
      if (this.$priceInput) this.$priceInput.addEventListener('input', this.onPriceInput.bind(this));

      // Dawn dispara este evento al cambiar variante en la ficha
      document.addEventListener('variant:change', this.onVariant.bind(this));
      // Compatibilidad con publish/subscribe de Dawn (PUB_SUB_EVENTS.variantChange)
      if (window.subscribe && window.PUB_SUB_EVENTS && window.PUB_SUB_EVENTS.variantChange) {
        window.subscribe(window.PUB_SUB_EVENTS.variantChange, (e) => {
          var v = e && e.data && e.data.variant;
          if (v && v.price) { this.price = v.price / 100; this.render(); }
        });
      }
      // Enlaces "Simular otra cuota" del bloque de precio
      document.querySelectorAll('[data-brenson-open-simulator]').forEach((a) => {
        a.addEventListener('click', (ev) => { ev.preventDefault(); this.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      });

      this.render();
    }

    onVariant(e) {
      var v = e.detail && e.detail.variant;
      if (v && v.price) { this.price = v.price / 100; this.render(); }
    }

    onVehicle(e) {
      var opt = e.target.selectedOptions[0];
      if (!opt || !opt.value) return;
      this.price = parseInt(opt.value, 10) / 100;
      this.vehicleName = opt.textContent.split('·')[0].trim();
      this.vehicleHandle = opt.dataset.handle || '';
      if (this.$priceInput) this.$priceInput.value = new Intl.NumberFormat('es-CO').format(this.price);
      this.render();
    }

    onPriceInput(e) {
      this.price = parseCOP(e.target.value);
      if (this.$vehicleSel) this.$vehicleSel.value = '';
      this.vehicleName = 'Precio ingresado';
      this.vehicleHandle = '';
      this.render();
    }

    onClick(e) {
      var chip = e.target.closest('[data-sim-inicial]');
      if (chip) {
        this.inicial = parseInt(chip.dataset.simInicial, 10);
        this.querySelectorAll('[data-sim-inicial]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        this.render(); this.track('simulator_use'); return;
      }
      var tab = e.target.closest('[data-sim-plazo]');
      if (tab) {
        this.plazo = parseInt(tab.dataset.simPlazo, 10);
        this.querySelectorAll('[data-sim-plazo]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
        this.render(); this.track('simulator_use'); return;
      }
      if (e.target.closest('[data-sim-cta]')) this.requestFinancing();
      if (e.target.closest('[data-sim-addi]')) this.openAddiCheck();
    }

    openAddiCheck() {
      var r = this.compute();
      document.dispatchEvent(new CustomEvent('brenson:addi-check-open', { detail: { vehiculo: this.vehicleName, precio: r.price, contexto: 'b2c' } }));
      this.track('addi_check_open', { precio: r.price });
    }

    compute() {
      var c = this.price > 0 ? cuota(this.price, this.inicial, this.plazo, this.tasa) : 0;
      return {
        price: this.price,
        inicialMonto: this.price * this.inicial / 100,
        principal: this.price * (1 - this.inicial / 100),
        cuota: Math.round(c)
      };
    }

    render() {
      var r = this.compute();
      var has = r.price > 0;
      if (this.$cuota) this.$cuota.textContent = has ? fmt.format(r.cuota) : '—';
      if (this.$priceOut) this.$priceOut.textContent = has ? fmt.format(r.price) : '—';
      if (this.$inicialOut) this.$inicialOut.textContent = has ? fmt.format(r.inicialMonto) + ' (' + this.inicial + ' %)' : '—';
      if (this.$principal) this.$principal.textContent = has ? fmt.format(r.principal) : '—';
      if (this.$vehicleName && this.vehicleName) this.$vehicleName.textContent = this.vehicleName;

      // Sincroniza el bloque de precio de la ficha y la sticky bar del MISMO producto.
      // (Sin este filtro, un simulador de referencia embebido en una página con varias
      // tarjetas de producto —p. ej. el home— pisaría la cuota de todas con la suya.)
      document.querySelectorAll('[data-brenson-price]').forEach((block) => {
        if (this.vehicleHandle && block.dataset.brensonPriceHandle && block.dataset.brensonPriceHandle !== this.vehicleHandle) return;
        var out = block.querySelector('[data-brenson-cuota]');
        var terms = block.querySelector('[data-brenson-terms]');
        if (out && has) out.textContent = fmt.format(r.cuota);
        if (terms) terms.textContent = this.plazo + ' meses · ' + this.inicial + ' % de cuota inicial';
      });
    }

    requestFinancing() {
      var r = this.compute();
      var payload = {
        vehiculo: this.vehicleName, handle: this.vehicleHandle,
        precio: r.price, inicial_pct: this.inicial, plazo: this.plazo, cuota: r.cuota, tasa: this.tasa
      };
      this.track('financing_request', payload);
      document.dispatchEvent(new CustomEvent('brenson:financing-request', { detail: payload }));
      var form = document.getElementById('brenson-lead-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var set = (name, val) => { var el = form.querySelector('[name="' + name + '"]'); if (el) el.value = val; };
        set('tipo', 'financiamiento');
        set('vehiculo', payload.vehiculo);
        set('simulacion', JSON.stringify(payload));
      } else {
        var wa = document.querySelector('[data-brenson-wa-float]');
        if (wa) {
          var extra = encodeURIComponent(' Simulé una cuota de ' + fmt.format(r.cuota) + '/mes a ' + this.plazo + ' meses con ' + this.inicial + ' % inicial.');
          window.open(wa.href + extra, '_blank', 'noopener');
        }
      }
    }

    track(event, extra) {
      window.dataLayer = window.dataLayer || [];
      var p = Object.assign({ event: 'brenson_' + event, plazo: this.plazo, inicial_pct: this.inicial, vehiculo: this.vehicleName }, extra || {});
      window.dataLayer.push(p);
      document.dispatchEvent(new CustomEvent('brenson:track', { detail: p }));
    }
  }

  if (!customElements.get('brenson-simulator')) customElements.define('brenson-simulator', BrensonSimulator);
})();