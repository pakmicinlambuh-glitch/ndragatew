import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Link, CheckCircle, XCircle, AlertTriangle, RefreshCw, Copy, Shield, Globe } from 'lucide-react';

interface ApiSettings {
  id: string;
  api_key: string;
  merchant_code: string;
  callback_url: string | null;
  is_validated: boolean;
}

export default function ApiSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [merchantCode, setMerchantCode] = useState('');

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('api_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) { setSettings(data); setApiKey(data.api_key); setMerchantCode(data.merchant_code); }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!apiKey || !merchantCode) { toast({ title: 'Validasi Gagal', description: 'API Key dan Merchant Code wajib diisi', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase.from('api_settings').update({ api_key: apiKey, merchant_code: merchantCode, is_validated: false }).eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('api_settings').insert({ api_key: apiKey, merchant_code: merchantCode });
        if (error) throw error;
      }
      toast({ title: 'Disimpan', description: 'Kredensial API berhasil disimpan' });
      fetchSettings();
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleSyncChannels = async () => {
    if (!settings) { toast({ title: 'Simpan kredensial dulu', variant: 'destructive' }); return; }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-channels', {});
      if (error) throw error;
      toast({ title: 'Berhasil', description: `${data?.channels?.length || 0} channel disinkronkan` });
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
    finally { setSyncing(false); }
  };

  const copyToClipboard = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: 'Disalin!', description: `${label} berhasil disalin` }); };
  const webhookUrl = 'https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/sanpay-webhook';

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan API</h1>
        <p className="text-muted-foreground">Konfigurasi integrasi dengan sanpay.site</p>
      </div>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />Kredensial API Sanpay</CardTitle>
          <CardDescription>Masukkan API Key dan Merchant Code dari dashboard sanpay.site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Masukkan API Key" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchantCode">Merchant Code</Label>
            <Input id="merchantCode" value={merchantCode} onChange={(e) => setMerchantCode(e.target.value)} placeholder="MC-xxxxxxxx" />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan Kredensial'}
          </Button>
        </CardContent>
      </Card>

      {/* Sanpay Webhook Configuration */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Konfigurasi Webhook Sanpay</CardTitle>
          <CardDescription>Konfigurasi ini untuk menghubungkan ke website resmi sanpay.site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Callback URL (untuk sanpay.site)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={() => copyToClipboard(webhookUrl, 'Callback URL')}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm text-muted-foreground">Masukkan URL ini sebagai callback URL di dashboard sanpay.site</p>
          </div>
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-warning"><Shield className="h-4 w-4" />IP Whitelist</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">103.127.137.140</Badge>
              <Button size="sm" variant="ghost" onClick={() => copyToClipboard('103.127.137.140', 'IP Address')}><Copy className="h-3 w-3" /></Button>
            </div>
            <p className="mt-2 text-sm">Whitelist IP ini di firewall server Anda untuk menerima callback dari sanpay.site</p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Sinkronisasi Channel</CardTitle>
          <CardDescription>Ambil daftar channel pembayaran terbaru dari sanpay.site</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSyncChannels} disabled={syncing || !settings}>
            {syncing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sinkronisasi...</> : <><RefreshCw className="mr-2 h-4 w-4" />Sinkronisasi Channel</>}
          </Button>
          {!settings && <p className="mt-2 text-sm text-muted-foreground">Simpan kredensial API terlebih dahulu</p>}
        </CardContent>
      </Card>
    </div>
  );
}
