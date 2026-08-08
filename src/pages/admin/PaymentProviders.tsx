import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, KeyRound, PlugZap, RefreshCw, Copy, Server } from 'lucide-react';

interface Provider {
  id: string;
  code: string;
  name: string;
  adapter_type: string;
  server_label: string | null;
  base_url: string | null;
  mode: 'sandbox' | 'live';
  is_active: boolean;
  sort_order: number;
  supports_qris: boolean;
  supports_va: boolean;
  supports_retail: boolean;
  config: any;
}

const ADAPTERS = [
  { value: 'sanpay', label: 'Sanpay' },
  { value: 'tripay', label: 'Tripay' },
  { value: 'duitku', label: 'Duitku' },
  { value: 'midtrans', label: 'Midtrans' },
  { value: 'xendit', label: 'Xendit' },
  { value: 'custom', label: 'Custom (konfigurasi manual)' },
];

const emptyProvider = {
  code: '',
  name: '',
  adapter_type: 'tripay',
  server_label: '',
  base_url: '',
  mode: 'sandbox' as const,
  is_active: true,
  sort_order: 0,
  supports_qris: true,
  supports_va: true,
  supports_retail: true,
  config: '{}',
};

export default function PaymentProviders() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [channelCounts, setChannelCounts] = useState<Record<string, number>>({});
  const [credStatus, setCredStatus] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<any>(emptyProvider);

  const [credOpen, setCredOpen] = useState(false);
  const [credProvider, setCredProvider] = useState<Provider | null>(null);
  const [cred, setCred] = useState({ api_key: '', merchant_code: '', private_key: '', client_id: '', callback_token: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: prov }, { data: chans }] = await Promise.all([
      supabase.from('payment_providers').select('*').order('sort_order', { ascending: true }),
      supabase.from('provider_channels').select('provider_id'),
    ]);
    setProviders((prov as Provider[]) || []);

    const counts: Record<string, number> = {};
    for (const c of chans || []) counts[c.provider_id] = (counts[c.provider_id] || 0) + 1;
    setChannelCounts(counts);

    const { data } = await supabase.functions.invoke('provider-admin', { body: { action: 'credentials_status' } });
    if (data?.status) {
      const map: Record<string, any> = {};
      for (const s of data.status) map[s.provider_id] = s;
      setCredStatus(map);
    }
    setLoading(false);
  };

  const serverLabelFor = (p: Provider, index: number) => p.server_label?.trim() || `Server ${index + 1}`;

  const webhookUrl = (p: Provider) =>
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provider-webhook?provider=${p.code}`;

  const openCreate = () => { setEditing(null); setForm(emptyProvider); setFormOpen(true); };

  const openEdit = (p: Provider) => {
    setEditing(p);
    setForm({
      code: p.code, name: p.name, adapter_type: p.adapter_type, server_label: p.server_label || '',
      base_url: p.base_url || '', mode: p.mode, is_active: p.is_active, sort_order: p.sort_order,
      supports_qris: p.supports_qris, supports_va: p.supports_va, supports_retail: p.supports_retail,
      config: JSON.stringify(p.config ?? {}, null, 2),
    });
    setFormOpen(true);
  };

  const saveProvider = async () => {
    let config: any = {};
    try { config = form.config ? JSON.parse(form.config) : {}; }
    catch { toast({ title: 'Konfigurasi tidak valid', description: 'Isi konfigurasi harus format JSON', variant: 'destructive' }); return; }

    if (!form.code || !form.name) {
      toast({ title: 'Lengkapi data', description: 'Kode dan nama provider wajib diisi', variant: 'destructive' });
      return;
    }

    const payload = {
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      adapter_type: form.adapter_type,
      server_label: form.server_label?.trim() || null,
      base_url: form.base_url?.trim() || null,
      mode: form.mode,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      supports_qris: form.supports_qris,
      supports_va: form.supports_va,
      supports_retail: form.supports_retail,
      config,
    };

    const { error } = editing
      ? await supabase.from('payment_providers').update(payload).eq('id', editing.id)
      : await supabase.from('payment_providers').insert(payload);

    if (error) { toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Provider diperbarui' : 'Provider ditambahkan' });
    setFormOpen(false);
    loadAll();
  };

  const removeProvider = async (p: Provider) => {
    const { error } = await supabase.from('payment_providers').delete().eq('id', p.id);
    if (error) { toast({ title: 'Gagal menghapus', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Provider dihapus' });
    loadAll();
  };

  const toggleActive = async (p: Provider, value: boolean) => {
    await supabase.from('payment_providers').update({ is_active: value }).eq('id', p.id);
    setProviders(prev => prev.map(x => x.id === p.id ? { ...x, is_active: value } : x));
  };

  const openCred = (p: Provider) => {
    setCredProvider(p);
    setCred({ api_key: '', merchant_code: '', private_key: '', client_id: '', callback_token: '' });
    setCredOpen(true);
  };

  const saveCred = async () => {
    if (!credProvider) return;
    setBusy('cred');
    const { data, error } = await supabase.functions.invoke('provider-admin', {
      body: {
        action: 'save_credentials',
        providerId: credProvider.id,
        credentials: {
          api_key: cred.api_key || null,
          merchant_code: cred.merchant_code || null,
          private_key: cred.private_key || null,
          client_id: cred.client_id || null,
          extra: cred.callback_token ? { callback_token: cred.callback_token } : {},
        },
      },
    });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: 'Gagal menyimpan kredensial', description: error?.message || data?.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Kredensial tersimpan' });
    setCredOpen(false);
    loadAll();
  };

  const runAction = async (p: Provider, action: 'test_connection' | 'sync_channels') => {
    setBusy(`${action}-${p.id}`);
    const { data, error } = await supabase.functions.invoke('provider-admin', { body: { action, providerId: p.id } });
    setBusy(null);

    if (error || data?.error || data?.success === false) {
      toast({ title: 'Gagal', description: error?.message || data?.error || 'Provider tidak merespons', variant: 'destructive' });
      return;
    }
    toast({
      title: action === 'test_connection' ? 'Koneksi berhasil' : 'Channel tersinkron',
      description: action === 'test_connection' ? `${data.channelCount} channel terdeteksi` : `${data.synced} channel disimpan`,
    });
    if (action === 'sync_channels') loadAll();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Provider Pembayaran</h1>
          <p className="text-muted-foreground">Kelola server pembayaran yang tersedia untuk merchant</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Tambah Provider</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Daftar Server</CardTitle>
          <CardDescription>Merchant hanya melihat label server, bukan nama provider aslinya</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Server</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Kredensial</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada provider</TableCell></TableRow>
              )}
              {providers.map((p, index) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{serverLabelFor(p, index)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.adapter_type} · {p.code}</div>
                  </TableCell>
                  <TableCell><Badge variant={p.mode === 'live' ? 'default' : 'secondary'}>{p.mode}</Badge></TableCell>
                  <TableCell>{channelCounts[p.id] ?? 0}</TableCell>
                  <TableCell>
                    {credStatus[p.id]?.has_api_key
                      ? <Badge variant="outline">Terisi</Badge>
                      : <Badge variant="destructive">Kosong</Badge>}
                  </TableCell>
                  <TableCell><Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p, v)} /></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" title="Kredensial" onClick={() => openCred(p)}><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Test koneksi" disabled={busy === `test_connection-${p.id}`} onClick={() => runAction(p, 'test_connection')}>
                        {busy === `test_connection-${p.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" title="Sinkron channel" disabled={busy === `sync_channels-${p.id}`} onClick={() => runAction(p, 'sync_channels')}>
                        {busy === `sync_channels-${p.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" title="Salin URL webhook" onClick={() => { navigator.clipboard.writeText(webhookUrl(p)); toast({ title: 'URL webhook disalin' }); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" title="Hapus" onClick={() => removeProvider(p)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Provider' : 'Tambah Provider'}</DialogTitle>
            <DialogDescription>Provider baru langsung tampil sebagai server berikutnya bagi merchant</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Kode unik</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="tripay" />
            </div>
            <div>
              <Label>Nama internal</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tripay" />
            </div>
            <div>
              <Label>Tipe integrasi</Label>
              <Select value={form.adapter_type} onValueChange={(v) => setForm({ ...form, adapter_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADAPTERS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Label server (opsional)</Label>
              <Input value={form.server_label} onChange={(e) => setForm({ ...form, server_label: e.target.value })} placeholder="Server 1" />
            </div>
            <div>
              <Label>Base URL (opsional)</Label>
              <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urutan tampil</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">Aktif</span>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.supports_qris} onCheckedChange={(v) => setForm({ ...form, supports_qris: v })} /> QRIS
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.supports_va} onCheckedChange={(v) => setForm({ ...form, supports_va: v })} /> Virtual Account
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.supports_retail} onCheckedChange={(v) => setForm({ ...form, supports_retail: v })} /> Retail
              </label>
            </div>
            {form.adapter_type === 'custom' && (
              <div className="sm:col-span-2">
                <Label>Konfigurasi custom (JSON)</Label>
                <Textarea rows={10} className="font-mono text-xs" value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Berisi bagian create, channels, status, dan webhook untuk memetakan API provider.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button onClick={saveProvider}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={credOpen} onOpenChange={setCredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kredensial {credProvider?.name}</DialogTitle>
            <DialogDescription>Nilai lama tidak ditampilkan. Mengisi form ini akan menimpa kredensial sebelumnya.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>API Key / Secret Key / Server Key</Label>
              <Input type="password" value={cred.api_key} onChange={(e) => setCred({ ...cred, api_key: e.target.value })} />
            </div>
            <div>
              <Label>Merchant Code</Label>
              <Input value={cred.merchant_code} onChange={(e) => setCred({ ...cred, merchant_code: e.target.value })} />
            </div>
            <div>
              <Label>Private Key (Tripay) / Signature Secret</Label>
              <Input type="password" value={cred.private_key} onChange={(e) => setCred({ ...cred, private_key: e.target.value })} />
            </div>
            <div>
              <Label>Callback Token (Xendit)</Label>
              <Input type="password" value={cred.callback_token} onChange={(e) => setCred({ ...cred, callback_token: e.target.value })} />
            </div>
            {credProvider && (
              <div className="rounded-md bg-muted p-3 text-xs break-all">
                <div className="mb-1 font-medium">URL Webhook untuk dashboard provider:</div>
                {webhookUrl(credProvider)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCredOpen(false)}>Batal</Button>
            <Button onClick={saveCred} disabled={busy === 'cred'}>
              {busy === 'cred' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
