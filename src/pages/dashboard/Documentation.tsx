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
import { 
  Loader2, Key, Webhook, RefreshCw, Copy, CheckCircle, Eye, EyeOff,
  Code, FileText, Zap, Shield, ExternalLink
} from 'lucide-react';

interface ApiSettings {
  id: string;
  api_key: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
}

export default function Documentation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState('');

  const baseUrl = 'https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1';

  useEffect(() => {
    if (user) {
      fetchApiSettings();
    }
  }, [user]);

  const fetchApiSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setApiSettings(data);
        setWebhookUrl(data.webhook_url || '');
      } else {
        // Create new API settings
        const { data: newData, error: createError } = await supabase
          .from('user_api_settings')
          .insert({ user_id: user?.id })
          .select()
          .single();

        if (createError) throw createError;
        setApiSettings(newData);
      }
    } catch (error) {
      console.error('Error fetching API settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!apiSettings) return;

    setSaving(true);
    try {
      const newApiKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from('user_api_settings')
        .update({ api_key: newApiKey })
        .eq('id', apiSettings.id);

      if (error) throw error;

      setApiSettings({ ...apiSettings, api_key: newApiKey });
      toast({
        title: 'API Key Diperbarui',
        description: 'API key baru telah digenerate',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveWebhook = async () => {
    if (!apiSettings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_api_settings')
        .update({ webhook_url: webhookUrl || null })
        .eq('id', apiSettings.id);

      if (error) throw error;

      setApiSettings({ ...apiSettings, webhook_url: webhookUrl || null });
      toast({
        title: 'Webhook Disimpan',
        description: 'URL webhook berhasil diperbarui',
      });
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
    toast({
      title: 'Disalin!',
      description: 'Teks berhasil disalin ke clipboard',
    });
  };

  const getMerchantCode = () => {
    if (!apiSettings?.api_key) return '';
    return `MC-${apiSettings.api_key.substring(0, 8).toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API & Dokumentasi</h1>
        <p className="text-muted-foreground">
          Integrasi API dan dokumentasi lengkap untuk developer
        </p>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials" className="gap-2">
            <Key className="h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="qris" className="gap-2">
            <Zap className="h-4 w-4" />
            QRIS API
          </TabsTrigger>
          <TabsTrigger value="va-retail" className="gap-2">
            <Code className="h-4 w-4" />
            VA & Retail
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhook
          </TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                API Credentials
              </CardTitle>
              <CardDescription>
                Gunakan credentials ini untuk mengakses API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={showApiKey ? apiSettings?.api_key : '••••••••••••••••••••••••'}
                      readOnly
                      className="font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiSettings?.api_key || '', 'apikey')}
                  >
                    {copied === 'apikey' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={regenerateApiKey}
                    disabled={saving}
                  >
                    <RefreshCw className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Merchant Code */}
              <div className="space-y-2">
                <Label>Merchant Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={getMerchantCode()}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(getMerchantCode(), 'merchant')}
                  >
                    {copied === 'merchant' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-2">
                <Label>Webhook Secret</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={showSecret ? apiSettings?.webhook_secret || '' : '••••••••••••••••'}
                      readOnly
                      className="font-mono pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiSettings?.webhook_secret || '', 'secret')}
                  >
                    {copied === 'secret' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gunakan untuk memvalidasi signature callback dari kami
                </p>
              </div>

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="flex-1"
                  />
                  <Button onClick={saveWebhook} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Kami akan mengirim notifikasi pembayaran ke URL ini
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Base URL */}
          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input value={baseUrl} readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(baseUrl, 'baseurl')}
                >
                  {copied === 'baseurl' ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QRIS API Tab */}
        <TabsContent value="qris" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate QRIS</CardTitle>
              <CardDescription>
                POST {baseUrl}/user-create-payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Headers</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`X-API-Key: ${apiSettings?.api_key?.substring(0, 8)}...
Content-Type: application/json`}
                </pre>
              </div>

              <div>
                <Label className="text-sm font-medium">Request Body</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "amount": 50000,
  "partnerReferenceNo": "INV-2025-001",
  "expirySeconds": 900,
  "name": "John Doe"
}`}
                </pre>
              </div>

              <div>
                <Label className="text-sm font-medium">Response</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "status": "success",
  "partnerReferenceNo": "INV-2025-001",
  "merchantName": "Your Merchant",
  "amount": 50000,
  "qrContent": "00020101021226...",
  "expiresAt": "2025-02-08 12:00:00",
  "paymentUrl": "https://..."
}`}
                </pre>
              </div>

              <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                <h4 className="font-medium text-sm mb-2">cURL Example</h4>
                <pre className="text-xs overflow-x-auto">
{`curl -X POST ${baseUrl}/user-create-payment \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"amount": 50000, "partnerReferenceNo": "INV-001", "name": "John"}'`}
                </pre>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/user-create-payment -H "Content-Type: application/json" -H "X-API-Key: ${apiSettings?.api_key}" -d '{"amount": 50000, "partnerReferenceNo": "INV-001", "name": "John"}'`, 'curl-qris')}
                >
                  {copied === 'curl-qris' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VA & Retail Tab */}
        <TabsContent value="va-retail" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Virtual Account</CardTitle>
              <CardDescription>
                POST {baseUrl}/user-create-payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Request Body</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "amount": 50000,
  "partnerReferenceNo": "INV-VA-001",
  "bank_code": "BCA",
  "name": "John Doe"
}`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Bank codes: BCA, BNI, BRI, MANDIRI, PERMATA, BSI
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Response</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "status": "success",
  "partnerReferenceNo": "INV-VA-001",
  "amount": 50000,
  "bank_code": "BCA",
  "va_number": "1234567890",
  "expiration_date": "2025-02-08T12:00:00+07:00",
  "paymentUrl": "https://..."
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retail (Alfamart/Indomaret)</CardTitle>
              <CardDescription>
                POST {baseUrl}/user-create-payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Request Body</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "amount": 50000,
  "partnerReferenceNo": "INV-RET-001",
  "retail_outlet": "ALFAMART",
  "name": "John Doe"
}`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  Outlets: ALFAMART, INDOMARET
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Response</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "status": "success",
  "partnerReferenceNo": "INV-RET-001",
  "amount": 50000,
  "retail_outlet": "ALFAMART",
  "payment_code": "888812345678",
  "expiration_date": "2025-02-08T12:00:00+07:00",
  "paymentUrl": "https://..."
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Callback Webhook</CardTitle>
              <CardDescription>
                Kami akan mengirim notifikasi pembayaran ke webhook URL Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Headers yang Kami Kirim</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`X-Signature: HMAC-SHA256(payload, webhook_secret)
Content-Type: application/json`}
                </pre>
              </div>

              <div>
                <Label className="text-sm font-medium">Payload QRIS</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "transactionID": "QRS2025020812345",
  "merchantId": "MERCHANT001",
  "storeId": "STORE001",
  "amount": 50000,
  "transactionDate": "2025-02-08 12:30:00",
  "customerName": "John Doe",
  "referenceNo": "INV-2025-001"
}`}
                </pre>
              </div>

              <div>
                <Label className="text-sm font-medium">Payload VA/Retail</Label>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`{
  "status": "success",
  "partnerReferenceNo": "INV-VA-001",
  "external_id": "VA_1234567890",
  "amount": 50000,
  "payment_status": "PAID"
}`}
                </pre>
              </div>

              <div className="rounded-lg bg-warning/5 p-4 border border-warning/20">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2 text-warning">
                  <Shield className="h-4 w-4" />
                  Validasi Signature
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  Selalu validasi signature untuk memastikan callback berasal dari kami:
                </p>
                <pre className="text-xs overflow-x-auto bg-muted p-3 rounded">
{`// PHP Example
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');
$expected = hash_hmac('sha256', $payload, $webhook_secret);

if (!hash_equals($expected, $signature)) {
  http_response_code(401);
  exit('Invalid signature');
}`}
                </pre>
              </div>

              <div>
                <Label className="text-sm font-medium">Expected Response</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Server Anda harus merespons dengan HTTP 200 OK dalam 30 detik
                </p>
                <pre className="mt-2 rounded-lg bg-muted p-4 text-sm overflow-x-auto">
{`HTTP/1.1 200 OK
Content-Type: application/json

{"status": "success"}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Code</th>
                      <th className="text-left py-2 pr-4">Status</th>
                      <th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-mono">401</td>
                      <td className="py-2 pr-4"><Badge variant="destructive">Unauthorized</Badge></td>
                      <td className="py-2 text-muted-foreground">Invalid API Key or Signature</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-mono">400</td>
                      <td className="py-2 pr-4"><Badge variant="secondary">Bad Request</Badge></td>
                      <td className="py-2 text-muted-foreground">Invalid parameters</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-mono">404</td>
                      <td className="py-2 pr-4"><Badge variant="secondary">Not Found</Badge></td>
                      <td className="py-2 text-muted-foreground">Transaction not found</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-mono">500</td>
                      <td className="py-2 pr-4"><Badge variant="destructive">Server Error</Badge></td>
                      <td className="py-2 text-muted-foreground">Internal server error</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
