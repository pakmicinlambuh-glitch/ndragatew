import { ChannelInfo, CreatePaymentResult, mapStatus, ProviderAdapter, WebhookResult } from './types.ts';
import { base64, timingSafeEqual } from './crypto.ts';

const apiUrl = (p: any) => (p.base_url || 'https://api.xendit.co').replace(/\/$/, '');
const authHeader = (secret: string) => `Basic ${base64(`${secret}:`)}`;

const DEFAULT_CHANNELS: ChannelInfo[] = [
  { channel_code: 'QRIS', channel_name: 'QRIS', channel_type: 'qris', base_fee_type: 'percent', base_fee_value: 0.7 },
  { channel_code: 'BCA', channel_name: 'BCA Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'BNI', channel_name: 'BNI Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'BRI', channel_name: 'BRI Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'MANDIRI', channel_name: 'Mandiri Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'PERMATA', channel_name: 'Permata Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'BSI', channel_name: 'BSI Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'ALFAMART', channel_name: 'Alfamart', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 5000 },
  { channel_code: 'INDOMARET', channel_name: 'Indomaret', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 5000 },
];

export const xenditAdapter: ProviderAdapter = {
  async createPayment(provider, input): Promise<CreatePaymentResult> {
    const secret = provider.credentials.api_key;
    if (!secret) return { success: false, error: 'Secret key Xendit belum diisi' };

    const headers = { 'Content-Type': 'application/json', Authorization: authHeader(secret) };
    const expiresAt = new Date(Date.now() + (input.expirySeconds ?? 900) * 1000).toISOString();

    if (input.paymentMethod === 'qris') {
      const res = await fetch(`${apiUrl(provider)}/qr_codes`, {
        method: 'POST',
        headers: { ...headers, 'api-version': '2022-07-31' },
        body: JSON.stringify({ reference_id: input.referenceNo, type: 'DYNAMIC', currency: 'IDR', amount: input.totalAmount, expires_at: expiresAt }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: result?.message || 'Xendit menolak permintaan', raw: result };
      return { success: true, qrContent: result.qr_string ?? null, providerReference: result.id ?? null, expiresAt, raw: result };
    }

    if (input.paymentMethod === 'va') {
      const res = await fetch(`${apiUrl(provider)}/callback_virtual_accounts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          external_id: input.referenceNo,
          bank_code: (input.channelCode || 'BCA').toUpperCase(),
          name: (input.customerName || 'CUSTOMER').toUpperCase().slice(0, 50),
          is_closed: true,
          expected_amount: input.totalAmount,
          expiration_date: expiresAt,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: result?.message || 'Xendit menolak permintaan', raw: result };
      return { success: true, vaNumber: result.account_number ?? null, providerReference: result.id ?? null, expiresAt, raw: result };
    }

    const res = await fetch(`${apiUrl(provider)}/fixed_payment_code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        external_id: input.referenceNo,
        retail_outlet_name: (input.channelCode || 'ALFAMART').toUpperCase(),
        name: (input.customerName || 'CUSTOMER').toUpperCase().slice(0, 50),
        expected_amount: input.totalAmount,
        expiration_date: expiresAt,
      }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: result?.message || 'Xendit menolak permintaan', raw: result };
    return { success: true, paymentCode: result.payment_code ?? null, providerReference: result.id ?? null, expiresAt, raw: result };
  },

  async listChannels(): Promise<ChannelInfo[]> {
    return DEFAULT_CHANNELS;
  },

  async checkStatus(provider, referenceNo) {
    const secret = provider.credentials.api_key;
    if (!secret) return {};
    const res = await fetch(`${apiUrl(provider)}/qr_codes/${encodeURIComponent(referenceNo)}/payments`, {
      headers: { Authorization: authHeader(secret), 'api-version': '2022-07-31' },
    });
    const raw = await res.json().catch(() => ({}));
    const first = Array.isArray(raw?.data) ? raw.data[0] : null;
    return { status: first ? mapStatus(first.status) : undefined, raw };
  },

  async parseWebhook(provider, rawBody, headers): Promise<WebhookResult> {
    const token = provider.credentials.extra?.callback_token || provider.credentials.private_key;
    const incoming = headers.get('x-callback-token');
    if (token && incoming && !timingSafeEqual(String(token), incoming)) {
      return { valid: false, error: 'Callback token tidak valid' };
    }
    let body: Record<string, any> = {};
    try { body = JSON.parse(rawBody); } catch { return { valid: false, error: 'Invalid JSON' }; }
    const data = body.data ?? body;

    const reference = data.reference_id ?? data.external_id ?? body.external_id ?? null;
    const status = data.status ? mapStatus(data.status) : 'paid';
    return {
      valid: true,
      reference,
      providerReference: data.id ?? null,
      status: status ?? 'paid',
      paidAt: data.created ?? data.transaction_timestamp ?? null,
    };
  },
};
