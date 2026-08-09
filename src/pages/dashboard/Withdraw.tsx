import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, Building2, Smartphone, ArrowDownCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface WithdrawalRequest {
  id: string;
  amount: number;
  withdrawal_type: string;
  bank_name: string | null;
  account_number: string;
  account_holder: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function Withdraw() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [withdrawalType, setWithdrawalType] = useState<'bank' | 'ewallet'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [balanceRes, withdrawalsRes] = await Promise.all([
        supabase.from('user_balance').select('balance').eq('user_id', user!.id).eq('mode', 'live').maybeSingle(),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      ]);
      setBalance(balanceRes.data?.balance || 0);
      setWithdrawals((withdrawalsRes.data as WithdrawalRequest[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;

    if (numAmount < 10000) {
      toast({ title: 'Minimal penarikan Rp 10.000', variant: 'destructive' });
      return;
    }
    if (numAmount > balance) {
      toast({ title: 'Saldo tidak mencukupi', variant: 'destructive' });
      return;
    }
    if (!accountNumber || !accountHolder) {
      toast({ title: 'Lengkapi semua data', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user!.id,
        amount: numAmount,
        withdrawal_type: withdrawalType,
        bank_name: bankName || null,
        account_number: accountNumber,
        account_holder: accountHolder,
      });
      if (error) throw error;

      toast({ title: 'Penarikan Diajukan', description: 'Menunggu persetujuan admin' });
      setAmount('');
      setAccountNumber('');
      setAccountHolder('');
      setBankName('');
      fetchData();
    } catch (error: any) {
      toast({ title: 'Gagal', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Disetujui</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ditolak</Badge>;
      case 'processing': return <Badge className="bg-primary/10 text-primary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Diproses</Badge>;
      default: return <Badge className="bg-warning/10 text-warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const banks = ['BCA', 'BNI', 'BRI', 'Mandiri', 'CIMB Niaga', 'Permata', 'BSI', 'Danamon'];
  const ewallets = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja'];

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Penarikan Saldo</h1>
        <p className="text-muted-foreground">Tarik saldo ke rekening bank atau e-wallet</p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary-foreground/20 p-3">
              <Wallet className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-primary-foreground/80">Saldo Tersedia</p>
              <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            Form Penarikan
          </CardTitle>
          <CardDescription>Pilih metode dan masukkan detail penarikan</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <RadioGroup value={withdrawalType} onValueChange={(v) => { setWithdrawalType(v as 'bank' | 'ewallet'); setBankName(''); }} className="grid grid-cols-2 gap-4">
              <div>
                <RadioGroupItem value="bank" id="bank" className="peer sr-only" />
                <Label htmlFor="bank" className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent/5 peer-data-[state=checked]:border-primary cursor-pointer">
                  <Building2 className="h-6 w-6" />
                  <span className="text-sm font-medium">Transfer Bank</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="ewallet" id="ewallet" className="peer sr-only" />
                <Label htmlFor="ewallet" className="flex flex-col items-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent/5 peer-data-[state=checked]:border-primary cursor-pointer">
                  <Smartphone className="h-6 w-6" />
                  <span className="text-sm font-medium">E-Wallet</span>
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label>{withdrawalType === 'bank' ? 'Pilih Bank' : 'Pilih E-Wallet'}</Label>
              <Select value={bankName} onValueChange={setBankName}>
                <SelectTrigger><SelectValue placeholder={`Pilih ${withdrawalType === 'bank' ? 'bank' : 'e-wallet'}...`} /></SelectTrigger>
                <SelectContent>
                  {(withdrawalType === 'bank' ? banks : ewallets).map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{withdrawalType === 'bank' ? 'Nomor Rekening' : 'Nomor HP'}</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={withdrawalType === 'bank' ? '1234567890' : '08xxxxxxxxxx'} />
            </div>

            <div className="space-y-2">
              <Label>Nama Pemilik</Label>
              <Input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Nama sesuai rekening/akun" />
            </div>

            <div className="space-y-2">
              <Label>Jumlah Penarikan</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                <Input value={amount} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); setAmount(v ? new Intl.NumberFormat('id-ID').format(parseInt(v)) : ''); }} className="pl-10" placeholder="0" />
              </div>
              <p className="text-xs text-muted-foreground">Minimal Rp 10.000 | Maks: {formatCurrency(balance)}</p>
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : 'Ajukan Penarikan'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Penarikan</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ArrowDownCircle className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Belum ada penarikan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map(w => (
                    <TableRow key={w.id}>
                      <TableCell className="text-muted-foreground">{format(new Date(w.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</TableCell>
                      <TableCell>
                        <p className="font-medium">{w.bank_name || w.withdrawal_type}</p>
                        <p className="text-xs text-muted-foreground">{w.account_number} - {w.account_holder}</p>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(w.amount)}</TableCell>
                      <TableCell>{getStatusBadge(w.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
