import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Link, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

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
  const [validating, setValidating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState<ApiSettings | null>(null);

  // Form state
  const [apiKey, setApiKey] = useState('');
  const [merchantCode, setMerchantCode] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('api_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
        setApiKey(data.api_key);
        setMerchantCode(data.merchant_code);
        setCallbackUrl(data.callback_url || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey || !merchantCode) {
      toast({
        title: 'Validasi Gagal',
        description: 'API Key dan Merchant Code wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (settings) {
        // Update existing
        const { error } = await supabase
          .from('api_settings')
          .update({
            api_key: apiKey,
            merchant_code: merchantCode,
            callback_url: callbackUrl || null,
            is_validated: false,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('api_settings')
          .insert({
            api_key: apiKey,
            merchant_code: merchantCode,
            callback_url: callbackUrl || null,
          });

        if (error) throw error;
      }

      toast({
        title: 'Pengaturan Disimpan',
        description: 'Konfigurasi API berhasil disimpan',
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

  const handleValidateCallback = async () => {
    if (!callbackUrl) {
      toast({
        title: 'URL Kosong',
        description: 'Masukkan URL callback terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-callback', {
        body: { callbackUrl },
      });

      if (error) throw error;

      if (data?.success) {
        // Update validation status
        if (settings) {
          await supabase
            .from('api_settings')
            .update({ is_validated: true })
            .eq('id', settings.id);
        }

        toast({
          title: 'Validasi Berhasil',
          description: 'URL callback dapat dijangkau',
        });

        fetchSettings();
      } else {
        toast({
          title: 'Validasi Gagal',
          description: data?.message || 'URL tidak dapat dijangkau',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Validasi Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSyncChannels = async () => {
    if (!settings) {
      toast({
        title: 'Konfigurasi Belum Lengkap',
        description: 'Simpan API Key dan Merchant Code terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-channels', {});

      if (error) throw error;

      toast({
        title: 'Sinkronisasi Berhasil',
        description: `${data?.channels?.length || 0} channel berhasil disinkronkan`,
      });
    } catch (error: any) {
      toast({
        title: 'Sinkronisasi Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan API</h1>
        <p className="text-muted-foreground">Konfigurasi integrasi dengan sanpay.site</p>
      </div>

      {/* API Credentials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Kredensial API
          </CardTitle>
          <CardDescription>
            Masukkan API Key dan Merchant Code dari dashboard sanpay.site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Masukkan API Key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchantCode">Merchant Code</Label>
            <Input
              id="merchantCode"
              value={merchantCode}
              onChange={(e) => setMerchantCode(e.target.value)}
              placeholder="MC-xxxxxxxx"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Kredensial'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Callback URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            URL Callback (Webhook)
          </CardTitle>
          <CardDescription>
            URL endpoint untuk menerima notifikasi pembayaran
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="callbackUrl">Callback URL</Label>
            <div className="flex gap-2">
              <Input
                id="callbackUrl"
                value={callbackUrl}
                onChange={(e) => setCallbackUrl(e.target.value)}
                placeholder="https://your-domain.com/callback"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleValidateCallback}
                disabled={validating}
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Validasi'
                )}
              </Button>
            </div>
            {settings?.is_validated && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                URL callback tervalidasi
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Whitelist IP Address
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Pastikan IP berikut di-whitelist di firewall server Anda:
            </p>
            <code className="mt-2 block rounded bg-background p-2 font-mono text-sm">
              103.127.137.140
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Sync Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sinkronisasi Channel
          </CardTitle>
          <CardDescription>
            Ambil daftar channel pembayaran terbaru dari sanpay.site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSyncChannels} disabled={syncing || !settings}>
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sinkronisasi...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sinkronisasi Channel
              </>
            )}
          </Button>
          {!settings && (
            <p className="mt-2 text-sm text-muted-foreground">
              Simpan kredensial API terlebih dahulu
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
