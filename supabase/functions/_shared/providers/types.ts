export type PaymentMethod = 'qris' | 'va' | 'retail';
export type TxStatus = 'pending' | 'paid' | 'expired' | 'failed';

export interface ProviderRecord {
  id: string;
  code: string;
  name: string;
  adapter_type: string;
  base_url: string | null;
  mode: 'sandbox' | 'live';
  config: Record<string, any>;
  credentials: {
    api_key?: string | null;
    merchant_code?: string | null;
    private_key?: string | null;
    client_id?: string | null;
    extra?: Record<string, any>;
  };
}

export interface CreatePaymentInput {
  amount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  channelCode?: string | null;
  referenceNo: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  expirySeconds?: number;
  callbackUrl?: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  success: boolean;
  error?: string;
  qrContent?: string | null;
  vaNumber?: string | null;
  paymentCode?: string | null;
  paymentUrl?: string | null;
  providerReference?: string | null;
  expiresAt?: string | null;
  raw?: unknown;
}

export interface ChannelInfo {
  channel_code: string;
  channel_name: string;
  channel_type: PaymentMethod;
  base_fee_type: 'fixed' | 'percent';
  base_fee_value: number;
  min_amount?: number;
  max_amount?: number;
}

export interface WebhookResult {
  valid: boolean;
  reference?: string | null;
  providerReference?: string | null;
  status?: TxStatus;
  paidAt?: string | null;
  error?: string;
}

export interface ProviderAdapter {
  createPayment(provider: ProviderRecord, input: CreatePaymentInput): Promise<CreatePaymentResult>;
  listChannels(provider: ProviderRecord): Promise<ChannelInfo[]>;
  checkStatus(provider: ProviderRecord, referenceNo: string, providerReference?: string | null): Promise<{ status?: TxStatus; raw?: unknown }>;
  parseWebhook(provider: ProviderRecord, rawBody: string, headers: Headers): Promise<WebhookResult>;
}

export function mapStatus(value: unknown): TxStatus | undefined {
  const s = String(value ?? '').toLowerCase();
  if (['paid', 'success', 'settlement', 'capture', 'succeeded', 'completed', 'active_paid'].includes(s)) return 'paid';
  if (['expired', 'expire'].includes(s)) return 'expired';
  if (['failed', 'failure', 'cancel', 'canceled', 'cancelled', 'deny', 'refund', 'chargeback'].includes(s)) return 'failed';
  if (['pending', 'unpaid', 'waiting', 'created', 'active'].includes(s)) return 'pending';
  return undefined;
}
