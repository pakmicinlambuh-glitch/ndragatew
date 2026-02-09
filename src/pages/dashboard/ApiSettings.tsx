import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Link, Copy, Eye, EyeOff, RefreshCw, Code, Webhook } from 'lucide-react';

interface UserApiSettings {
  id: string;
  user_id: string;
  api_key: string;
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
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setWebhookUrl(data.webhook_url || '');
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('user_api_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_api_settings')
        .update({ webhook_url: webhookUrl || null })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'Webhook Disimpan',
        description: 'URL webhook berhasil diperbarui',
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Gagal Menyimpan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!settings) return;

    setRegenerating(true);
    try {
      // Generate new API key using crypto
      const newApiKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from('user_api_settings')
        .update({ api_key: newApiKey })
        .eq('id', settings.id);

      if (error) throw error;

      toast({
        title: 'API Key Diperbarui',
        description: 'API key baru telah dibuat. Pastikan update di integrasi Anda.',
      });

      fetchSettings();
    } catch (error: any) {
      toast({
        title: 'Gagal Regenerate',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Disalin!',
      description: `${label} berhasil disalin ke clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const apiEndpoint = `https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/user-create-payment`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan API</h1>
        <p className="text-muted-foreground">Kelola API key dan webhook untuk integrasi</p>
      </div>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key
          </CardTitle>
          <CardDescription>
            Gunakan API key ini untuk mengakses API pembayaran
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings?.api_key || ''}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(settings?.api_key || '', 'API Key')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleRegenerateApiKey}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Regenerate API Key
          </Button>
        </CardContent>
      </Card>

      {/* Sanpay Webhook Configuration */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Konfigurasi Webhook Sanpay
          </CardTitle>
          <CardDescription>
            Konfigurasi ini untuk menghubungkan ke website resmi sanpay.site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Callback URL (untuk sanpay.site)</Label>
            <div className="flex gap-2">
              <Input
                value="https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/sanpay-webhook"
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={() => copyToClipboard('https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/sanpay-webhook', 'Callback URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Masukkan URL ini sebagai callback URL di dashboard sanpay.site
            </p>
          </div>

          <div className="rounded-lg border border-warning bg-warning/10 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-warning">
              IP Whitelist
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">103.127.137.140</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard('103.127.137.140', 'IP Address')}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-2 text-sm">
              Whitelist IP ini di firewall server Anda untuk menerima callback dari sanpay.site
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Your Webhook Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Anda
          </CardTitle>
          <CardDescription>
            Terima notifikasi pembayaran ke server Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
            />
            <p className="text-sm text-muted-foreground">
              Kami akan mengirim POST request ke URL ini saat status pembayaran berubah
            </p>
          </div>

          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={settings?.webhook_secret || ''}
                  readOnly
                  className="pr-20 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(settings?.webhook_secret || '', 'Webhook Secret')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Gunakan secret ini untuk memvalidasi signature webhook
            </p>
          </div>

          <Button onClick={handleSaveWebhook} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Webhook'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Dokumentasi API
          </CardTitle>
          <CardDescription>
            Panduan menggunakan API pembayaran
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Endpoint</Label>
            <div className="flex gap-2">
              <Input value={apiEndpoint} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={() => copyToClipboard(apiEndpoint, 'Endpoint')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Request Example (QRIS)</h4>
            <pre className="overflow-x-auto text-sm">
{`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${settings?.api_key?.substring(0, 8)}..." \\
  -d '{
    "amount": 50000,
    "payment_method": "qris",
    "customer_name": "John Doe",
    "customer_email": "john@example.com"
  }'`}
            </pre>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Request Example (Virtual Account)</h4>
            <pre className="overflow-x-auto text-sm">
{`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${settings?.api_key?.substring(0, 8)}..." \\
  -d '{
    "amount": 100000,
    "payment_method": "va",
    "channel_code": "BCA",
    "customer_name": "John Doe"
  }'`}
            </pre>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Request Example (Retail)</h4>
            <pre className="overflow-x-auto text-sm">
{`curl -X POST ${apiEndpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${settings?.api_key?.substring(0, 8)}..." \\
  -d '{
    "amount": 75000,
    "payment_method": "retail",
    "channel_code": "ALFAMART",
    "customer_name": "John Doe"
  }'`}
            </pre>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Response</h4>
            <pre className="overflow-x-auto text-sm">
{`{
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
    "expires_at": "2024-01-01T12:00:00Z",
    "status": "pending"
  }
}`}
            </pre>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="mb-2 font-semibold">Webhook Payload</h4>
            <pre className="overflow-x-auto text-sm">
{`{
  "event": "payment.success",
  "data": {
    "transaction_id": "uuid",
    "reference_no": "API-1234567890-ABC123",
    "amount": 50000,
    "total_amount": 50350,
    "status": "paid",
    "paid_at": "2024-01-01T12:30:00Z"
  },
  "signature": "hmac-sha256-signature"
}`}
            </pre>
          </div>

          <div className="rounded-lg border border-warning bg-warning/10 p-4">
            <h4 className="mb-2 flex items-center gap-2 font-semibold text-warning">
              Validasi Webhook Signature
            </h4>
            <p className="text-sm">
              Untuk keamanan, selalu validasi signature webhook dengan menghitung HMAC-SHA256 
              dari body request menggunakan webhook secret Anda.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
