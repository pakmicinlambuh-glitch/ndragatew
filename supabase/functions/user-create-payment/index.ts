import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdapter, resolveProvider } from "../_shared/providers/index.ts";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-merchant-code, x-signature, x-timestamp',
};

interface PaymentRequest {
  amount: number;
  partnerReferenceNo: string;
  expirySeconds?: number;
  // For VA
  bank_code?: string;
  name?: string;
  // For Retail
  retail_outlet?: string;
  // Legacy support
  payment_method?: 'qris' | 'va' | 'retail';
  channel_code?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  reference_no?: string;
}

// HMAC-SHA256 signature validation
async function validateSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return calculatedSignature.toLowerCase() === signature.toLowerCase();
  } catch (e) {
    console.error('Signature validation error:', e);
    return false;
  }
}

// Generate HMAC-SHA256 signature
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Detect request type based on body structure
function detectPaymentType(body: any): 'qris' | 'va' | 'retail' {
  if (body.bank_code) return 'va';
  if (body.retail_outlet) return 'retail';
  if (body.payment_method) return body.payment_method;
  return 'qris';
}

// Calculate tiered QRIS fee
function calculateTieredFee(amount: number, feeSettings: any): number {
  if (!feeSettings) return 0;
  
  const threshold = feeSettings.threshold_amount || 500000;
  let baseFee = 0;
  
  // Calculate base fee based on threshold
  if (amount < threshold) {
    // Use fee_below_threshold (percentage)
    baseFee = (amount * (feeSettings.fee_below_threshold || 0)) / 100;
  } else {
    // Use fee_above_threshold (percentage) 
    baseFee = (amount * (feeSettings.fee_above_threshold || 0.5)) / 100;
  }
  
  // Add markup fee
  let markupFee = 0;
  if (feeSettings.markup_fee_type === 'fixed') {
    markupFee = feeSettings.markup_fee_value || 0;
  } else {
    markupFee = (amount * (feeSettings.markup_fee_value || 0)) / 100;
  }
  
  return Math.ceil(baseFee + markupFee);
}

