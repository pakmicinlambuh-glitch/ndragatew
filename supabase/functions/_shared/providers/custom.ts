import { ChannelInfo, CreatePaymentResult, mapStatus, ProviderAdapter, ProviderRecord, WebhookResult } from './types.ts';
import { hmacSha256Hex, md5Hex, sha256Hex, timingSafeEqual } from './crypto.ts';

// Generic, configuration-driven adapter. Admin describes the provider API in
// payment_providers.config, no code changes required.
//
// config = {
//   create:   { path, method, auth, body, response },
//   channels: { path, method, list_path, map },
//   status:   { path, method, status_path },
//   webhook:  { reference_path, provider_reference_path, status_path, paid_at_path,
//               signature: { type, header, template } , status_map }
// }

const getPath = (obj: any, path?: string) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc: any, key) => (acc == null ? acc : acc[key]), obj);
};

const render = (template: unknown, vars: Record<string, unknown>): any => {
  if (typeof template === 'string') {
    const exact = template.match(/^\{\{(\w+)\}\}$/);
    if (exact) return vars[exact[1]] ?? null;
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  }
  if (Array.isArray(template)) return template.map((t) => render(t, vars));
  if (template && typeof template === 'object') {
    return Object.fromEntries(Object.entries(template as Record<string, unknown>).map(([k, v]) => [k, render(v, vars)]));
  }
  return template;
};

async function sign(type: string | undefined, payload: string, secret: string): Promise<string> {
  switch (type) {
    case 'md5': return await md5Hex(payload + secret);
    case 'sha256': return await sha256Hex(payload + secret);
    case 'hmac_sha256': return await hmacSha256Hex(payload, secret);
    default: return '';
  }
}

function buildHeaders(provider: ProviderRecord, auth: any, extra: Record<string, string> = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
  const key = provider.credentials.api_key || '';
  switch (auth?.type) {
    case 'bearer': headers['Authorization'] = `Bearer ${key}`; break;
    case 'basic': headers['Authorization'] = `Basic ${btoa(`${key}:`)}`; break;
    case 'header': headers[auth.header || 'X-API-Key'] = key; break;
  }
  for (const [k, v] of Object.entries(auth?.headers || {})) headers[k] = String(v);
  return headers;
}

