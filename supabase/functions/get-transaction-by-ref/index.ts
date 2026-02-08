import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');

    if (!ref) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Reference number is required',
        code: 'MISSING_REF'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate ref format to prevent injection
    if (!/^[A-Za-z0-9\-_]+$/.test(ref) || ref.length > 64) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid reference format',
        code: 'INVALID_REF'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        id,
        partner_reference_no,
        amount,
        admin_fee,
        total_amount,
        payment_method,
        channel_code,
        customer_name,
        status,
        qr_content,
        va_number,
        payment_code,
        expires_at,
        paid_at,
        created_at
      `)
      .eq('partner_reference_no', ref)
      .single();

    if (error || !transaction) {
      console.log('Transaction not found:', ref);
      return new Response(JSON.stringify({
        success: false,
        error: 'Transaction not found',
        code: 'NOT_FOUND'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if expired
    if (transaction.expires_at && new Date(transaction.expires_at) < new Date()) {
      if (transaction.status === 'pending') {
        // Update status to expired
        await supabase
          .from('transactions')
          .update({ status: 'expired' })
          .eq('id', transaction.id);
        transaction.status = 'expired';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: transaction.id,
        partnerReferenceNo: transaction.partner_reference_no,
        amount: transaction.amount,
        adminFee: transaction.admin_fee,
        totalAmount: transaction.total_amount,
        paymentMethod: transaction.payment_method,
        channelCode: transaction.channel_code,
        customerName: transaction.customer_name,
        status: transaction.status,
        qrContent: transaction.qr_content,
        vaNumber: transaction.va_number,
        paymentCode: transaction.payment_code,
        expiresAt: transaction.expires_at,
        paidAt: transaction.paid_at,
        createdAt: transaction.created_at,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