// Calculate standard fee for VA/Retail.
// Base fee prefers the selected provider's channel, markup always comes from platform settings.
function calculateStandardFee(amount: number, feeSettings: any, providerChannel?: any): number {
  if (!feeSettings && !providerChannel) return 0;

  const baseSource = providerChannel ?? feeSettings;
  let baseFee = 0;
  if (!baseSource) {
    baseFee = 0;
  } else if (baseSource.base_fee_type === 'fixed') {
    baseFee = baseSource.base_fee_value || 0;
  } else {
    baseFee = (amount * (baseSource.base_fee_value || 0)) / 100;
  }

  
  let markupFee = 0;
  if (feeSettings.markup_fee_type === 'fixed') {
    markupFee = feeSettings.markup_fee_value || 0;
  } else {
    markupFee = (amount * (feeSettings.markup_fee_value || 0)) / 100;
  }
  
  return Math.ceil(baseFee + markupFee);
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

    // Get authentication headers
    const apiKey = req.headers.get('x-api-key');
    const merchantCode = req.headers.get('x-merchant-code');
    const signature = req.headers.get('x-signature');

    // Get raw body for signature validation
    const rawBody = await req.text();
    let body: PaymentRequest;
    
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return new Response(JSON.stringify({ 
        status: 'error',
        error: 'Invalid JSON body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine authentication method
    let userId: string;
    let merchantName = 'CinGateway Merchant';
    let webhookUrl: string | null = null;
    let webhookSecret: string | null = null;

    if (merchantCode && signature) {
      // SNAP BI style authentication with signature
      console.log('Using signature-based authentication');
      
      const { data: apiSettings, error: apiError } = await supabase
        .from('user_api_settings')
        .select('*, profiles(user_id, full_name)')
        .eq('is_active', true);

      if (apiError || !apiSettings || apiSettings.length === 0) {
        return new Response(JSON.stringify({ 
          status: 'error',
          error: 'No active API credentials found' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find matching credentials by validating signature
      let validSettings = null;
      for (const settings of apiSettings) {
        const expectedMerchantCode = `MC-${settings.api_key.substring(0, 8).toUpperCase()}`;
        
        if (merchantCode === expectedMerchantCode) {
          const secret = settings.webhook_secret || settings.api_key;
          const isValid = await validateSignature(rawBody, signature, secret);
          
          if (isValid) {
            validSettings = settings;
            break;
          }
        }
      }

      if (!validSettings) {
        return new Response(JSON.stringify({ 
          status: 'error',
          error: 'Invalid merchant code or signature' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = validSettings.user_id;
      merchantName = validSettings.profiles?.full_name || merchantName;
      webhookUrl = validSettings.webhook_url;
      webhookSecret = validSettings.webhook_secret;
      
    } else if (apiKey) {
      // Simple API key authentication
      console.log('Using API key authentication');
      
      const { data: apiSettings, error: apiError } = await supabase
        .from('user_api_settings')
        .select('*, profiles(user_id, full_name)')
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .single();

      if (apiError || !apiSettings) {
        console.error('Invalid API key:', apiError);
        return new Response(JSON.stringify({ 
          status: 'error',
          error: 'Invalid API key' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      userId = apiSettings.user_id;
      merchantName = apiSettings.profiles?.full_name || merchantName;
      webhookUrl = apiSettings.webhook_url;
      webhookSecret = apiSettings.webhook_secret;
      
    } else {
      return new Response(JSON.stringify({ 
        status: 'error',
        error: 'Authentication required. Use X-API-Key header or X-Merchant-Code with X-Signature.' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Detect payment type
    const paymentType = detectPaymentType(body);
    
    // Normalize request fields
    const amount = body.amount;
    const customerName = body.name || body.customer_name || 'Customer';
    const customerEmail = body.customer_email || null;
    const customerPhone = body.customer_phone || null;
    const referenceNo = body.partnerReferenceNo || body.reference_no || `API-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expirySeconds = body.expirySeconds || 900; // 15 minutes default
    
    // Determine channel code
    let channelCode: string;
    if (paymentType === 'qris') {
      channelCode = 'QRIS';
    } else if (paymentType === 'va') {
      channelCode = body.bank_code || body.channel_code || '';
    } else {
      channelCode = body.retail_outlet || body.channel_code || '';
    }

    // Validate amount
    if (!amount || amount < 10000 || amount > 50000000) {
      return new Response(JSON.stringify({
        status: 'error',
        error: 'Amount must be between 10,000 and 50,000,000'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate channel for VA/Retail
    if ((paymentType === 'va' || paymentType === 'retail') && !channelCode) {
      return new Response(JSON.stringify({
        status: 'error',
        error: paymentType === 'va' ? 'bank_code is required' : 'retail_outlet is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve which provider (server) handles this transaction
    const requestedServer = (body as any).server ?? (body as any).provider ?? null;
    const provider = await resolveProvider(supabase, {
      userId,
      serverLabel: requestedServer,
      paymentMethod: paymentType,
    });

    // Base fee comes from the selected provider's channel when available
    let providerChannel: any = null;
    if (provider && channelCode) {
      const { data } = await supabase
        .from('provider_channels')
        .select('*')
        .eq('provider_id', provider.id)
        .eq('channel_code', channelCode)
        .maybeSingle();
      providerChannel = data;
    }

    // Get fee settings (platform markup)
    const { data: feeSettings } = await supabase
      .from('fee_settings')
      .select('*')
      .eq('channel_code', channelCode)
      .eq('is_active', true)
      .maybeSingle();

    // Calculate fee based on payment type
    let adminFee: number;
    if (paymentType === 'qris') {
      adminFee = calculateTieredFee(amount, feeSettings);
    } else {
      adminFee = calculateStandardFee(amount, feeSettings, providerChannel);
    }

    const totalAmount = amount + adminFee;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000).toISOString();
    
    // Generate payment URL
    const baseUrl = 'https://ndragatew.lovable.app';
    const paymentUrl = `${baseUrl}/checkout?ref=${referenceNo}`;

    // Create transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        partner_reference_no: referenceNo,
        amount: amount,
        admin_fee: adminFee,
        total_amount: totalAmount,
        payment_method: paymentType,
        channel_code: channelCode,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_url: paymentUrl,
        status: 'pending',
        expires_at: expiresAt,
        provider_id: provider?.id ?? null,
      })

      .select()
      .single();

    if (txError) {
      console.error('Error creating transaction:', txError);
      return new Response(JSON.stringify({
        status: 'error',
        error: 'Failed to create transaction'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format expires date
    const expiresDate = new Date(expiresAt);
    const formattedExpiresAt = expiresDate.toISOString().replace('T', ' ').substring(0, 19);
    const isoExpiresAt = expiresDate.toISOString().replace('Z', '+07:00');

    // Call the selected provider (server) through its adapter
    let paymentDetails: any = {};

    if (provider) {
      try {
        const adapter = getAdapter(provider.adapter_type);
        const result = await adapter.createPayment(provider, {
          amount,
          totalAmount,
          paymentMethod: paymentType,
          channelCode,
          referenceNo,
          customerName,
          customerEmail,
          customerPhone,
          expirySeconds,
          callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/provider-webhook?provider=${provider.code}`,
          returnUrl: paymentUrl,
        });

        console.log(`Provider ${provider.code} response:`, JSON.stringify(result).substring(0, 500));

        if (result.success) {
          paymentDetails = {
            status: 'success',
            qrContent: result.qrContent,
            va_number: result.vaNumber,
            payment_code: result.paymentCode,
          };

          const updateData: any = { provider_payload: result.raw ?? null };
          if (result.qrContent) updateData.qr_content = result.qrContent;
          if (result.vaNumber) updateData.va_number = result.vaNumber;
          if (result.paymentCode) updateData.payment_code = result.paymentCode;
          if (result.providerReference) {
            updateData.provider_reference = result.providerReference;
            updateData.external_id = result.providerReference;
          }
          if (result.expiresAt) updateData.expires_at = result.expiresAt;

          await supabase.from('transactions').update(updateData).eq('id', transaction.id);
        } else {
          console.error('Provider error:', result.error);
        }
      } catch (e) {
        console.error('Provider API error:', e);
      }
    }

    // Demo mode - generate placeholder data when no provider is configured
    if (!paymentDetails.status) {
      if (paymentType === 'qris') {
        const demoQr = `00020101021226860014ID.CO.CINGATEWAY0215${Date.now()}52040000530336054${amount.toString().padStart(10, '0')}5802ID5913CinGateway6015Jakarta Pusat61051034062${referenceNo}6304`;
        await supabase
          .from('transactions')
          .update({ qr_content: demoQr })
          .eq('id', transaction.id);
        paymentDetails = {
          status: 'success',
          qrContent: demoQr
        };
      } else if (paymentType === 'va') {
        const demoVa = `${channelCode === 'BCA' ? '123' : channelCode === 'BNI' ? '888' : channelCode === 'BRI' ? '999' : '777'}${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        await supabase
          .from('transactions')
          .update({ va_number: demoVa })
          .eq('id', transaction.id);
        paymentDetails = {
          status: 'success',
          va_number: demoVa
        };
      } else if (paymentType === 'retail') {
        const demoCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        await supabase
          .from('transactions')
          .update({ payment_code: demoCode })
          .eq('id', transaction.id);
        paymentDetails = {
          status: 'success',
          payment_code: demoCode
        };
      }
    }


    // Build response based on payment type (sanpay.site compatible format)
    let responseData: any;
    
    if (paymentType === 'qris') {
      responseData = {
        status: 'success',
        partnerReferenceNo: referenceNo,
        merchantName: merchantName,
        amount: amount,
        qrContent: paymentDetails.qrContent || paymentDetails.qr_content,
        expiresAt: formattedExpiresAt,
        paymentUrl: paymentUrl
      };
    } else if (paymentType === 'va') {
      responseData = {
        status: 'success',
        partnerReferenceNo: referenceNo,
        amount: amount,
        bank_code: channelCode,
        va_number: paymentDetails.va_number,
        expiration_date: isoExpiresAt,
        paymentUrl: paymentUrl
      };
    } else {
      responseData = {
        status: 'success',
        partnerReferenceNo: referenceNo,
        amount: amount,
        retail_outlet: channelCode,
        payment_code: paymentDetails.payment_code,
        expiration_date: isoExpiresAt,
        paymentUrl: paymentUrl
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
