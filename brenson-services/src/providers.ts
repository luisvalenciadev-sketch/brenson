/**
 * Proveedores intercambiables por variable de entorno (S10, S16).
 * Cada uno tiene una implementación mock que funciona sin cuentas externas.
 */
import type { Env, Lead, Providers } from './types';

export function getProviders(env: Env): Providers {
  return {
    crm: env.CRM_PROVIDER === 'ghl' && env.GHL_WEBHOOK_URL ? ghlCrm(env) : mockCrm(env),
    mail: env.MAIL_PROVIDER === 'resend' && env.RESEND_API_KEY ? resendMail(env) : consoleMail(env),
    pdf: env.PDF_PROVIDER === 'pdfmonkey' && env.PDFMONKEY_API_KEY ? pdfMonkey(env) : htmlPdf(env),
    storage: env.STORAGE_PROVIDER === 'r2' && env.DOCS ? r2Storage(env) : localStorage_(env)
  };
}

/* ---------- CRM ---------- */
// Mock: guarda el lead en KV (lista por día) y lo imprime. Cuando exista GHL, CRM_PROVIDER=ghl.
function mockCrm(env: Env): Providers['crm'] {
  return {
    async upsertLead(l: Lead) {
      const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.info('[crm:mock] lead', id, JSON.stringify(l));
      if (env.KV) await env.KV.put(`leads:${new Date().toISOString().slice(0, 10)}:${id}`, JSON.stringify(l), { expirationTtl: 60 * 60 * 24 * 90 });
      return { id };
    },
    async event(e) { console.info('[crm:mock] event', JSON.stringify(e)); if (env.KV) await env.KV.put(`events:${Date.now()}`, JSON.stringify(e), { expirationTtl: 60 * 60 * 24 * 30 }); }
  };
}

// GoHighLevel vía Inbound Webhook (Workflows → Trigger "Inbound Webhook"). Mapea campos custom del contacto.
function ghlCrm(env: Env): Providers['crm'] {
  const post = async (payload: unknown) => {
    const res = await fetch(env.GHL_WEBHOOK_URL!, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`GHL ${res.status}`);
  };
  return {
    async upsertLead(l: Lead) {
      await post({
        source: 'brenson.co', email: l.email, phone: l.whatsapp ? `+${String(l.whatsapp).replace(/^57/, '57')}` : undefined,
        firstName: (l.nombre || '').toString().split(' ')[0], name: l.nombre, companyName: l.empresa,
        tags: ['brenson-web', `tipo:${l.tipo}`, l.uso ? `uso:${l.uso}` : null].filter(Boolean),
        customField: { vehiculo_interes: l.vehiculo, ciudad: l.ciudad, cantidad: l.cantidad, score_brenson: l.score, simulacion: l.simulacion ? JSON.stringify(l.simulacion) : '', nit: l.nit, sector: l.sector, flota_estimada: l.flota, cotizacion: l.cotizacion, fuente: l.fuente, url: l.url, prueba_modalidad: l.prueba_modalidad, prueba_fecha: l.prueba_fecha }
      });
      return { id: 'ghl' };
    },
    async event(e) { await post({ source: 'brenson.co', event: e.tipo, ...e }); }
  };
}

/* ---------- Mail ---------- */
function consoleMail(_env: Env): Providers['mail'] {
  return { async send(m) { console.info('[mail:console] →', m.to, '|', m.subject); } };
}
function resendMail(env: Env): Providers['mail'] {
  return {
    async send(m) {
      const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html }) });
      if (!res.ok) console.error('[mail:resend]', res.status, await res.text());
    }
  };
}

/* ---------- PDF ---------- */
// Mock: guarda el HTML en KV y lo sirve en /quotes/:id (imprimible desde el navegador).
function htmlPdf(env: Env): Providers['pdf'] {
  return {
    async render(o) { if (env.KV) await env.KV.put(`pdf:${o.id}`, o.html, { expirationTtl: 60 * 60 * 24 * 365 }); return `/quotes/${o.id}.pdf`; },
    async get(id) { return env.KV ? env.KV.get(`pdf:${id}`) : null; }
  };
}
// PDFMonkey: genera documento desde plantilla con `data` y devuelve URL de descarga (con retry, riesgo 04).
function pdfMonkey(env: Env): Providers['pdf'] {
  return {
    async render(o) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const create = await fetch('https://api.pdfmonkey.io/api/v1/documents', { method: 'POST', headers: { Authorization: `Bearer ${env.PDFMONKEY_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ document: { document_template_id: o.template, payload: o.data, status: 'pending', meta: { _filename: `${o.id}.pdf` } } }) });
          if (!create.ok) throw new Error(`create ${create.status}`);
          const { document } = await create.json() as { document: { id: string } };
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 1500));
            const st = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${document.id}`, { headers: { Authorization: `Bearer ${env.PDFMONKEY_API_KEY}` } });
            const j = await st.json() as { document: { status: string; download_url?: string } };
            if (j.document.status === 'success' && j.document.download_url) return j.document.download_url;
            if (j.document.status === 'failure') throw new Error('pdfmonkey failure');
          }
          throw new Error('timeout');
        } catch (e) { console.warn('[pdf:pdfmonkey] intento', attempt, e); if (attempt === 3) { console.error('[pdf] fallback HTML'); return htmlPdf(env).render(o); } }
      }
      return htmlPdf(env).render(o);
    },
    async get(id) { return htmlPdf(env).get(id); }
  };
}

/* ---------- Storage ---------- */
function localStorage_(env: Env): Providers['storage'] {
  return { async put(key, file, meta) { console.info('[storage:local]', key, file.size, 'bytes', meta); return `local://${key}`; } };
}
function r2Storage(env: Env): Providers['storage'] {
  return {
    async put(key, file, meta) {
      await env.DOCS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: meta.contentType }, customMetadata: { email: meta.email, customerId: meta.customerId, tipo: meta.tipo, uploadedAt: new Date().toISOString() } });
      // Bucket privado: el enlace se sirve por un endpoint firmado del propio Worker (pendiente) o se lee desde Admin. Aquí devolvemos la clave como referencia.
      return `r2://${key}`;
    }
  };
}
