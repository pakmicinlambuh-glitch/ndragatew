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

    // Get API settings
    const { data: apiSettings, error: apiError } = await supabase
      .from('api_settings')
      .select('*')
      .limit(1)
      .single();

    if (apiError || !apiSettings) {
      // Insert default channels for demo
      const defaultChannels = [
        { channel_code: 'QRIS', channel_name: 'QRIS', channel_type: 'qris', base_fee_type: 'percent', base_fee_value: 0.7, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'BCA', channel_name: 'Bank Central Asia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'BNI', channel_name: 'Bank Negara Indonesia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'BRI', channel_name: 'Bank Rakyat Indonesia', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'MANDIRI', channel_name: 'Bank Mandiri', channel_type: 'va', base_fee_type: 'fixed', base_fee_value: 4000, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'ALFAMART', channel_name: 'Alfamart', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 2500, markup_fee_type: 'fixed', markup_fee_value: 0 },
        { channel_code: 'INDOMARET', channel_name: 'Indomaret', channel_type: 'retail', base_fee_type: 'fixed', base_fee_value: 2500, markup_fee_type: 'fixed', markup_fee_value: 0 },
      ];

      for (const channel of defaultChannels) {
        await supabase.from('fee_settings').upsert(channel, { onConflict: 'channel_code' });
      }

      return new Response(JSON.stringify({ success: true, channels: defaultChannels, demo: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch from sanpay.site
    const response = await fetch(
      `https://sanpay.site/api/v1/get_channels?apikey=${apiSettings.api_key}&merchant_code=${apiSettings.merchant_code}`
    );
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      // Sync VA channels
      for (const ch of result.data.va_channels || []) {
        await supabase.from('fee_settings').upsert({
          channel_code: ch.code,
          channel_name: ch.name,
          channel_type: 'va',
          base_fee_type: ch.admin_fee_type.toLowerCase(),
          base_fee_value: ch.admin_fee_value,
          min_amount: ch.min_amount,
          max_amount: ch.max_amount,
        }, { onConflict: 'channel_code' });
      }

      // Sync retail channels
      for (const ch of result.data.retail_channels || []) {
        await supabase.from('fee_settings').upsert({
          channel_code: ch.code,
          channel_name: ch.name,
          channel_type: 'retail',
          base_fee_type: ch.admin_fee_type.toLowerCase(),
          base_fee_value: ch.admin_fee_value,
          min_amount: ch.min_amount,
          max_amount: ch.max_amount,
        }, { onConflict: 'channel_code' });
      }
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
