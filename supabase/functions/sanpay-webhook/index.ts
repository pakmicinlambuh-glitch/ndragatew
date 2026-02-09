import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-merchant-code, x-signature, x-timestamp',
};

// IP whitelist for sanpay.site
const ALLOWED_IPS = ['103.127.137.140'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('cf-connecting-ip') 
      || 'unknown';

    console.log(`Webhook received from IP: ${clientIp}`);

    // Validate IP (optional - can be disabled for testing)
    // if (!ALLOWED_IPS.includes(clientIp)) {
    //   console.warn(`Unauthorized IP: ${clientIp}`);
    //   return new Response(
    //     JSON.stringify({ status: 'error', message: 'Unauthorized IP' }),
    //     { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    const body = await req.json();
    console.log('Webhook payload:', JSON.stringify(body));

    // Extract webhook data - support multiple formats
    const partnerReferenceNo = body.partnerReferenceNo || body.partner_reference_no || body.reference_no || body.trx_id;
    const status = body.status || body.transaction_status;
    const paidAmount = body.paidAmount || body.paid_amount || body.amount;
    const paidAt = body.paidAt || body.paid_at || body.payment_time;

    if (!partnerReferenceNo) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'partnerReferenceNo diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the transaction
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('partner_reference_no', partnerReferenceNo)
      .single();

    if (findError || !transaction) {
      console.error('Transaction not found:', partnerReferenceNo);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Transaksi tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map status from webhook to our status
    let mappedStatus = transaction.status;
    if (status === 'paid' || status === 'success' || status === 'settlement' || status === 'PAID') {
      mappedStatus = 'paid';
    } else if (status === 'expired' || status === 'EXPIRED') {
      mappedStatus = 'expired';
    } else if (status === 'failed' || status === 'FAILED' || status === 'cancel' || status === 'deny') {
      mappedStatus = 'failed';
    }

    // Update transaction
    const updateData: Record<string, unknown> = {
      status: mappedStatus,
      callback_data: body,
      updated_at: new Date().toISOString(),
    };

    if (mappedStatus === 'paid' && !transaction.paid_at) {
      updateData.paid_at = paidAt || new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Gagal update transaksi' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Transaction ${partnerReferenceNo} updated to ${mappedStatus}`);

    // If transaction has user, try to forward to their webhook
    if (transaction.user_id && mappedStatus === 'paid') {
      const { data: userApiSettings } = await supabase
        .from('user_api_settings')
        .select('webhook_url, webhook_secret')
        .eq('user_id', transaction.user_id)
        .eq('is_active', true)
        .single();

      if (userApiSettings?.webhook_url) {
        try {
          const webhookPayload = {
            event: 'payment.success',
            partnerReferenceNo: transaction.partner_reference_no,
            status: mappedStatus,
            amount: transaction.amount,
            totalAmount: transaction.total_amount,
            paymentMethod: transaction.payment_method,
            channelCode: transaction.channel_code,
            paidAt: updateData.paid_at,
            timestamp: new Date().toISOString(),
          };

          const webhookResponse = await fetch(userApiSettings.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Secret': userApiSettings.webhook_secret || '',
            },
            body: JSON.stringify(webhookPayload),
          });

          console.log(`User webhook forwarded: ${userApiSettings.webhook_url}, status: ${webhookResponse.status}`);
        } catch (webhookError) {
          console.error('Error forwarding to user webhook:', webhookError);
          // Don't fail the main response if webhook forward fails
        }
      }

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: transaction.user_id,
        title: 'Pembayaran Berhasil',
        message: `Transaksi ${transaction.partner_reference_no} telah dibayar sebesar Rp ${transaction.total_amount?.toLocaleString('id-ID')}`,
        type: 'success',
      });
    }

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Callback processed',
        partnerReferenceNo,
        transactionStatus: mappedStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
