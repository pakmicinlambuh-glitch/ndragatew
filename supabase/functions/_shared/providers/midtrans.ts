import { ChannelInfo, CreatePaymentResult, mapStatus, ProviderAdapter, WebhookResult } from './types.ts';
import { base64, sha512Hex, timingSafeEqual } from './crypto.ts';

const coreUrl = (p: any) =>
  (p.base_url || (p.mode === 'live' ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com')).replace(/\/$/, '');

const DEFAULT_CHANNELS: ChannelInfo[] = [
  { channel_code: 'qris', channel_name: 'QRIS', channel_type: 'qris', base_fee_type: 'percent', base_fee_value: 0.7 },
  { channel_code: 'bca', channel_name: 'BCA Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'bni', channel_name: 'BNI Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'bri', channel_name: 'BRI Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'permata', channel_name: 'Permata Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'cimb', channel_name: 'CIMB Virtual Account', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'alfamart', channel_name: 'Alfamart', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 5000 },
  { channel_code: 'indomaret', channel_name: 'Indomaret', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 5000 },
];

const authHeader = (serverKey: string) => `Basic ${base64(`${serverKey}:`)}`;

export const midtransAdapter: ProviderAdapter = {
  async createPayment(provider, input): Promise<CreatePaymentResult> {
    const serverKey = provider.credentials.api_key;
    if (!serverKey) return { success: false, error: 'Server key Midtrans belum diisi' };

    const code = (input.channelCode || '').toLowerCase();
    const payload: Record<string, any> = {
      transaction_details: { order_id: input.referenceNo, gross_amount: input.totalAmount },
      customer_details: {
        first_name: input.customerName || 'Customer',
        email: input.customerEmail || undefined,
        phone: input.customerPhone || undefined,
      },
    };

    if (input.paymentMethod === 'qris') {
      payload.payment_type = 'qris';
      payload.qris = { acquirer: 'gopay' };
    } else if (input.paymentMethod === 'va') {
      if (code === 'permata') {
        payload.payment_type = 'permata';
      } else {
        payload.payment_type = 'bank_transfer';
        payload.bank_transfer = { bank: code || 'bca' };
      }
    } else {
      payload.payment_type = 'cstore';
      payload.cstore = { store: code || 'indomaret', message: `Pembayaran ${input.referenceNo}` };
    }

    const res = await fetch(`${coreUrl(provider)}/v2/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: authHeader(serverKey) },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!['200', '201'].includes(String(result?.status_code))) {
      return { success: false, error: result?.status_message || 'Midtrans menolak permintaan', raw: result };
    }

    const qrAction = (result.actions || []).find((a: any) => a.name === 'generate-qr-code');
    return {
      success: true,
      qrContent: result.qr_string ?? null,
      paymentUrl: qrAction?.url ?? null,
      vaNumber: result.va_numbers?.[0]?.va_number ?? result.permata_va_number ?? null,
      paymentCode: result.payment_code ?? null,
      providerReference: result.transaction_id ?? null,
      expiresAt: result.expiry_time ? new Date(result.expiry_time.replace(' ', 'T') + '+07:00').toISOString() : null,
      raw: result,
    };
  },

  async listChannels(): Promise<ChannelInfo[]> {
    return DEFAULT_CHANNELS;
  },

  async checkStatus(provider, referenceNo) {
    const serverKey = provider.credentials.api_key;
    if (!serverKey) return {};
    const res = await fetch(`${coreUrl(provider)}/v2/${encodeURIComponent(referenceNo)}/status`, {
      headers: { Accept: 'application/json', Authorization: authHeader(serverKey) },
    });
    const raw = await res.json().catch(() => ({}));
    return { status: mapStatus(raw?.transaction_status), raw };
  },

  async parseWebhook(provider, rawBody): Promise<WebhookResult> {
    let body: Record<string, any> = {};
    try { body = JSON.parse(rawBody); } catch { return { valid: false, error: 'Invalid JSON' }; }

    const serverKey = provider.credentials.api_key;
    if (serverKey && body.signature_key) {
      const expected = await sha512Hex(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`);
      if (!timingSafeEqual(expected, String(body.signature_key))) return { valid: false, error: 'Signature tidak valid' };
    }

    let status = mapStatus(body.transaction_status);
    if (body.transaction_status === 'settlement' || (body.transaction_status === 'capture' && body.fraud_status === 'accept')) status = 'paid';
    if (body.transaction_status === 'expire') status = 'expired';

    return {
      valid: true,
      reference: body.order_id ?? null,
      providerReference: body.transaction_id ?? null,
      status,
      paidAt: body.settlement_time ? new Date(String(body.settlement_time).replace(' ', 'T') + '+07:00').toISOString() : null,
    };
  },
};
