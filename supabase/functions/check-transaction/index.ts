import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');
    const apiKey = req.headers.get('X-API-Key');

    if (!ref) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Parameter ref diperlukan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch transaction by reference number
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('partner_reference_no', ref)
      .single();

    if (error || !transaction) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Transaksi tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic public response
    const publicResponse = {
      status: 'success',
      data: {
        partnerReferenceNo: transaction.partner_reference_no,
        status: transaction.status,
        amount: transaction.amount,
        totalAmount: transaction.total_amount,
        paymentMethod: transaction.payment_method,
        expiresAt: transaction.expires_at,
        paidAt: transaction.paid_at,
        createdAt: transaction.created_at,
      },
    };

    // If API key provided, validate and return more details
    if (apiKey) {
      const { data: apiSettings, error: apiError } = await supabase
        .from('user_api_settings')
        .select('user_id, is_active')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (!apiError && apiSettings) {
        // Check if the transaction belongs to this user
        if (transaction.user_id === apiSettings.user_id) {
          return new Response(
            JSON.stringify({
              status: 'success',
              data: {
                ...publicResponse.data,
                channelCode: transaction.channel_code,
                customerName: transaction.customer_name,
                customerEmail: transaction.customer_email,
                customerPhone: transaction.customer_phone,
                adminFee: transaction.admin_fee,
                vaNumber: transaction.va_number,
                paymentCode: transaction.payment_code,
                qrContent: transaction.qr_content,
                paymentUrl: transaction.payment_url,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(JSON.stringify(publicResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error checking transaction:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Terjadi kesalahan server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
