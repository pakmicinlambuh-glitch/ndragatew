import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Wallet, TrendingUp, Users, DollarSign, ArrowDownCircle, CreditCard, Clock, CheckCircle, Shield, FileCheck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function AdminBalance() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUserBalance: 0,
    adminFeeTotal: 0,
    totalUsers: 0,
    pendingKyc: 0,
    pendingWithdrawals: 0,
    totalWithdrawalsProcessed: 0,
    monthlyTransactions: 0,
    monthlyRevenue: 0,
    successCount: 0,
    failedCount: 0,
    expiredCount: 0,
    pendingCount: 0,
  });
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [balances, transactions, profiles, kycs, withdrawals, monthlyTxs] = await Promise.all([
        supabase.from('user_balance').select('balance').eq('mode', 'live'),
        supabase.from('transactions').select('amount, admin_fee, status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('user_kyc').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('amount, admin_fee, status').gte('created_at', startOfMonth),
      ]);

      const totalUserBalance = (balances.data || []).reduce((s: number, b: any) => s + (b.balance || 0), 0);
      const paidTxs = (transactions.data || []).filter((t: any) => t.status === 'paid');
      const adminFeeTotal = paidTxs.reduce((s: number, t: any) => s + (t.admin_fee || 0), 0);
      const pendingWd = (withdrawals.data || []).filter((w: any) => w.status === 'pending');
      const approvedWd = (withdrawals.data || []).filter((w: any) => w.status === 'approved');
      const monthlyPaid = (monthlyTxs.data || []).filter((t: any) => t.status === 'paid');

      const allTxs = transactions.data || [];

      setStats({
        totalUserBalance,
        adminFeeTotal,
        totalUsers: profiles.count || 0,
        pendingKyc: kycs.count || 0,
        pendingWithdrawals: pendingWd.length,
        totalWithdrawalsProcessed: approvedWd.reduce((s: number, w: any) => s + w.amount, 0),
        monthlyTransactions: (monthlyTxs.data || []).length,
        monthlyRevenue: monthlyPaid.reduce((s: number, t: any) => s + (t.admin_fee || 0), 0),
        successCount: allTxs.filter((t: any) => t.status === 'paid').length,
        failedCount: allTxs.filter((t: any) => t.status === 'failed').length,
        expiredCount: allTxs.filter((t: any) => t.status === 'expired').length,
        pendingCount: allTxs.filter((t: any) => t.status === 'pending').length,
      });

      // Get recent withdrawals with emails
      const recent = (withdrawals.data || []).slice(0, 5);
      const withEmails = await Promise.all(
        recent.map(async (w: any) => {
          const { data: profile } = await supabase.from('profiles').select('email').eq('user_id', w.user_id).single();
          return { ...w, user_email: profile?.email };
        })
      );
      setRecentWithdrawals(withEmails);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-muted-foreground">Ringkasan seluruh aktivitas sistem</p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><Wallet className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Saldo User</p><p className="text-xl font-bold">{formatCurrency(stats.totalUserBalance)}</p></div></div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-success">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-success/10 p-2 text-success"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Fee Admin</p><p className="text-xl font-bold">{formatCurrency(stats.adminFeeTotal)}</p></div></div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-accent">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-accent/10 p-2 text-accent"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total User</p><p className="text-xl font-bold">{stats.totalUsers}</p></div></div></CardContent>
        </Card>
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-warning/10 p-2 text-warning"><TrendingUp className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Transaksi Bulan Ini</p><p className="text-xl font-bold">{stats.monthlyTransactions}</p></div></div></CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-warning/10 p-2 text-warning"><FileCheck className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">KYC Pending</p><p className="text-xl font-bold">{stats.pendingKyc}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-warning/10 p-2 text-warning"><ArrowDownCircle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Penarikan Pending</p><p className="text-xl font-bold">{stats.pendingWithdrawals}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-success/10 p-2 text-success"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Revenue Bulan Ini</p><p className="text-xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2 text-primary"><ArrowDownCircle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Penarikan</p><p className="text-xl font-bold">{formatCurrency(stats.totalWithdrawalsProcessed)}</p></div></div></CardContent></Card>
      </div>

      {/* Transaction Status Breakdown */}
      <Card>
        <CardHeader><CardTitle>Status Transaksi</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-success/5 p-4 text-center border border-success/20"><CheckCircle className="mx-auto h-6 w-6 text-success mb-2" /><p className="text-2xl font-bold">{stats.successCount}</p><p className="text-sm text-muted-foreground">Sukses</p></div>
            <div className="rounded-lg bg-warning/5 p-4 text-center border border-warning/20"><Clock className="mx-auto h-6 w-6 text-warning mb-2" /><p className="text-2xl font-bold">{stats.pendingCount}</p><p className="text-sm text-muted-foreground">Pending</p></div>
            <div className="rounded-lg bg-muted p-4 text-center border"><AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground mb-2" /><p className="text-2xl font-bold">{stats.expiredCount}</p><p className="text-sm text-muted-foreground">Expired</p></div>
            <div className="rounded-lg bg-destructive/5 p-4 text-center border border-destructive/20"><CreditCard className="mx-auto h-6 w-6 text-destructive mb-2" /><p className="text-2xl font-bold">{stats.failedCount}</p><p className="text-sm text-muted-foreground">Gagal</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Withdrawals */}
      <Card>
        <CardHeader><CardTitle>Penarikan Terbaru</CardTitle></CardHeader>
        <CardContent>
          {recentWithdrawals.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Belum ada penarikan</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Tujuan</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentWithdrawals.map((w: any) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-sm">{w.user_email}</TableCell>
                    <TableCell>{w.bank_name || w.withdrawal_type}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(w.amount)}</TableCell>
                    <TableCell><Badge className={w.status === 'approved' ? 'bg-success/10 text-success' : w.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}>{w.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(w.created_at), 'dd MMM yyyy', { locale: localeId })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
