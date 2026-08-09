import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Sandbox simulator: mengubah status transaksi sandbox (paid/expired/failed),
 * mengkredit saldo sandbox, dan meneruskan webhook merchant persis seperti production.
 * Tidak pernah menyentuh transaksi live.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => null);
    if (!body?.reference) return json({ status: 'error', message: 'reference wajib diisi' }, 400);

    const newStatus: string = body.status ?? 'paid';
    if (!['paid', 'expired', 'failed'].includes(newStatus)) {
      return json({ status: 'error', message: 'status harus paid, expired, atau failed' }, 400);
    }

    // Identifikasi merchant: sandbox API key atau JWT pengguna
    let userId: string | null = null;
    const apiKey = req.headers.get('x-api-key');
    if (apiKey) {
      const { data } = await supabase
        .from('user_api_settings')
        .select('user_id')
        .eq('sandbox_api_key', apiKey)
        .eq('is_active', true)
        .maybeSingle();
      userId = data?.user_id ?? null;
    } else {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const { data } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        userId = data.user?.id ?? null;
      }
    }

    if (!userId) return json({ status: 'error', message: 'Autentikasi diperlukan (sandbox API key atau login)' }, 401);

    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('partner_reference_no', body.reference)
      .eq('user_id', userId)
      .eq('mode', 'sandbox')
      .maybeSingle();

    if (!transaction) return json({ status: 'error', message: 'Transaksi sandbox tidak ditemukan' }, 404);
    if (['paid', 'expired', 'failed'].includes(transaction.status)) {
      return json({ status: 'ok', message: 'Transaksi sudah final', current: transaction.status });
    }

    const paidAt = newStatus === 'paid' ? new Date().toISOString() : null;
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: newStatus,
        paid_at: paidAt,
        callback_data: { simulated: true, source: 'sandbox-simulate', at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    if (updateError) return json({ status: 'error', message: 'Gagal memperbarui transaksi' }, 500);

    if (newStatus === 'paid') {
      const net = (transaction.amount ?? 0) - (transaction.admin_fee ?? 0);
      await supabase.rpc('adjust_user_balance', {
        _user_id: userId,
        _amount: net,
        _type: 'credit',
        _description: `Simulasi sandbox ${transaction.partner_reference_no}`,
        _reference_id: transaction.id,
        _created_by: userId,
        _mode: 'sandbox',
      });

      const { data: settings } = await supabase
        .from('user_api_settings')
        .select('webhook_url, webhook_secret')
        .eq('user_id', userId)
        .maybeSingle();

      if (settings?.webhook_url) {
        const payload = JSON.stringify({
          event: 'payment.success',
          mode: 'sandbox',
          partnerReferenceNo: transaction.partner_reference_no,
          status: 'paid',
          amount: transaction.amount,
          totalAmount: transaction.total_amount,
          paymentMethod: transaction.payment_method,
          channelCode: transaction.channel_code,
          paidAt,
        });
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Mode': 'sandbox' };
          if (settings.webhook_secret) {
            const key = await crypto.subtle.importKey(
              'raw',
              new TextEncoder().encode(settings.webhook_secret),
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
            headers['X-Signature'] = Array.from(new Uint8Array(sig))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }
          await fetch(settings.webhook_url, { method: 'POST', headers, body: payload });
        } catch (e) {
          console.error('Gagal meneruskan webhook sandbox:', e);
        }
      }
    }

    return json({ status: 'ok', mode: 'sandbox', reference: transaction.partner_reference_no, newStatus });
  } catch (error) {
    console.error('sandbox-simulate error:', error);
    return json({ status: 'error', message: (error as Error).message }, 500);
  }
});
