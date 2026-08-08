import { ChannelInfo, CreatePaymentResult, mapStatus, ProviderAdapter, WebhookResult } from './types.ts';
import { md5Hex, sha256Hex, timingSafeEqual } from './crypto.ts';

const baseUrl = (p: any) =>
  (p.base_url || (p.mode === 'live' ? 'https://passport.duitku.com/webapi/api/merchant' : 'https://sandbox.duitku.com/webapi/api/merchant')).replace(/\/$/, '');

export const duitkuAdapter: ProviderAdapter = {
  async createPayment(provider, input): Promise<CreatePaymentResult> {
    const merchantCode = provider.credentials.merchant_code;
    const apiKey = provider.credentials.api_key;
    if (!merchantCode || !apiKey) return { success: false, error: 'Kredensial Duitku belum lengkap (merchant code, API key)' };

    const signature = await md5Hex(`${merchantCode}${input.referenceNo}${input.totalAmount}${apiKey}`);
    const payload = {
      merchantCode,
      paymentAmount: input.totalAmount,
      paymentMethod: input.channelCode || (input.paymentMethod === 'qris' ? 'SP' : ''),
      merchantOrderId: input.referenceNo,
      productDetails: `Pembayaran ${input.referenceNo}`,
      customerVaName: input.customerName || 'Customer',
      email: input.customerEmail || 'customer@example.com',
      phoneNumber: input.customerPhone || '',
      callbackUrl: input.callbackUrl,
      returnUrl: input.returnUrl,
      signature,
      expiryPeriod: Math.max(1, Math.round((input.expirySeconds ?? 900) / 60)),
    };

    const res = await fetch(`${baseUrl(provider)}/v2/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json().catch(() => ({}));
    if (String(result?.statusCode) !== '00') {
      return { success: false, error: result?.statusMessage || 'Duitku menolak permintaan', raw: result };
    }

    return {
      success: true,
      qrContent: result.qrString ?? null,
      vaNumber: input.paymentMethod === 'va' ? result.vaNumber ?? null : null,
      paymentCode: input.paymentMethod === 'retail' ? result.paymentCode ?? result.vaNumber ?? null : null,
      paymentUrl: result.paymentUrl ?? null,
      providerReference: result.reference ?? null,
      raw: result,
    };
  },

  async listChannels(provider): Promise<ChannelInfo[]> {
    const merchantCode = provider.credentials.merchant_code;
    const apiKey = provider.credentials.api_key;
    if (!merchantCode || !apiKey) return [];
    const datetime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const signature = await sha256Hex(`${merchantCode}10000${datetime}${apiKey}`);

    const res = await fetch(`${baseUrl(provider)}/paymentmethod/getpaymentmethod`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantcode: merchantCode, amount: '10000', datetime, signature }),
    });
    const result = await res.json().catch(() => ({}));
    const methods = result?.paymentFee || [];
    return methods.map((m: any) => {
      const code = m.paymentMethod;
      const name = m.paymentName || code;
      const type = code === 'SP' || /qris/i.test(name) ? 'qris' : /alfa|indomaret|pos|retail/i.test(name) ? 'retail' : 'va';
      return {
        channel_code: code,
        channel_name: name,
        channel_type: type as ChannelInfo['channel_type'],
        base_fee_type: Number(m.totalFee || 0) > 0 ? 'fixed' : 'fixed',
        base_fee_value: Number(m.totalFee || 0),
      } as ChannelInfo;
    });
  },

  async checkStatus(provider, referenceNo) {
    const merchantCode = provider.credentials.merchant_code;
    const apiKey = provider.credentials.api_key;
    if (!merchantCode || !apiKey) return {};
    const signature = await md5Hex(`${merchantCode}${referenceNo}${apiKey}`);
    const res = await fetch(`${baseUrl(provider)}/transactionStatus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantCode, merchantOrderId: referenceNo, signature }),
    });
    const raw = await res.json().catch(() => ({}));
    const code = String(raw?.statusCode ?? '');
    const status = code === '00' ? 'paid' : code === '01' ? 'pending' : code === '02' ? 'failed' : undefined;
    return { status: status as any, raw };
  },

  async parseWebhook(provider, rawBody, headers): Promise<WebhookResult> {
    const merchantCode = provider.credentials.merchant_code;
    const apiKey = provider.credentials.api_key;
    const contentType = headers.get('content-type') || '';
    let body: Record<string, any> = {};
    if (contentType.includes('application/json')) {
      try { body = JSON.parse(rawBody); } catch { return { valid: false, error: 'Invalid JSON' }; }
    } else {
      body = Object.fromEntries(new URLSearchParams(rawBody));
    }

    if (merchantCode && apiKey && body.signature) {
      const expected = await md5Hex(`${merchantCode}${body.amount}${body.merchantOrderId}${apiKey}`);
      if (!timingSafeEqual(expected, String(body.signature))) return { valid: false, error: 'Signature tidak valid' };
    }

    const code = String(body.resultCode ?? '');
    return {
      valid: true,
      reference: body.merchantOrderId ?? null,
      providerReference: body.reference ?? null,
      status: code === '00' ? 'paid' : code === '01' ? 'failed' : mapStatus(body.status),
    };
  },
};
