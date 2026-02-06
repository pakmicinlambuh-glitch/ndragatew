import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Allow from sanpay.site IP: 103.127.137.140
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const merchantCodeHeader = req.headers.get('X-Merchant-Code');
    const signatureHeader = req.headers.get('X-Signature');
    const rawBody = await req.text();
    const data = JSON.parse(rawBody);

    console.log('Callback received:', data);

    // Get API settings for validation
    const { data: apiSettings } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .single();

    if (apiSettings && merchantCodeHeader) {
      // Validate merchant code
      if (merchantCodeHeader !== apiSettings.merchant_code) {
        console.error('Invalid merchant code');
        return new Response(JSON.stringify({ status: 'error', message: 'Invalid Merchant Code' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate signature
      if (signatureHeader && apiSettings.api_key) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(apiSettings.api_key),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
        const calculatedSignature = Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (calculatedSignature !== signatureHeader) {
          console.error('Invalid signature');
          return new Response(JSON.stringify({ status: 'error', message: 'Invalid Signature' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Check if validation test
    if (data.isValidationTest) {
      console.log('Validation test received');
      return new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle QRIS callback
    if (data.transactionID && data.referenceNo) {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          external_id: data.transactionID,
          paid_at: new Date().toISOString(),
          callback_data: data,
        })
        .eq('partner_reference_no', data.referenceNo);

      if (error) console.error('Update error:', error);
    }

    // Handle VA/Retail callback
    if (data.partnerReferenceNo && data.payment_status === 'PAID') {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          external_id: data.external_id,
          paid_at: new Date().toISOString(),
          callback_data: data,
        })
        .eq('partner_reference_no', data.partnerReferenceNo);

      if (error) console.error('Update error:', error);
    }

    return new Response(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
