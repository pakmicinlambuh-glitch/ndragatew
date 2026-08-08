import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, loadProvider } from "../_shared/providers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const DEFAULT_CHANNELS = [
  { channel_code: 'QRIS', channel_name: 'QRIS', channel_type: 'qris', base_fee_type: 'percent', base_fee_value: 0.7 },
  { channel_code: 'BCA', channel_name: 'Bank Central Asia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'BNI', channel_name: 'Bank Negara Indonesia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'BRI', channel_name: 'Bank Rakyat Indonesia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'MANDIRI', channel_name: 'Bank Mandiri', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000 },
  { channel_code: 'ALFAMART', channel_name: 'Alfamart', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 2500 },
  { channel_code: 'INDOMARET', channel_name: 'Indomaret', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 2500 },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let providerId: string | null = null;
    try {
      const body = await req.json();
      providerId = body?.providerId ?? null;
    } catch {
      providerId = new URL(req.url).searchParams.get('providerId');
    }

    // Sync all active providers when none is specified
    const targets: string[] = [];
    if (providerId) {
      targets.push(providerId);
    } else {
      const { data } = await supabase.from('payment_providers').select('id').eq('is_active', true);
      for (const p of data ?? []) targets.push(p.id);
    }

    if (!targets.length) {
      // No provider configured yet: seed platform markup rows so the UI has channels
      for (const channel of DEFAULT_CHANNELS) {
        await supabase.from('fee_settings').upsert({ ...channel, markup_fee_type: 'fixed', markup_fee_value: 0 }, { onConflict: 'channel_code' });
      }
      return json({ success: true, demo: true, channels: DEFAULT_CHANNELS });
    }

    const summary: Record<string, number> = {};

    for (const id of targets) {
      const provider = await loadProvider(supabase, { id });
      if (!provider) continue;
      const adapter = getAdapter(provider.adapter_type);

      let channels: any[] = [];
      try {
        channels = await adapter.listChannels(provider);
      } catch (e) {
        console.error(`Gagal sinkron channel ${provider.code}:`, e);
        continue;
      }

      for (const ch of channels) {
        await supabase.from('provider_channels').upsert({
          provider_id: provider.id,
          channel_code: ch.channel_code,
          channel_name: ch.channel_name,
          channel_type: ch.channel_type,
          base_fee_type: ch.base_fee_type,
          base_fee_value: ch.base_fee_value,
          min_amount: ch.min_amount ?? 10000,
          max_amount: ch.max_amount ?? 50000000,
          is_active: true,
        }, { onConflict: 'provider_id,channel_code' });

        // Keep a platform markup row per channel code
        await supabase.from('fee_settings').upsert({
          channel_code: ch.channel_code,
          channel_name: ch.channel_name,
          channel_type: ch.channel_type,
          base_fee_type: ch.base_fee_type,
          base_fee_value: ch.base_fee_value,
        }, { onConflict: 'channel_code', ignoreDuplicates: true });
      }

      summary[provider.code] = channels.length;
    }

    return json({ success: true, synced: summary });
  } catch (error) {
    console.error('get-channels error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