const url = (provider: ProviderRecord, path: string) => `${(provider.base_url || '').replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

export const customAdapter: ProviderAdapter = {
  async createPayment(provider, input): Promise<CreatePaymentResult> {
    const cfg = provider.config?.create;
    if (!provider.base_url || !cfg?.path) return { success: false, error: 'Konfigurasi provider custom belum lengkap' };

    const vars: Record<string, unknown> = {
      amount: input.totalAmount,
      base_amount: input.amount,
      reference: input.referenceNo,
      channel: input.channelCode ?? '',
      method: input.paymentMethod,
      customer_name: input.customerName ?? 'Customer',
      customer_email: input.customerEmail ?? '',
      customer_phone: input.customerPhone ?? '',
      expiry_seconds: input.expirySeconds ?? 900,
      callback_url: input.callbackUrl ?? '',
      return_url: input.returnUrl ?? '',
      merchant_code: provider.credentials.merchant_code ?? '',
      api_key: provider.credentials.api_key ?? '',
    };

    const payload = render(cfg.body ?? {}, vars);
    const sigCfg = cfg.signature;
    if (sigCfg?.type && sigCfg.type !== 'none') {
      const secret = provider.credentials.private_key || provider.credentials.api_key || '';
      const raw = sigCfg.template ? render(sigCfg.template, vars) : JSON.stringify(payload);
      const signature = await sign(sigCfg.type, String(raw), secret);
      if (sigCfg.header) (cfg.extra_headers ||= {})[sigCfg.header] = signature;
      else payload[sigCfg.field || 'signature'] = signature;
    }

    const res = await fetch(url(provider, cfg.path), {
      method: cfg.method || 'POST',
      headers: buildHeaders(provider, cfg.auth, cfg.extra_headers),
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));

    const map = cfg.response || {};
    const successPath = map.success_path;
    const ok = successPath ? String(getPath(result, successPath)) === String(map.success_value ?? 'success') : res.ok;
    if (!ok) return { success: false, error: String(getPath(result, map.error_path) ?? 'Provider menolak permintaan'), raw: result };

    return {
      success: true,
      qrContent: getPath(result, map.qr_content) ?? null,
      vaNumber: getPath(result, map.va_number) ?? null,
      paymentCode: getPath(result, map.payment_code) ?? null,
      paymentUrl: getPath(result, map.payment_url) ?? null,
      providerReference: getPath(result, map.provider_reference) ?? null,
      expiresAt: getPath(result, map.expires_at) ?? null,
      raw: result,
    };
  },

  async listChannels(provider): Promise<ChannelInfo[]> {
    const cfg = provider.config?.channels;
    if (!provider.base_url || !cfg?.path) return [];
    const res = await fetch(url(provider, cfg.path), {
      method: cfg.method || 'GET',
      headers: buildHeaders(provider, cfg.auth),
    });
    const result = await res.json().catch(() => ({}));
    const list = getPath(result, cfg.list_path) ?? (Array.isArray(result) ? result : []);
    if (!Array.isArray(list)) return [];
    const map = cfg.map || {};
    return list.map((item: any) => ({
      channel_code: String(getPath(item, map.code) ?? item.code ?? ''),
      channel_name: String(getPath(item, map.name) ?? item.name ?? ''),
      channel_type: (getPath(item, map.type) ?? item.type ?? 'va') as ChannelInfo['channel_type'],
      base_fee_type: (getPath(item, map.fee_type) ?? 'fixed') as 'fixed' | 'percent',
      base_fee_value: Number(getPath(item, map.fee_value) ?? 0),
      min_amount: Number(getPath(item, map.min_amount) ?? 0) || undefined,
      max_amount: Number(getPath(item, map.max_amount) ?? 0) || undefined,
    })).filter((c: ChannelInfo) => c.channel_code);
  },

  async checkStatus(provider, referenceNo, providerReference) {
    const cfg = provider.config?.status;
    if (!provider.base_url || !cfg?.path) return {};
    const path = render(cfg.path, { reference: referenceNo, provider_reference: providerReference ?? '' });
    const res = await fetch(url(provider, String(path)), {
      method: cfg.method || 'GET',
      headers: buildHeaders(provider, cfg.auth),
    });
    const raw = await res.json().catch(() => ({}));
    return { status: mapStatus(getPath(raw, cfg.status_path)), raw };
  },

  async parseWebhook(provider, rawBody, headers): Promise<WebhookResult> {
    const cfg = provider.config?.webhook || {};
    let body: Record<string, any> = {};
    try { body = JSON.parse(rawBody); } catch { body = Object.fromEntries(new URLSearchParams(rawBody)); }

    const sigCfg = cfg.signature;
    if (sigCfg?.type && sigCfg.type !== 'none' && sigCfg.header) {
      const incoming = headers.get(sigCfg.header);
      const secret = provider.credentials.private_key || provider.credentials.api_key || '';
      if (!incoming) return { valid: false, error: 'Signature tidak ada' };
      const expected = await sign(sigCfg.type, rawBody, secret);
      if (!timingSafeEqual(expected, incoming)) return { valid: false, error: 'Signature tidak valid' };
    }

    const rawStatus = getPath(body, cfg.status_path) ?? body.status;
    const mapped = cfg.status_map?.[String(rawStatus)] ?? rawStatus;
    return {
      valid: true,
      reference: getPath(body, cfg.reference_path) ?? body.reference ?? null,
      providerReference: getPath(body, cfg.provider_reference_path) ?? null,
      status: mapStatus(mapped),
      paidAt: getPath(body, cfg.paid_at_path) ?? null,
    };
  },
};
