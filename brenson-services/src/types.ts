export interface Env {
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
  SHOPIFY_SHOP: string;
  SHOPIFY_API_VERSION: string;
  SHOPIFY_ADMIN_TOKEN?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  CRM_PROVIDER: 'mock' | 'ghl';
  MAIL_PROVIDER: 'console' | 'resend';
  PDF_PROVIDER: 'html' | 'pdfmonkey';
  STORAGE_PROVIDER: 'local' | 'r2';
  GHL_WEBHOOK_URL?: string;
  GHL_API_KEY?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM: string;
  ADVISOR_EMAIL: string;
  PDFMONKEY_API_KEY?: string;
  PDFMONKEY_TEMPLATE_QUOTE?: string;
  PDFMONKEY_TEMPLATE_SPEC?: string;
  TURNSTILE_SECRET?: string;
  QUOTE_SIGNING_SECRET?: string;
  QUOTE_VALIDITY_DAYS: string;
  UPLOAD_MAX_BYTES: string;
  KV: KVNamespace;
  DOCS: R2Bucket;
}

export interface Lead {
  tipo: string;
  nombre?: string;
  email?: string;
  whatsapp?: string;
  score: number;
  ts: string;
  [k: string]: unknown;
}

export interface QuoteItem {
  handle: string;
  title: string;
  variant_id: string;
  variant: string;
  sku: string;
  cantidad: number;
  precio_publico: number;
  descuento_pct: number;
  precio_unitario: number;
  subtotal: number;
  subtotal_publico: number;
}

export interface Quote {
  numero: string;
  estado: 'borrador' | 'enviada' | 'aceptada' | 'vencida' | 'rechazada';
  empresa: string;
  email: string;
  tier: string;
  descuento_pct: number;
  validez_dias: number;
  observaciones: string;
  items: QuoteItem[];
  subtotal_publico: number;
  descuento: number;
  total: number;
  unidades: number;
  creada_en: string;
  pdf_url?: string;
}

export interface DraftOrderResult {
  id: string;
  name: string;
  invoiceUrl: string | null;
}

export interface Providers {
  crm: { upsertLead(l: Lead): Promise<{ id: string }>; event(e: Record<string, unknown>): Promise<void> };
  mail: { send(m: { to: string; subject: string; html: string }): Promise<void> };
  pdf: { render(o: { id: string; html: string; template?: string; data: unknown }): Promise<string>; get(id: string): Promise<string | null> };
  storage: { put(key: string, file: File, meta: Record<string, string>): Promise<string> };
}
