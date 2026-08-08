import { ProviderAdapter, ProviderRecord } from './types.ts';
import { sanpayAdapter } from './sanpay.ts';
import { tripayAdapter } from './tripay.ts';
import { duitkuAdapter } from './duitku.ts';
import { midtransAdapter } from './midtrans.ts';
import { xenditAdapter } from './xendit.ts';
import { customAdapter } from './custom.ts';

export * from './types.ts';

const ADAPTERS: Record<string, ProviderAdapter> = {
  sanpay: sanpayAdapter,
  tripay: tripayAdapter,
  duitku: duitkuAdapter,
  midtrans: midtransAdapter,
  xendit: xenditAdapter,
  custom: customAdapter,
};

export const ADAPTER_TYPES = Object.keys(ADAPTERS);

export function getAdapter(adapterType: string): ProviderAdapter {
  return ADAPTERS[adapterType] ?? customAdapter;
}

/** Load a provider with its credentials (service-role client required). */
export async function loadProvider(supabase: any, opts: { id?: string; code?: string; requireActive?: boolean }): Promise<ProviderRecord | null> {
  let query = supabase
    .from('payment_providers')
    .select('*, provider_credentials(api_key, merchant_code, private_key, client_id, extra)');

  if (opts.id) query = query.eq('id', opts.id);
  else if (opts.code) query = query.eq('code', opts.code);
  else return null;

  if (opts.requireActive) query = query.eq('is_active', true);

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const cred = Array.isArray(data.provider_credentials) ? data.provider_credentials[0] : data.provider_credentials;
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    adapter_type: data.adapter_type,
    base_url: data.base_url,
    mode: data.mode,
    config: data.config ?? {},
    credentials: cred ?? {},
  };
}

/** Resolve which provider a merchant's transaction should use. */
export async function resolveProvider(
  supabase: any,
  opts: { userId?: string | null; providerId?: string | null; serverLabel?: string | null; paymentMethod?: string },
): Promise<ProviderRecord | null> {
  if (opts.providerId) return await loadProvider(supabase, { id: opts.providerId, requireActive: true });

  const { data: providers } = await supabase
    .from('payment_providers')
    .select('id, server_label, code, sort_order, supports_qris, supports_va, supports_retail')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!providers?.length) return null;

  const supports = (p: any) =>
    opts.paymentMethod === 'qris' ? p.supports_qris : opts.paymentMethod === 'va' ? p.supports_va : opts.paymentMethod === 'retail' ? p.supports_retail : true;

  let candidates = providers.filter(supports);

  if (opts.serverLabel) {
    const wanted = String(opts.serverLabel).trim().toLowerCase();
    const numeric = wanted.replace(/[^0-9]/g, '');
    candidates = candidates.filter((p: any, index: number) =>
      String(p.server_label ?? '').toLowerCase() === wanted ||
      p.code?.toLowerCase() === wanted ||
      (numeric && String(index + 1) === numeric)
    );
  } else if (opts.userId) {
    const { data: access } = await supabase
      .from('merchant_provider_access')
      .select('provider_id, is_allowed, is_default')
      .eq('user_id', opts.userId)
      .eq('is_allowed', true);

    if (access?.length) {
      const allowed = new Set(access.map((a: any) => a.provider_id));
      const preferred = access.find((a: any) => a.is_default)?.provider_id;
      const scoped = candidates.filter((p: any) => allowed.has(p.id));
      if (scoped.length) {
        candidates = preferred && scoped.some((p: any) => p.id === preferred)
          ? [scoped.find((p: any) => p.id === preferred), ...scoped]
          : scoped;
      }
    }
  }

  const chosen = candidates[0];
  if (!chosen) return null;
  return await loadProvider(supabase, { id: chosen.id, requireActive: true });
}
