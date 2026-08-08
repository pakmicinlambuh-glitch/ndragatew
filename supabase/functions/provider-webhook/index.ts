import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAdapter, loadProvider } from '../_shared/providers/index.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-callback-signature, x-callback-token, x-merchant-code, x-timestamp',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const providerCode = url.searchParams.get('provider') || url.pathname.split('/').filter(Boolean).pop();

  if (req.method !== 'POST') {
    return json({ status: 'ok', message: `Webhook endpoint aktif${providerCode ? ` untuk ${providerCode}` : ''}` });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!providerCode || providerCode === 'provider-webhook') {
      return json({ status: 'error', message: 'Parameter provider diperlukan' }, 400);
    }

    const provider = await loadProvider(supabase, { code: providerCode });
    if (!provider) return json({ status: 'error', message: 'Provider tidak ditemukan' }, 404);

    const rawBody = await req.text();
    const adapter = getAdapter(provider.adapter_type);
    const parsed = await adapter.parseWebhook(provider, rawBody, req.headers);

    if (!parsed.valid) {
      console.error(`[${providerCode}] webhook ditolak:`, parsed.error);
      return json({ status: 'error', message: parsed.error || 'Webhook tidak valid' }, 401);
    }

    if (!parsed.reference && !parsed.providerReference) {
      return json({ status: 'error', message: 'Referensi transaksi tidak ditemukan pada payload' }, 400);
    }

    let query = supabase.from('transactions').select('*');
    query = parsed.reference
      ? query.eq('partner_reference_no', parsed.reference)
      : query.eq('provider_reference', parsed.providerReference);

    const { data: transaction } = await query.maybeSingle();
    if (!transaction) return json({ status: 'error', message: 'Transaksi tidak ditemukan' }, 404);

    const newStatus = parsed.status ?? transaction.status;

    // Idempotency: a finished transaction is never re-processed
    if (['paid', 'expired', 'failed'].includes(transaction.status)) {
      return json({ status: 'ok', message: 'Transaksi sudah final', current: transaction.status });
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      callback_data: (() => { try { return JSON.parse(rawBody); } catch { return { raw: rawBody }; } })(),
      updated_at: new Date().toISOString(),
    };
    if (parsed.providerReference) updateData.provider_reference = parsed.providerReference;
    if (newStatus === 'paid' && !transaction.paid_at) updateData.paid_at = parsed.paidAt || new Date().toISOString();

    const { error: updateError } = await supabase.from('transactions').update(updateData).eq('id', transaction.id);
    if (updateError) {
      console.error('Gagal update transaksi:', updateError);
      return json({ status: 'error', message: 'Gagal update transaksi' }, 500);
    }

    // Credit merchant balance and forward the merchant webhook on success
    if (newStatus === 'paid' && transaction.user_id) {
      const { data: settings } = await supabase
        .from('user_api_settings')
        .select('webhook_url, webhook_secret')
        .eq('user_id', transaction.user_id)
        .eq('is_active', true)
        .maybeSingle();

      if (settings?.webhook_url) {
        const payload = JSON.stringify({
          event: 'payment.success',
          partnerReferenceNo: transaction.partner_reference_no,
          status: 'paid',
          amount: transaction.amount,
          totalAmount: transaction.total_amount,
          paymentMethod: transaction.payment_method,
          channelCode: transaction.channel_code,
          paidAt: updateData.paid_at,
        });

        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (settings.webhook_secret) {
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(settings.webhook_secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
            headers['X-Signature'] = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
          }
          await fetch(settings.webhook_url, { method: 'POST', headers, body: payload });
        } catch (e) {
          console.error('Gagal meneruskan webhook merchant:', e);
        }
      }
    }

    return json({ status: 'ok', reference: transaction.partner_reference_no, newStatus });
  } catch (error) {
    console.error('Webhook error:', error);
    return json({ status: 'error', message: (error as Error).message }, 500);
  }
});
