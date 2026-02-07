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

    // Find the transaction first
    let transaction = null;
    let referenceNo = data.referenceNo || data.partnerReferenceNo || data.partner_reff;

    if (referenceNo) {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('partner_reference_no', referenceNo)
        .single();

      if (!txError && txData) {
        transaction = txData;
      }
    }

    // Determine the status
    let newStatus = 'paid';
    if (data.payment_status === 'EXPIRED' || data.status === 'expired') {
      newStatus = 'expired';
    } else if (data.payment_status === 'FAILED' || data.status === 'failed') {
      newStatus = 'failed';
    }

    // Handle QRIS callback
    if (data.transactionID && data.referenceNo) {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: newStatus,
          external_id: data.transactionID,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
          callback_data: data,
        })
        .eq('partner_reference_no', data.referenceNo);

      if (error) console.error('Update error:', error);
    }

    // Handle VA/Retail callback
    if (data.partnerReferenceNo) {
      const isPaid = data.payment_status === 'PAID' || data.status === 'paid' || data.status === 'success';
      const { error } = await supabase
        .from('transactions')
        .update({
          status: isPaid ? 'paid' : newStatus,
          external_id: data.external_id,
          paid_at: isPaid ? new Date().toISOString() : null,
          callback_data: data,
        })
        .eq('partner_reference_no', data.partnerReferenceNo);

      if (error) console.error('Update error:', error);
    }

    // Forward webhook to user if transaction has user_id
    if (transaction && transaction.user_id) {
      const { data: userApiSettings } = await supabase
        .from('user_api_settings')
        .select('*')
        .eq('user_id', transaction.user_id)
        .eq('is_active', true)
        .single();

      if (userApiSettings?.webhook_url) {
        try {
          const webhookPayload = {
            event: newStatus === 'paid' ? 'payment.success' : `payment.${newStatus}`,
            data: {
              transaction_id: transaction.id,
              reference_no: transaction.partner_reference_no,
              amount: transaction.amount,
              admin_fee: transaction.admin_fee,
              total_amount: transaction.total_amount,
              payment_method: transaction.payment_method,
              channel_code: transaction.channel_code,
              customer_name: transaction.customer_name,
              customer_email: transaction.customer_email,
              status: newStatus,
              paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
            },
            timestamp: new Date().toISOString(),
          };

          // Generate signature using webhook secret
          const encoder = new TextEncoder();
          const payloadString = JSON.stringify(webhookPayload);
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(userApiSettings.webhook_secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadString));
          const webhookSignature = Array.from(new Uint8Array(signatureBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

          // Send webhook to user
          const webhookResponse = await fetch(userApiSettings.webhook_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': webhookSignature,
            },
            body: payloadString,
          });

          console.log('User webhook sent to:', userApiSettings.webhook_url, 'Status:', webhookResponse.status);
        } catch (webhookError) {
          console.error('Error sending user webhook:', webhookError);
        }
      }
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
