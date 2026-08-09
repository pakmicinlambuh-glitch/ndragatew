import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Copy, Eye, EyeOff, RefreshCw, Code, Webhook, Shield, FileText } from 'lucide-react';

interface UserApiSettings {
  id: string;
  user_id: string;
  api_key: string;
  sandbox_api_key: string | null;
  webhook_url: string | null;
  webhook_secret: string;
  is_active: boolean;
}

export default function UserApiSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [settings, setSettings] = useState<UserApiSettings | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => { fetchSettings(); }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('user_api_settings').select('*').eq('user_id', user.id).maybeSingle();
      if (error) throw error;
      if (data) { setSettings(data); setWebhookUrl(data.webhook_url || ''); }
      else {
        const { data: newSettings, error: createError } = await supabase.from('user_api_settings').insert({ user_id: user.id }).select().single();
        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleSaveWebhook = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('user_api_settings').update({ webhook_url: webhookUrl || null }).eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Webhook Disimpan', description: 'URL webhook berhasil diperbarui' });
      fetchSettings();
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleRegenerateApiKey = async (env: 'live' | 'sandbox' = 'live') => {
    if (!settings) return;
    setRegenerating(true);
    try {
      const newApiKey = Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
      const payload = env === 'sandbox' ? { sandbox_api_key: `sb_${newApiKey}` } : { api_key: newApiKey };
      const { error } = await supabase.from('user_api_settings').update(payload).eq('id', settings.id);
      if (error) throw error;
      toast({ title: env === 'sandbox' ? 'Sandbox Key Diperbarui' : 'API Key Diperbarui', description: 'Pastikan update di integrasi Anda.' });
      fetchSettings();
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
    finally { setRegenerating(false); }
  };


  const copyToClipboard = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: 'Disalin!', description: `${label} berhasil disalin` }); };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const apiEndpoint = `https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/user-create-payment`;
  const checkEndpoint = `https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/check-transaction`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API & Webhook</h1>
        <p className="text-muted-foreground">Kelola API key, webhook, dan dokumentasi integrasi</p>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials"><Key className="h-4 w-4 mr-2" />API Key</TabsTrigger>
          <TabsTrigger value="webhook"><Webhook className="h-4 w-4 mr-2" />Webhook</TabsTrigger>
          <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-2" />Dokumentasi</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Key</CardTitle>
              <CardDescription>Gunakan API key ini untuk mengakses API pembayaran CinGateway</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key Production (Live)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type={showApiKey ? 'text' : 'password'} value={settings?.api_key || ''} readOnly className="pr-20 font-mono text-sm" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => copyToClipboard(settings?.api_key || '', 'API Key')}><Copy className="h-4 w-4" /></Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleRegenerateApiKey('live')} disabled={regenerating}>
                  {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Regenerate API Key Live
                </Button>
              </div>

              <div className="space-y-2 rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-2">
                  <Label>API Key Sandbox (Testing)</Label>
                  <Badge variant="secondary">Sandbox</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gunakan key ini untuk menguji integrasi. Transaksi sandbox tidak memanggil provider asli dan saldonya terpisah.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type={showSandboxKey ? 'text' : 'password'} value={settings?.sandbox_api_key || ''} readOnly className="pr-20 font-mono text-sm" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowSandboxKey(!showSandboxKey)}>
                      {showSandboxKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => copyToClipboard(settings?.sandbox_api_key || '', 'Sandbox API Key')}><Copy className="h-4 w-4" /></Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleRegenerateApiKey('sandbox')} disabled={regenerating}>
                  {regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Regenerate API Key Sandbox
                </Button>
              </div>

              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-warning" /><p className="font-semibold text-sm text-warning">Keamanan</p></div>
                <p className="text-sm text-muted-foreground">Jangan bagikan API key Anda. Simpan di server-side dan jangan expose di client-side code.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Webhook Anda</CardTitle>
              <CardDescription>Terima notifikasi pembayaran ke server Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input id="webhookUrl" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
                <p className="text-sm text-muted-foreground">Kami akan mengirim POST request ke URL ini saat status pembayaran berubah</p>
              </div>
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input type={showSecret ? 'text' : 'password'} value={settings?.webhook_secret || ''} readOnly className="pr-20 font-mono text-sm" />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => copyToClipboard(settings?.webhook_secret || '', 'Webhook Secret')}><Copy className="h-4 w-4" /></Button>
                </div>
                <p className="text-sm text-muted-foreground">Gunakan secret ini untuk memvalidasi signature webhook</p>
              </div>
              <Button onClick={handleSaveWebhook} disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : 'Simpan Webhook'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          {/* Create Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Create Payment</CardTitle>
              <CardDescription>Buat transaksi pembayaran baru via API</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <div className="flex gap-2">
                  <Input value={apiEndpoint} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={() => copyToClipboard(apiEndpoint, 'Endpoint')}><Copy className="h-4 w-4" /></Button>
                </div>
                <Badge variant="outline" className="font-mono">POST</Badge>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Headers</h4>
                <pre className="overflow-x-auto text-xs">{`Content-Type: application/json\nX-API-Key: YOUR_API_KEY`}</pre>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Request Body (QRIS)</h4>
                <pre className="overflow-x-auto text-xs">{`{
  "amount": 50000,
  "payment_method": "qris",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "expiry_minutes": 15
}`}</pre>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Request Body (Virtual Account)</h4>
                <pre className="overflow-x-auto text-xs">{`{
  "amount": 100000,
  "payment_method": "va",
  "channel_code": "BCA",
  "customer_name": "John Doe"
}`}</pre>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Response</h4>
                <pre className="overflow-x-auto text-xs">{`{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "reference_no": "API-1234567890-ABC123",
    "amount": 50000,
    "admin_fee": 350,
    "total_amount": 50350,
    "payment_method": "qris",
    "payment_url": "https://app.com/checkout?ref=...",
    "qr_content": "00020101021...",
    "expires_at": "2025-01-01T12:00:00Z",
    "status": "pending"
  }
}`}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Check Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Check Payment Status</CardTitle>
              <CardDescription>Cek status pembayaran berdasarkan nomor referensi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Endpoint</Label>
                <div className="flex gap-2">
                  <Input value={checkEndpoint} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={() => copyToClipboard(checkEndpoint, 'Endpoint')}><Copy className="h-4 w-4" /></Button>
                </div>
                <Badge variant="outline" className="font-mono">GET</Badge>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Query Parameters</h4>
                <pre className="overflow-x-auto text-xs">{`ref=YOUR_REFERENCE_NO`}</pre>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Example Request</h4>
                <pre className="overflow-x-auto text-xs">{`curl -X GET "${checkEndpoint}?ref=CIN-1234567890-ABC123"`}</pre>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">Response</h4>
                <pre className="overflow-x-auto text-xs">{`{
  "success": true,
  "data": {
    "id": "uuid",
    "partnerReferenceNo": "CIN-1234567890-ABC123",
    "amount": 50000,
    "totalAmount": 50350,
    "status": "paid",
    "paymentMethod": "qris",
    "paidAt": "2025-01-01T12:30:00Z"
  }
}`}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Payload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Webhook className="h-5 w-5" />Webhook Payload</CardTitle>
              <CardDescription>Format data yang dikirim ke webhook Anda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h4 className="mb-2 font-semibold text-sm">payment.success</h4>
                <pre className="overflow-x-auto text-xs">{`{
  "event": "payment.success",
  "partnerReferenceNo": "CIN-1234567890-ABC123",
  "status": "paid",
  "amount": 50000,
  "totalAmount": 50350,
  "paymentMethod": "qris",
  "channelCode": "QRIS",
  "paidAt": "2025-01-01T12:30:00Z",
  "timestamp": "2025-01-01T12:30:01Z"
}`}</pre>
              </div>
              <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-warning" /><p className="font-semibold text-sm">Validasi Webhook</p></div>
                <p className="text-sm text-muted-foreground">Setiap webhook dikirim dengan header <code className="bg-muted px-1 rounded">X-Webhook-Secret</code>. Validasi header ini dengan webhook secret Anda untuk memastikan keaslian request.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
