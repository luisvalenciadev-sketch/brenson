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
  FINANCING_PROVIDER: 'mock' | 'addi';
  GHL_WEBHOOK_URL?: string;
  GHL_API_KEY?: string;
  RESEND_API_KEY?: string;
  // Addi (BNPL) — consulta de cupo disponible. Auth vía Auth0 client-credentials contra ADDI_AUTH_URL,
  // luego llamadas al API con ese token. ADDI_CLIENT_ID/SECRET son secretos (`wrangler secret put`).
  ADDI_AUTH_URL?: string;
  ADDI_API_BASE?: string;
  ADDI_AUDIENCE?: string;
  ADDI_MERCHANT_ID?: string;
  ADDI_CLIENT_ID?: string;
  ADDI_CLIENT_SECRET?: string;
  MAIL_FROM: string;
  ADVISOR_EMAIL: string;
  PDFMONKEY_API_KEY?: string;
  PDFMONKEY_TEMPLATE_QUOTE?: string;
  PDFMONKEY_TEMPLATE_SPEC?: string;
  TURNSTILE_SECRET?: string;
  QUOTE_SIGNING_SECRET?: string;
  QUOTE_VALIDITY_DAYS: string;
  CERTIFICACION_ACTIVA?: string;
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
  financing: { checkAvailability(input: AddiCheckInput): Promise<AddiCheckResult> };
}

/**
 * Consulta de cupo Addi (BNPL). Se evalúa siempre sobre la PERSONA (cédula), tanto en el flujo
 * B2C como en el B2B — Addi no tiene producto de crédito para personas jurídicas/NIT. `contexto`
 * solo cambia cómo se registra el lead resultante en el CRM.
 */
export interface AddiCheckInput {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
  montoSolicitado: number;
  contexto: 'b2c' | 'b2b';
}

export interface AddiCheckResult {
  ok: boolean;
  estado: 'aprobado' | 'rechazado' | 'pendiente' | 'error';
  cupoDisponible: number | null;
  mensaje: string;
  redirectUrl?: string;
}
