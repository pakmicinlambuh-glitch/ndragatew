import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in WIB (UTC+7)
    const now = new Date();
    const nowIso = now.toISOString();

    console.log(`Checking for expired transactions at ${nowIso}`);

    // Find all pending transactions that have passed their expiry time
    const { data: expiredTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, partner_reference_no, user_id, expires_at')
      .eq('status', 'pending')
      .lt('expires_at', nowIso);

    if (fetchError) {
      console.error('Error fetching expired transactions:', fetchError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to fetch transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredTransactions || expiredTransactions.length === 0) {
      console.log('No expired transactions found');
      return new Response(
        JSON.stringify({ status: 'success', message: 'No expired transactions', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredTransactions.length} expired transactions`);

    // Update all expired transactions
    const transactionIds = expiredTransactions.map(t => t.id);
    
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ 
        status: 'expired',
        updated_at: nowIso,
      })
      .in('id', transactionIds);

    if (updateError) {
      console.error('Error updating transactions:', updateError);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to update transactions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for affected users
    const userNotifications = expiredTransactions
      .filter(t => t.user_id)
      .map(t => ({
        user_id: t.user_id,
        title: 'Transaksi Kedaluwarsa',
        message: `Transaksi ${t.partner_reference_no} telah kedaluwarsa karena tidak dibayar dalam waktu yang ditentukan.`,
        type: 'warning' as const,
      }));

    if (userNotifications.length > 0) {
      await supabase.from('notifications').insert(userNotifications);
    }

    console.log(`Successfully expired ${expiredTransactions.length} transactions`);

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: `Expired ${expiredTransactions.length} transactions`,
        count: expiredTransactions.length,
        transactionIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in expire-transactions:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
