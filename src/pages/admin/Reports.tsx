import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileText, Download, Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Transaction {
  id: string;
  partner_reference_no: string;
  amount: number;
  admin_fee: number;
  total_amount: number;
  payment_method: string;
  channel_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface ReportSummary {
  totalTransactions: number;
  successTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  totalFees: number;
  successRate: number;
}

export default function Reports() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  // Filter state
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  const fetchReport = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'paid' | 'expired' | 'failed');
      }

      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter as 'qris' | 'va' | 'retail');
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);

      // Calculate summary
      const allTx = data || [];
      const successTx = allTx.filter(t => t.status === 'paid');
      const pendingTx = allTx.filter(t => t.status === 'pending');
      const failedTx = allTx.filter(t => t.status === 'failed' || t.status === 'expired');

      setSummary({
        totalTransactions: allTx.length,
        successTransactions: successTx.length,
        pendingTransactions: pendingTx.length,
        failedTransactions: failedTx.length,
        totalAmount: successTx.reduce((sum, t) => sum + t.total_amount, 0),
        totalFees: successTx.reduce((sum, t) => sum + t.admin_fee, 0),
        successRate: allTx.length > 0 ? Math.round((successTx.length / allTx.length) * 100) : 0,
      });
    } catch (error: any) {
      toast({
        title: 'Gagal Memuat Laporan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = [
      'Referensi',
      'Pelanggan',
      'Email',
      'Metode',
      'Channel',
      'Nominal',
      'Fee',
      'Total',
      'Status',
      'Tanggal Dibuat',
      'Tanggal Dibayar',
    ];
    const rows = transactions.map(tx => [
      tx.partner_reference_no,
      tx.customer_name || '',
      tx.customer_email || '',
      tx.payment_method,
      tx.channel_code || '',
      tx.amount,
      tx.admin_fee,
      tx.total_amount,
      tx.status,
      format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
      tx.paid_at ? format(new Date(tx.paid_at), 'yyyy-MM-dd HH:mm:ss') : '',
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan_${startDate}_${endDate}.csv`;
    link.click();

    toast({
      title: 'Export Berhasil',
      description: 'File CSV berhasil diunduh',
    });
  };

  const setQuickDate = (type: 'today' | 'week' | 'month') => {
    const now = new Date();
    switch (type) {
      case 'today':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'week':
        setStartDate(format(subDays(now, 7), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-muted-foreground">Generate dan export laporan transaksi</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate('today')}
            >
              Hari Ini
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate('week')}
            >
              7 Hari Terakhir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDate('month')}
            >
              Bulan Ini
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="paid">Sukses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metode</Label>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="va">Virtual Account</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memuat...
                </>
              ) : (
                'Generate Laporan'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={exportToCSV}
              disabled={transactions.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Transaksi</p>
              <p className="text-2xl font-bold">{summary.totalTransactions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sukses</p>
              <p className="text-2xl font-bold text-success">
                {summary.successTransactions}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Pendapatan</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(summary.totalAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Fee</p>
              <p className="text-2xl font-bold text-accent">
                {formatCurrency(summary.totalFees)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detail Transaksi
          </CardTitle>
          <CardDescription>
            {transactions.length} transaksi ditemukan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Tidak ada data untuk periode ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left font-medium">Referensi</th>
                    <th className="p-2 text-left font-medium">Pelanggan</th>
                    <th className="p-2 text-left font-medium">Metode</th>
                    <th className="p-2 text-right font-medium">Nominal</th>
                    <th className="p-2 text-right font-medium">Fee</th>
                    <th className="p-2 text-right font-medium">Total</th>
                    <th className="p-2 text-left font-medium">Status</th>
                    <th className="p-2 text-left font-medium">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 50).map((tx) => (
                    <tr key={tx.id} className="border-b">
                      <td className="p-2 font-mono text-xs">
                        {tx.partner_reference_no}
                      </td>
                      <td className="p-2">{tx.customer_name || '-'}</td>
                      <td className="p-2">
                        {tx.payment_method.toUpperCase()}
                        {tx.channel_code && ` - ${tx.channel_code}`}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {formatCurrency(tx.admin_fee)}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(tx.total_amount)}
                      </td>
                      <td className="p-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            tx.status === 'paid'
                              ? 'bg-success/10 text-success'
                              : tx.status === 'pending'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy', {
                          locale: localeId,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length > 50 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Menampilkan 50 dari {transactions.length} transaksi. Export ke CSV untuk melihat semua.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
