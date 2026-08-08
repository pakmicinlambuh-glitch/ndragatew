import { ChannelInfo, CreatePaymentResult, mapStatus, ProviderAdapter, WebhookResult } from './types.ts';
import { hmacSha256Hex, timingSafeEqual } from './crypto.ts';

const baseUrl = (p: any) => (p.base_url || (p.mode === 'live' ? 'https://tripay.co.id/api' : 'https://tripay.co.id/api-sandbox')).replace(/\/$/, '');

const methodFor = (paymentMethod: string, channelCode?: string | null) => {
  if (paymentMethod === 'qris') return channelCode || 'QRIS';
  return channelCode || '';
};

export const tripayAdapter: ProviderAdapter = {
  async createPayment(provider, input): Promise<CreatePaymentResult> {
    const { api_key, private_key, merchant_code } = provider.credentials;
    if (!api_key || !private_key || !merchant_code) return { success: false, error: 'Kredensial Tripay belum lengkap (API key, private key, merchant code)' };

    const signature = await hmacSha256Hex(`${merchant_code}${input.referenceNo}${input.totalAmount}`, private_key);
    const payload = {
      method: methodFor(input.paymentMethod, input.channelCode),
      merchant_ref: input.referenceNo,
      amount: input.totalAmount,
      customer_name: input.customerName || 'Customer',
      customer_email: input.customerEmail || 'customer@example.com',
      customer_phone: input.customerPhone || '',
      order_items: [{ name: `Pembayaran ${input.referenceNo}`, price: input.totalAmount, quantity: 1 }],
      return_url: input.returnUrl,
      expired_time: Math.floor(Date.now() / 1000) + (input.expirySeconds ?? 900),
      signature,
    };

    const res = await fetch(`${baseUrl(provider)}/transaction/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${api_key}` },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (!result?.success) return { success: false, error: result?.message || 'Tripay menolak permintaan', raw: result };

    const d = result.data;
    return {
      success: true,
      qrContent: d.qr_string ?? null,
      vaNumber: d.pay_code && input.paymentMethod === 'va' ? d.pay_code : null,
      paymentCode: input.paymentMethod === 'retail' ? d.pay_code ?? null : null,
      paymentUrl: d.checkout_url ?? null,
      providerReference: d.reference ?? null,
      expiresAt: d.expired_time ? new Date(d.expired_time * 1000).toISOString() : null,
      raw: result,
    };
  },

  async listChannels(provider): Promise<ChannelInfo[]> {
    const { api_key } = provider.credentials;
    if (!api_key) return [];
    const res = await fetch(`${baseUrl(provider)}/merchant/payment-channel`, { headers: { Authorization: `Bearer ${api_key}` } });
    const result = await res.json().catch(() => ({}));
    if (!result?.success || !Array.isArray(result.data)) return [];

    return result.data.map((ch: any) => {
      const group = String(ch.group || '').toLowerCase();
      const type = ch.code === 'QRIS' || group.includes('qris') ? 'qris' : group.includes('convenience') || group.includes('store') ? 'retail' : 'va';
      const flat = Number(ch.total_fee?.flat ?? ch.fee_merchant?.flat ?? 0);
      const percent = Number(ch.total_fee?.percent ?? ch.fee_merchant?.percent ?? 0);
      return {
        channel_code: ch.code,
        channel_name: ch.name,
        channel_type: type as ChannelInfo['channel_type'],
        base_fee_type: percent > 0 ? 'percent' : 'fixed',
        base_fee_value: percent > 0 ? percent : flat,
        min_amount: Number(ch.minimum_amount || 0) || undefined,
        max_amount: Number(ch.maximum_amount || 0) || undefined,
      } as ChannelInfo;
    });
  },

  async checkStatus(provider, _ref, providerReference) {
    const { api_key } = provider.credentials;
    if (!api_key || !providerReference) return {};
    const res = await fetch(`${baseUrl(provider)}/transaction/detail?reference=${encodeURIComponent(providerReference)}`, {
      headers: { Authorization: `Bearer ${api_key}` },
    });
    const raw = await res.json().catch(() => ({}));
    return { status: mapStatus(raw?.data?.status), raw };
  },

  async parseWebhook(provider, rawBody, headers): Promise<WebhookResult> {
    const signature = headers.get('x-callback-signature');
    const { private_key } = provider.credentials;
    if (private_key && signature) {
      const expected = await hmacSha256Hex(rawBody, private_key);
      if (!timingSafeEqual(expected, signature)) return { valid: false, error: 'Signature tidak valid' };
    }
    let body: Record<string, any> = {};
    try { body = JSON.parse(rawBody); } catch { return { valid: false, error: 'Invalid JSON' }; }
    return {
      valid: true,
      reference: body.merchant_ref ?? null,
      providerReference: body.reference ?? null,
      status: mapStatus(body.status),
      paidAt: body.paid_at ? new Date(Number(body.paid_at) * 1000).toISOString() : null,
    };
  },
};
