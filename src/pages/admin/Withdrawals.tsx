import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowDownCircle, CheckCircle, XCircle, Clock, Eye, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_type: string;
  bank_name: string | null;
  account_number: string;
  account_holder: string;
  status: string;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  user_email?: string;
}

export default function Withdrawals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel('admin-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
      if (error) throw error;

      const withEmail = await Promise.all(
        (data || []).map(async (req: any) => {
          const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', req.user_id).single();
          return { ...req, user_email: profile?.email } as WithdrawalRequest;
        })
      );
      setRequests(withEmail);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approved' | 'rejected') => {
    if (!selected) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').update({
        status: action,
        admin_notes: adminNotes || null,
        processed_by: user?.id,
        processed_at: new Date().toISOString(),
      }).eq('id', selected.id);
      if (error) throw error;

      if (action === 'approved') {
        const { error: balError } = await supabase.rpc('adjust_user_balance', {
          _user_id: selected.user_id,
          _amount: selected.amount,
          _type: 'debit',
          _description: `Penarikan via ${selected.bank_name || selected.withdrawal_type} - ${selected.account_number}`,
          _created_by: user?.id,
        });
        if (balError) throw balError;
      }

      await supabase.from('notifications').insert({
        user_id: selected.user_id,
        title: action === 'approved' ? 'Penarikan Disetujui' : 'Penarikan Ditolak',
        message: action === 'approved'
          ? `Penarikan Rp ${selected.amount.toLocaleString('id-ID')} telah disetujui dan akan diproses.`
          : `Penarikan Rp ${selected.amount.toLocaleString('id-ID')} ditolak. ${adminNotes || ''}`,
        type: action === 'approved' ? 'success' : 'error',
      });

      toast({ title: action === 'approved' ? 'Disetujui' : 'Ditolak' });
      setSelected(null);
      setAdminNotes('');
      fetchRequests();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);
  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'approved': return <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Disetujui</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      default: return <Badge className="bg-warning/10 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filtered = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const totalApproved = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manajemen Penarikan</h1>
        <p className="text-muted-foreground">Kelola permintaan penarikan saldo merchant</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-warning/10 p-2 text-warning"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">{pendingCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-success/10 p-2 text-success"><CheckCircle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Disetujui</p><p className="text-2xl font-bold">{formatCurrency(totalApproved)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><ArrowDownCircle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Request</p><p className="text-2xl font-bold">{requests.length}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Penarikan</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground"><ArrowDownCircle className="mx-auto h-12 w-12 opacity-50" /><p className="mt-2">Tidak ada data</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Tujuan</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.user_email}</TableCell>
                      <TableCell><p className="font-medium">{r.bank_name || r.withdrawal_type}</p><p className="text-xs text-muted-foreground">{r.account_number}</p></TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(r.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ''); }}><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Penarikan</DialogTitle>
            <DialogDescription>{selected?.user_email}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Jumlah</p><p className="text-xl font-bold text-primary">{formatCurrency(selected.amount)}</p></div>
                <div><p className="text-muted-foreground">Status</p>{getStatusBadge(selected.status)}</div>
                <div><p className="text-muted-foreground">Tipe</p><p className="font-medium capitalize">{selected.withdrawal_type}</p></div>
                <div><p className="text-muted-foreground">{selected.withdrawal_type === 'bank' ? 'Bank' : 'Provider'}</p><p className="font-medium">{selected.bank_name || '-'}</p></div>
                <div><p className="text-muted-foreground">No. Rekening/HP</p><p className="font-mono">{selected.account_number}</p></div>
                <div><p className="text-muted-foreground">Nama Pemilik</p><p className="font-medium">{selected.account_holder}</p></div>
              </div>
              {selected.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>Catatan Admin</Label>
                    <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Tambahkan catatan..." />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="destructive" onClick={() => handleAction('rejected')} disabled={processing}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-2" />Tolak</>}
                    </Button>
                    <Button onClick={() => handleAction('approved')} disabled={processing}>
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-2" />Setujui</>}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
