import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Eye, CreditCard, Download } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Transaction {
  id: string;
  partner_reference_no: string;
  external_id: string | null;
  amount: number;
  admin_fee: number;
  total_amount: number;
  payment_method: string;
  channel_code: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  qr_content: string | null;
  va_number: string | null;
  payment_code: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminTransactions() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();

      const channel = supabase
        .channel('admin-transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'transactions',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setTransactions(prev => [payload.new as Transaction, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setTransactions(prev =>
                prev.map(t => (t.id === payload.new.id ? payload.new as Transaction : t))
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Sukses</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-muted text-muted-foreground">Expired</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'qris':
        return 'QRIS';
      case 'va':
        return 'Virtual Account';
      case 'retail':
        return 'Retail';
      default:
        return method;
    }
  };

  const exportToCSV = () => {
    const headers = ['Referensi', 'Pelanggan', 'Email', 'Metode', 'Channel', 'Nominal', 'Fee', 'Total', 'Status', 'Tanggal'];
    const rows = filteredTransactions.map(tx => [
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
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.partner_reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || tx.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate totals
  const totalRevenue = filteredTransactions
    .filter(tx => tx.status === 'paid')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  const totalFees = filteredTransactions
    .filter(tx => tx.status === 'paid')
    .reduce((sum, tx) => sum + tx.admin_fee, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Semua Transaksi</h1>
          <p className="text-muted-foreground">Kelola semua transaksi dari semua user</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Transaksi</p>
            <p className="text-2xl font-bold">{filteredTransactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Pendapatan (Sukses)</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Fee (Sukses)</p>
            <p className="text-2xl font-bold text-accent">{formatCurrency(totalFees)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Sukses</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Metode" />
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
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.partner_reference_no}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tx.customer_name || '-'}</p>
                          {tx.customer_email && (
                            <p className="text-xs text-muted-foreground">
                              {tx.customer_email}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {getPaymentMethodLabel(tx.payment_method)}
                          </p>
                          {tx.channel_code && (
                            <p className="text-xs text-muted-foreground">
                              {tx.channel_code}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.amount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(tx.admin_fee)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(tx.total_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', {
                          locale: localeId,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog
        open={!!selectedTransaction}
        onOpenChange={() => setSelectedTransaction(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.partner_reference_no}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground">Metode</p>
                  <p className="font-medium">
                    {getPaymentMethodLabel(selectedTransaction.payment_method)}
                    {selectedTransaction.channel_code && ` - ${selectedTransaction.channel_code}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nominal</p>
                  <p className="font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Biaya Admin</p>
                  <p className="font-medium">{formatCurrency(selectedTransaction.admin_fee)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Total Bayar</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(selectedTransaction.total_amount)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pelanggan</span>
                  <span>{selectedTransaction.customer_name || '-'}</span>
                </div>
                {selectedTransaction.customer_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedTransaction.customer_email}</span>
                  </div>
                )}
                {selectedTransaction.va_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VA Number</span>
                    <span className="font-mono">{selectedTransaction.va_number}</span>
                  </div>
                )}
                {selectedTransaction.payment_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kode Bayar</span>
                    <span className="font-mono">{selectedTransaction.payment_code}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dibuat</span>
                  <span>
                    {format(new Date(selectedTransaction.created_at), 'dd MMM yyyy, HH:mm', {
                      locale: localeId,
                    })}
                  </span>
                </div>
                {selectedTransaction.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dibayar</span>
                    <span>
                      {format(new Date(selectedTransaction.paid_at), 'dd MMM yyyy, HH:mm', {
                        locale: localeId,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
