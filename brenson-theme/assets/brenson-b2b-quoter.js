/**
 * <brenson-quoter> — Módulo 08. Cotizador de flota.
 * Cálculo SOLO informativo en cliente; el oficial lo hace brenson-services (/quote) con Admin API.
 * Persistencia del borrador en localStorage por cliente. Duplicar: ?duplicar=COT-xxxx (pide al backend los ítems).
 */
(function () {
  'use strict';
  var fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

  class BrensonQuoter extends HTMLElement {
    connectedCallback() {
      this.discount = parseFloat(this.dataset.discount) || 0;
      this.nextMin = parseInt(this.dataset.nextMin, 10) || 0;
      this.endpoint = (this.dataset.endpoint || '').replace(/\/$/, '');
      this.storageKey = 'brenson_quote_draft_' + (this.dataset.customerId || 'anon');
      this.validez = parseInt((this.querySelector('[data-q-validez].is-active') || {}).dataset?.qValidez, 10) || 15;
      this.items = Array.from(this.querySelectorAll('[data-q-item]')).map((row) => this.initRow(row));
      this.addEventListener('click', (e) => this.onClick(e));
      this.addEventListener('input', (e) => this.onInput(e));
      var search = this.querySelector('[data-q-search]');
      if (search) search.addEventListener('input', () => this.filter());
      this.restore();
      this.render();
    }

    initRow(row) {
      var sel = row.querySelector('[data-q-variant]');
      var item = {
        row, handle: row.dataset.handle, title: row.dataset.title, cat: row.dataset.cat,
        min: parseInt(row.dataset.min, 10) || 1, discount: parseFloat(row.dataset.discount) || this.discount,
        qty: 0, sel,
        get variantId() { return sel.value; },
        get variantTitle() { return sel.selectedOptions[0].textContent.split('·')[0].trim(); },
        get price() { return parseInt(sel.selectedOptions[0].dataset.price, 10) / 100; },
        get sku() { return sel.selectedOptions[0].dataset.sku || ''; }
      };
      sel.addEventListener('change', () => this.render());
      return item;
    }

    onClick(e) {
      var inc = e.target.closest('[data-q-inc]'), dec = e.target.closest('[data-q-dec]');
      if (inc || dec) {
        var row = e.target.closest('[data-q-item]'); var it = this.items.find((i) => i.row === row);
        if (inc) it.qty = it.qty === 0 ? it.min : it.qty + 1;
        if (dec) it.qty = it.qty <= it.min ? 0 : it.qty - 1;
        it.row.querySelector('[data-q-qty]').value = it.qty;
        this.render(); return;
      }
      var cat = e.target.closest('[data-q-cat]');
      if (cat) { this.querySelectorAll('[data-q-cat]').forEach((c) => c.classList.toggle('is-active', c === cat)); this.filter(); return; }
      var val = e.target.closest('[data-q-validez]');
      if (val) { this.validez = parseInt(val.dataset.qValidez, 10); this.querySelectorAll('[data-q-validez]').forEach((c) => c.classList.toggle('is-active', c === val)); return; }
      if (e.target.closest('[data-q-pdf]')) this.submit('enviada');
      if (e.target.closest('[data-q-draft]')) this.submit('borrador');
    }

    onInput(e) {
      var q = e.target.closest('[data-q-qty]');
      if (!q) return;
      var row = e.target.closest('[data-q-item]'); var it = this.items.find((i) => i.row === row);
      var n = parseInt(q.value, 10) || 0;
      if (n > 0 && n < it.min) n = it.min;
      it.qty = n; q.value = n; this.render();
    }

    filter() {
      var cat = (this.querySelector('[data-q-cat].is-active') || {}).dataset?.qCat || '';
      var q = ((this.querySelector('[data-q-search]') || {}).value || '').toLowerCase();
      this.items.forEach((it) => { it.row.hidden = (cat && it.cat !== cat) || (q && !it.title.toLowerCase().includes(q)); });
    }

    compute() {
      var lines = this.items.filter((i) => i.qty > 0).map((i) => {
        var unitB2b = Math.round(i.price * (1 - i.discount / 100));
        return { handle: i.handle, title: i.title, variant_id: i.variantId, variant: i.variantTitle, sku: i.sku, cantidad: i.qty, precio_publico: i.price, descuento_pct: i.discount, precio_unitario: unitB2b, subtotal: unitB2b * i.qty, subtotal_publico: i.price * i.qty };
      });
      var subPublic = lines.reduce((a, l) => a + l.subtotal_publico, 0);
      var total = lines.reduce((a, l) => a + l.subtotal, 0);
      var units = lines.reduce((a, l) => a + l.cantidad, 0);
      return { lines, subPublic, total, discount: subPublic - total, units };
    }

    render() {
      var r = this.compute();
      this.items.forEach((i) => {
        var unitB2b = Math.round(i.price * (1 - i.discount / 100));
        i.row.querySelector('[data-q-public]').textContent = fmt.format(i.price);
        i.row.querySelector('[data-q-b2b]').textContent = fmt.format(unitB2b) + ' /u';
        i.row.querySelector('[data-q-subtotal]').textContent = i.qty > 0 ? 'Subtotal ' + fmt.format(unitB2b * i.qty) : 'No agregado';
      });
      var linesEl = this.querySelector('[data-q-lines]');
      linesEl.innerHTML = r.lines.length ? r.lines.map((l) => '<div><span>' + l.cantidad + ' × ' + l.title + '<br><small class="brenson-muted">' + l.variant + ' · ' + fmt.format(l.precio_unitario) + ' c/u</small></span><strong class="brenson-num">' + fmt.format(l.subtotal) + '</strong></div>').join('') : '<p class="brenson-muted">Agregue vehículos para ver el resumen.</p>';
      this.querySelector('[data-q-sub-public]').textContent = r.lines.length ? fmt.format(r.subPublic) : '—';
      this.querySelector('[data-q-discount]').textContent = r.lines.length ? '− ' + fmt.format(r.discount) : '—';
      this.querySelector('[data-q-units]').textContent = r.units;
      this.querySelector('[data-q-total]').textContent = r.lines.length ? fmt.format(r.total) : '—';
      var pdf = this.querySelector('[data-q-pdf]'), draft = this.querySelector('[data-q-draft]');
      if (pdf) pdf.disabled = !r.lines.length; if (draft) draft.disabled = !r.lines.length;
      var prog = this.querySelector('[data-q-progress]'), progText = this.querySelector('[data-q-progress-text]');
      if (prog && this.nextMin) {
        var pct = Math.min(100, Math.round(r.units / this.nextMin * 100));
        prog.style.width = pct + '%';
        var faltan = Math.max(0, this.nextMin - r.units);
        progText.textContent = r.units + ' / ' + this.nextMin + ' unidades' + (faltan > 0 ? ' · faltan ' + faltan + ' para el siguiente tier' : ' · ¡alcanzó el siguiente tier! El asesor confirmará el recálculo');
      }
      this.save();
    }

    save() { try { localStorage.setItem(this.storageKey, JSON.stringify(this.items.filter((i) => i.qty > 0).map((i) => ({ h: i.handle, q: i.qty, v: i.variantId })))); } catch (e) {} }
    restore() {
      try {
        var saved = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        saved.forEach((s) => { var it = this.items.find((i) => i.handle === s.h); if (it) { it.qty = s.q; it.sel.value = s.v; it.row.querySelector('[data-q-qty]').value = s.q; } });
      } catch (e) {}
    }

    async submit(estado) {
      var r = this.compute();
      var payload = {
        estado, customer_id: this.dataset.customerId, email: this.dataset.customerEmail, empresa: this.dataset.empresa,
        tier: this.dataset.tier, descuento_pct: this.discount, validez_dias: this.validez,
        observaciones: (this.querySelector('[data-q-notes]') || {}).value || '',
        items: r.lines, totales_cliente: { subtotal_publico: r.subPublic, descuento: r.discount, total: r.total, unidades: r.units }
      };
      var ok = this.querySelector('[data-q-success]'), err = this.querySelector('[data-q-error]'), status = this.querySelector('[data-q-status]');
      var btn = this.querySelector('[data-q-pdf]'); btn.disabled = true; btn.textContent = 'Generando…';
      try {
        if (this.endpoint) {
          var res = await fetch(this.endpoint + '/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          var data = await res.json();
          if (data.pdf_url && estado === 'enviada') window.open(data.pdf_url, '_blank', 'noopener');
          ok.textContent = 'Cotización ' + (data.numero || '') + ' generada. Revise su correo.';
        } else {
          console.info('[brenson] cotización (simulación):', payload);
          if (estado === 'enviada') this.printPreview(payload);
          ok.textContent = estado === 'enviada' ? 'Cotización de demostración generada (sin backend configurado).' : 'Borrador guardado en este navegador.';
        }
        ok.hidden = false; err.hidden = true;
        status.textContent = estado === 'enviada' ? 'Enviada' : 'Borrador'; status.className = 'brenson-status ' + (estado === 'enviada' ? 'brenson-status--ok' : 'brenson-status--pending');
        window.dataLayer = window.dataLayer || []; window.dataLayer.push({ event: 'brenson_quote_' + (estado === 'enviada' ? 'pdf' : 'draft'), unidades: r.units, total: r.total, tier: this.dataset.tier });
        if (estado === 'enviada') { try { localStorage.removeItem(this.storageKey); } catch (e) {} }
      } catch (ex) { err.hidden = false; }
      finally { btn.disabled = false; btn.textContent = 'Generar cotización PDF'; }
    }

    printPreview(p) {
      var w = window.open('', '_blank');
      if (!w) return;
      var rows = p.items.map((l) => '<tr><td>' + l.cantidad + '</td><td>' + l.title + '<br><small>' + l.variant + '</small></td><td style="text-align:right">' + fmt.format(l.precio_publico) + '</td><td style="text-align:right">' + fmt.format(l.precio_unitario) + '</td><td style="text-align:right">' + fmt.format(l.subtotal) + '</td></tr>').join('');
      w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cotización Brenson — borrador</title><style>body{font-family:Montserrat,Arial,sans-serif;padding:32px;color:#050709}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{padding:8px;border-bottom:1px solid #e3e5e8;font-size:14px}th{text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280}.tot{font-size:24px;font-weight:800}.mock{background:#fef3c7;padding:8px 12px;border-radius:8px;font-size:12px}</style></head><body><p class="mock">DOCUMENTO DE DEMOSTRACIÓN — el PDF oficial lo genera brenson-services con firma y numeración.</p><h1>Brenson Empresas · Cotización de flota</h1><p>' + p.empresa + ' · Tier ' + p.tier + ' (' + p.descuento_pct + ' %) · Validez ' + p.validez_dias + ' días · ' + new Date().toLocaleDateString('es-CO') + '</p><table><thead><tr><th>Cant.</th><th>Vehículo</th><th>Precio público</th><th>Precio corporativo</th><th>Subtotal</th></tr></thead><tbody>' + rows + '</tbody></table><p style="text-align:right">Subtotal público ' + fmt.format(p.totales_cliente.subtotal_publico) + '<br>Descuento − ' + fmt.format(p.totales_cliente.descuento) + '<br><span class="tot">Total ' + fmt.format(p.totales_cliente.total) + '</span><br><small>IVA incluido</small></p><p><strong>Observaciones:</strong> ' + (p.observaciones || '—') + '</p><script>window.print()<\/script></body></html>');
      w.document.close();
    }
  }
  if (!customElements.get('brenson-quoter')) customElements.define('brenson-quoter', BrensonQuoter);
})();