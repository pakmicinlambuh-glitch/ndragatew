import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface PaymentRequest {
  amount: number;
  payment_method: 'qris' | 'va' | 'retail';
  channel_code?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  reference_no?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get API key from header
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API key required. Add X-API-Key header.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key and get user
    const { data: apiSettings, error: apiError } = await supabase
      .from('user_api_settings')
      .select('*, profiles!inner(user_id, full_name)')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (apiError || !apiSettings) {
      console.error('Invalid API key:', apiError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid API key' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = apiSettings.user_id;
    const body: PaymentRequest = await req.json();

    // Validate required fields
    if (!body.amount || !body.payment_method || !body.customer_name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: amount, payment_method, customer_name'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate amount
    if (body.amount < 10000 || body.amount > 50000000) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Amount must be between 10,000 and 50,000,000'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate channel_code for VA and Retail
    if ((body.payment_method === 'va' || body.payment_method === 'retail') && !body.channel_code) {
      return new Response(JSON.stringify({
        success: false,
        error: 'channel_code is required for VA and Retail payments'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get fee settings
    const channelCode = body.payment_method === 'qris' ? 'QRIS' : body.channel_code;
    const { data: feeSettings } = await supabase
      .from('fee_settings')
      .select('*')
      .eq('channel_code', channelCode)
      .eq('is_active', true)
      .single();

    // Calculate fees
    let adminFee = 0;
    if (feeSettings) {
      if (feeSettings.base_fee_type === 'fixed') {
        adminFee = feeSettings.base_fee_value;
      } else {
        adminFee = (body.amount * feeSettings.base_fee_value) / 100;
      }
      if (feeSettings.markup_fee_type === 'fixed') {
        adminFee += feeSettings.markup_fee_value;
      } else {
        adminFee += (body.amount * feeSettings.markup_fee_value) / 100;
      }
      adminFee = Math.ceil(adminFee);
    }

    const totalAmount = body.amount + adminFee;

    // Generate reference number
    const referenceNo = body.reference_no || `API-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate payment URL
    const baseUrl = req.headers.get('origin') || 'https://id-preview--cc93fdb6-4ac9-425b-a25e-3a39a149b730.lovable.app';
    const paymentUrl = `${baseUrl}/checkout?ref=${referenceNo}`;

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        partner_reference_no: referenceNo,
        amount: body.amount,
        admin_fee: adminFee,
        total_amount: totalAmount,
        payment_method: body.payment_method,
        channel_code: channelCode,
        customer_name: body.customer_name,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        payment_url: paymentUrl,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create transaction'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get API settings for sanpay
    const { data: apiConfig } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .single();

    // Call sanpay API if configured
    let paymentData: any = { demo: true };
    if (apiConfig?.api_key && apiConfig?.merchant_code) {
      try {
        let endpoint = '';
        let requestBody: any = {};

        if (body.payment_method === 'qris') {
          endpoint = 'https://sanpay.site/api/v1/topup_qris';
          requestBody = {
            apikey: apiConfig.api_key,
            merchant_code: apiConfig.merchant_code,
            partner_reff: referenceNo,
            amount: body.amount.toString(),
            customer_name: body.customer_name,
          };
        } else if (body.payment_method === 'va') {
          endpoint = 'https://sanpay.site/api/v1/topup_va';
          requestBody = {
            apikey: apiConfig.api_key,
            merchant_code: apiConfig.merchant_code,
            partner_reff: referenceNo,
            bank_code: body.channel_code,
            amount: body.amount.toString(),
            customer_name: body.customer_name,
          };
        } else if (body.payment_method === 'retail') {
          endpoint = 'https://sanpay.site/api/v1/topup_retail';
          requestBody = {
            apikey: apiConfig.api_key,
            merchant_code: apiConfig.merchant_code,
            partner_reff: referenceNo,
            retail_code: body.channel_code,
            amount: body.amount.toString(),
            customer_name: body.customer_name,
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        console.log('Sanpay response:', result);

        if (result.status === 'success' && result.data) {
          paymentData = result.data;
          
          // Update transaction with payment details
          const updateData: any = {};
          if (result.data.qr_content) updateData.qr_content = result.data.qr_content;
          if (result.data.va_number) updateData.va_number = result.data.va_number;
          if (result.data.payment_code) updateData.payment_code = result.data.payment_code;
          if (result.data.external_id) updateData.external_id = result.data.external_id;

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from('transactions')
              .update(updateData)
              .eq('id', transaction.id);
          }
        }
      } catch (e) {
        console.error('Sanpay API error:', e);
      }
    } else {
      // Demo mode - generate fake data
      if (body.payment_method === 'qris') {
        const demoQr = `00020101021226860014ID.CO.CINGATEWAY.WWW0215ID${Date.now()}52040000530336054${body.amount.toString().padStart(5, '0')}5802ID5913CinGateway6001${referenceNo}`;
        await supabase
          .from('transactions')
          .update({ qr_content: demoQr })
          .eq('id', transaction.id);
        paymentData.qr_content = demoQr;
      } else if (body.payment_method === 'va') {
        const demoVa = `${body.channel_code}${Math.floor(1000000000000 + Math.random() * 9000000000000)}`;
        await supabase
          .from('transactions')
          .update({ va_number: demoVa })
          .eq('id', transaction.id);
        paymentData.va_number = demoVa;
      } else if (body.payment_method === 'retail') {
        const demoCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        await supabase
          .from('transactions')
          .update({ payment_code: demoCode })
          .eq('id', transaction.id);
        paymentData.payment_code = demoCode;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        transaction_id: transaction.id,
        reference_no: referenceNo,
        amount: body.amount,
        admin_fee: adminFee,
        total_amount: totalAmount,
        payment_method: body.payment_method,
        channel_code: channelCode,
        payment_url: paymentUrl,
        expires_at: transaction.expires_at,
        status: 'pending',
        ...paymentData,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
