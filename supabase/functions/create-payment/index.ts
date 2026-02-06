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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { transactionId, amount, paymentMethod, channelCode, partnerReferenceNo, customerName } = await req.json();

    // Get API settings
    const { data: apiSettings, error: apiError } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .single();

    if (apiError || !apiSettings) {
      // For demo, just update transaction with mock data
      let updateData: Record<string, unknown> = {};

      if (paymentMethod === 'qris') {
        updateData = {
          qr_content: `00020101021226860014ID.CO.CINGATEWAY.WWW0215ID${Date.now()}52040000530336054${amount}5802ID5913CinGateway6001${partnerReferenceNo}`,
        };
      } else if (paymentMethod === 'va') {
        updateData = {
          va_number: `${channelCode === 'BCA' ? '1234' : channelCode === 'BNI' ? '8810' : '0088'}${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        };
      } else if (paymentMethod === 'retail') {
        updateData = {
          payment_code: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        };
      }

      await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', transactionId);

      return new Response(JSON.stringify({ success: true, demo: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Real API call to sanpay.site
    const apiKey = apiSettings.api_key;
    const merchantCode = apiSettings.merchant_code;

    const body = JSON.stringify({
      amount,
      partnerReferenceNo,
      ...(paymentMethod === 'va' && { bank_code: channelCode, name: customerName }),
      ...(paymentMethod === 'retail' && { retail_outlet: channelCode, name: customerName }),
      ...(paymentMethod === 'qris' && { expirySeconds: 900 }),
    });

    // Generate signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(apiKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const endpoint = paymentMethod === 'qris' 
      ? 'topup_qris' 
      : paymentMethod === 'va' 
        ? 'topup_va' 
        : 'topup_retail';

    const response = await fetch(`https://sanpay.site/api/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Merchant-Code': merchantCode,
        'X-Signature': signatureHex,
      },
      body,
    });

    const result = await response.json();

    if (result.status === 'success') {
      let updateData: Record<string, unknown> = {};

      if (paymentMethod === 'qris') {
        updateData = { qr_content: result.qrContent };
      } else if (paymentMethod === 'va') {
        updateData = { va_number: result.va_number, expires_at: result.expiration_date };
      } else if (paymentMethod === 'retail') {
        updateData = { payment_code: result.payment_code, expires_at: result.expiration_date };
      }

      await supabase.from('transactions').update(updateData).eq('id', transactionId);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
