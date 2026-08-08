import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAdapter, loadProvider } from '../_shared/providers/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Verify the caller is a signed-in admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json({ error: 'Tidak terautentikasi' }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: 'Tidak terautentikasi' }, 401);

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Hanya admin yang diizinkan' }, 403);

    const { action, providerId, credentials } = await req.json();

    if (action === 'save_credentials') {
      if (!providerId) return json({ error: 'providerId diperlukan' }, 400);
      const { error } = await admin
        .from('provider_credentials')
        .upsert({
          provider_id: providerId,
          api_key: credentials?.api_key ?? null,
          merchant_code: credentials?.merchant_code ?? null,
          private_key: credentials?.private_key ?? null,
          client_id: credentials?.client_id ?? null,
          extra: credentials?.extra ?? {},
        }, { onConflict: 'provider_id' });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    if (action === 'credentials_status') {
      const { data } = await admin.from('provider_credentials').select('provider_id, api_key, merchant_code, private_key, client_id');
      const status = (data ?? []).map((c: any) => ({
        provider_id: c.provider_id,
        has_api_key: !!c.api_key,
        has_merchant_code: !!c.merchant_code,
        has_private_key: !!c.private_key,
        has_client_id: !!c.client_id,
      }));
      return json({ success: true, status });
    }

    if (action === 'test_connection' || action === 'sync_channels') {
      if (!providerId) return json({ error: 'providerId diperlukan' }, 400);
      const provider = await loadProvider(admin, { id: providerId });
      if (!provider) return json({ error: 'Provider tidak ditemukan' }, 404);

      const adapter = getAdapter(provider.adapter_type);
      let channels: any[] = [];
      try {
        channels = await adapter.listChannels(provider);
      } catch (e) {
        return json({ success: false, error: `Gagal menghubungi provider: ${(e as Error).message}` });
      }

      if (action === 'test_connection') {
        return json({ success: channels.length > 0, channelCount: channels.length, sample: channels.slice(0, 5) });
      }

      if (!channels.length) return json({ success: false, error: 'Provider tidak mengembalikan channel apa pun' });

      for (const ch of channels) {
        await admin.from('provider_channels').upsert({
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
      }

      return json({ success: true, synced: channels.length });
    }

    return json({ error: 'Aksi tidak dikenal' }, 400);
  } catch (error) {
    console.error('provider-admin error:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
