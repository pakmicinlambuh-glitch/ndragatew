import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, resolveProvider, loadProvider } from "../_shared/providers/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const {
      transactionId,
      amount,
      totalAmount,
      paymentMethod,
      channelCode,
      partnerReferenceNo,
      customerName,
      customerEmail,
      customerPhone,
      providerId,
      server,
    } = await req.json();

    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, user_id, total_amount, amount')
      .eq('id', transactionId)
      .maybeSingle();

    const provider = providerId
      ? await loadProvider(supabase, { id: providerId, requireActive: true })
      : await resolveProvider(supabase, { userId: transaction?.user_id ?? null, serverLabel: server ?? null, paymentMethod });

    const finalTotal = totalAmount ?? transaction?.total_amount ?? amount;

    if (!provider) {
      // Demo mode when no provider (server) is configured yet
      let updateData: Record<string, unknown> = {};
      if (paymentMethod === 'qris') {
        updateData = { qr_content: `00020101021226860014ID.CO.CINGATEWAY.WWW0215ID${Date.now()}52040000530336054${amount}5802ID5913CinGateway6001${partnerReferenceNo}` };
      } else if (paymentMethod === 'va') {
        updateData = { va_number: `${channelCode === 'BCA' ? '1234' : channelCode === 'BNI' ? '8810' : '0088'}${Math.floor(1000000000 + Math.random() * 9000000000)}` };
      } else if (paymentMethod === 'retail') {
        updateData = { payment_code: `${Math.floor(100000000000 + Math.random() * 900000000000)}` };
      }
      await supabase.from('transactions').update(updateData).eq('id', transactionId);
      return json({ success: true, demo: true });
    }

    const adapter = getAdapter(provider.adapter_type);
    const result = await adapter.createPayment(provider, {
      amount: amount,
      totalAmount: finalTotal,
      paymentMethod,
      channelCode,
      referenceNo: partnerReferenceNo,
      customerName,
      customerEmail,
      customerPhone,
      expirySeconds: 900,
      callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/provider-webhook?provider=${provider.code}`,
    });

    if (!result.success) {
      return json({ success: false, error: result.error || 'Provider menolak permintaan', raw: result.raw }, 400);
    }

    const updateData: Record<string, unknown> = { provider_id: provider.id, provider_payload: result.raw ?? null };
    if (result.qrContent) updateData.qr_content = result.qrContent;
    if (result.vaNumber) updateData.va_number = result.vaNumber;
    if (result.paymentCode) updateData.payment_code = result.paymentCode;
    if (result.providerReference) {
      updateData.provider_reference = result.providerReference;
      updateData.external_id = result.providerReference;
    }
    if (result.expiresAt) updateData.expires_at = result.expiresAt;

    await supabase.from('transactions').update(updateData).eq('id', transactionId);

    return json({ success: true, provider: provider.code, result });
  } catch (error) {
    console.error('create-payment error:', error);
    return json({ success: false, error: (error as Error).message }, 500);
  }
});
