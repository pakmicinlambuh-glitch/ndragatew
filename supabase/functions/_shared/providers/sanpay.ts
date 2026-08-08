import { ChannelInfo, CreatePaymentInput, CreatePaymentResult, mapStatus, ProviderAdapter, ProviderRecord, WebhookResult } from './types.ts';
import { hmacSha256Hex, timingSafeEqual } from './crypto.ts';

const baseUrl = (p: ProviderRecord) => (p.base_url || 'https://sanpay.site').replace(/\/$/, '');

export const sanpayAdapter: ProviderAdapter = {
  async createPayment(provider, input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const apiKey = provider.credentials.api_key;
    const merchantCode = provider.credentials.merchant_code;
    if (!apiKey || !merchantCode) return { success: false, error: 'Kredensial Sanpay belum lengkap' };

    const payload: Record<string, unknown> = {
      amount: input.totalAmount,
      partnerReferenceNo: input.referenceNo,
    };
    if (input.paymentMethod === 'va') {
      payload.bank_code = input.channelCode;
      payload.name = input.customerName || 'Customer';
    } else if (input.paymentMethod === 'retail') {
      payload.retail_outlet = input.channelCode;
      payload.name = input.customerName || 'Customer';
    } else {
      payload.expirySeconds = input.expirySeconds ?? 900;
    }

    const body = JSON.stringify(payload);
    const signature = await hmacSha256Hex(body, apiKey);
    const endpoint = input.paymentMethod === 'qris' ? 'topup_qris' : input.paymentMethod === 'va' ? 'topup_va' : 'topup_retail';

    const res = await fetch(`${baseUrl(provider)}/api/v1/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Merchant-Code': merchantCode, 'X-Signature': signature },
      body,
    });
    const result = await res.json().catch(() => ({}));

    if (result?.status !== 'success') {
      return { success: false, error: result?.message || 'Sanpay menolak permintaan', raw: result };
    }

    return {
      success: true,
      qrContent: result.qrContent ?? result.qr_content ?? null,
      vaNumber: result.va_number ?? null,
      paymentCode: result.payment_code ?? null,
      providerReference: result.reference ?? result.trx_id ?? null,
      expiresAt: result.expiration_date ?? null,
      raw: result,
    };
  },

  async listChannels(provider): Promise<ChannelInfo[]> {
    const { api_key, merchant_code } = provider.credentials;
    if (!api_key || !merchant_code) return [];
    const res = await fetch(`${baseUrl(provider)}/api/v1/get_channels?apikey=${api_key}&merchant_code=${merchant_code}`);
    const result = await res.json().catch(() => ({}));
    if (result?.status !== 'success' || !result.data) return [];

    const channels: ChannelInfo[] = [
      { channel_code: 'QRIS', channel_name: 'QRIS', channel_type: 'qris', base_fee_type: 'percent', base_fee_value: 0.7 },
    ];
    for (const ch of result.data.va_channels || []) {
      channels.push({
        channel_code: ch.code, channel_name: ch.name, channel_type: 'va',
        base_fee_type: String(ch.admin_fee_type || 'fixed').toLowerCase() as 'fixed' | 'percent',
        base_fee_value: Number(ch.admin_fee_value || 0), min_amount: ch.min_amount, max_amount: ch.max_amount,
      });
    }
    for (const ch of result.data.retail_channels || []) {
      channels.push({
        channel_code: ch.code, channel_name: ch.name, channel_type: 'retail',
        base_fee_type: String(ch.admin_fee_type || 'fixed').toLowerCase() as 'fixed' | 'percent',
        base_fee_value: Number(ch.admin_fee_value || 0), min_amount: ch.min_amount, max_amount: ch.max_amount,
      });
    }
    return channels;
  },

  async checkStatus(provider, referenceNo) {
    const { api_key, merchant_code } = provider.credentials;
    if (!api_key || !merchant_code) return {};
    const res = await fetch(`${baseUrl(provider)}/api/v1/check_status?apikey=${api_key}&merchant_code=${merchant_code}&partnerReferenceNo=${encodeURIComponent(referenceNo)}`);
    const raw = await res.json().catch(() => ({}));
    return { status: mapStatus(raw?.data?.status ?? raw?.status_transaksi ?? raw?.status), raw };
  },

  async parseWebhook(provider, rawBody, headers): Promise<WebhookResult> {
    const signature = headers.get('x-signature');
    const secret = provider.credentials.api_key;
    let body: Record<string, any> = {};
    try { body = JSON.parse(rawBody); } catch { return { valid: false, error: 'Invalid JSON' }; }

    if (secret && signature) {
      const expected = await hmacSha256Hex(rawBody, secret);
      if (!timingSafeEqual(expected, signature)) return { valid: false, error: 'Signature tidak valid' };
    }

    return {
      valid: true,
      reference: body.partnerReferenceNo || body.partner_reference_no || body.reference_no || body.trx_id || null,
      providerReference: body.reference || body.trx_id || null,
      status: mapStatus(body.status || body.transaction_status),
      paidAt: body.paidAt || body.paid_at || body.payment_time || null,
    };
  },
};
