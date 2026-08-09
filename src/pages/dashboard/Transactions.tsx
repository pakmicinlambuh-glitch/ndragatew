import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Loader2, Search, Eye, CreditCard, Copy, CheckCircle, ExternalLink, Link2, FlaskConical, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useEnvMode } from '@/hooks/useEnvMode';

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
  payment_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mode, isSandbox } = useEnvMode();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);
  const [simulatingRef, setSimulatingRef] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();

    const channel = supabase
      .channel(`user-transactions-${user.id}-${mode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Transaction & { mode?: string };
          if (row?.mode && row.mode !== mode) return;
          if (payload.eventType === 'INSERT') {
            setTransactions((prev) => [row, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions((prev) => prev.map((t) => (t.id === row.id ? row : t)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, mode]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('mode', mode)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulatePayment = async (tx: Transaction, status: 'paid' | 'expired' | 'failed' = 'paid') => {
    setSimulatingRef(tx.partner_reference_no);
    try {
      const { data, error } = await supabase.functions.invoke('sandbox-simulate', {
        body: { reference: tx.partner_reference_no, status },
      });
      if (error) throw error;
      if ((data as any)?.status === 'error') throw new Error((data as any).message);
      toast({
        title: 'Simulasi berhasil',
        description: `Transaksi sandbox ditandai ${status}.`,
      });
      fetchTransactions();
    } catch (e: any) {
      toast({ title: 'Simulasi gagal', description: e.message, variant: 'destructive' });
    } finally {
      setSimulatingRef(null);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Disalin!',
      description: 'Teks telah disalin ke clipboard',
    });
  };

  const getPaymentUrl = (tx: Transaction) => {
    return tx.payment_url || `${window.location.origin}/checkout?ref=${tx.partner_reference_no}`;
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.partner_reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
        <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>
        <p className="text-muted-foreground">Daftar semua transaksi Anda</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Sukses</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-mono text-sm">{tx.partner_reference_no}</p>
                          {tx.status === 'pending' && (
                            <div className="flex items-center gap-1">
                              <Link2 className="h-3 w-3 text-primary" />
                              <a 
                                href={getPaymentUrl(tx)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline"
                              >
                                Buka Payment Link
                              </a>
                            </div>
                          )}
                        </div>
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
                      <TableCell>{formatCurrency(tx.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', {
                          locale: localeId,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {tx.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(getPaymentUrl(tx))}
                                title="Salin Payment Link"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(getPaymentUrl(tx), '_blank')}
                                title="Buka Payment Link"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedTransaction(tx)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
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

              {/* Payment Link for Pending */}
              {selectedTransaction.status === 'pending' && (
                <div className="rounded-lg bg-primary/5 p-4 border border-primary/20">
                  <p className="text-sm font-medium mb-2">Payment Link</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={getPaymentUrl(selectedTransaction)}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getPaymentUrl(selectedTransaction))}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => window.open(getPaymentUrl(selectedTransaction), '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Payment Details */}
              {selectedTransaction.va_number && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Nomor Virtual Account</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-lg font-mono font-bold">
                      {selectedTransaction.va_number}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(selectedTransaction.va_number!)}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {selectedTransaction.payment_code && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Kode Pembayaran</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-lg font-mono font-bold">
                      {selectedTransaction.payment_code}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(selectedTransaction.payment_code!)}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

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
                {selectedTransaction.customer_phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telepon</span>
                    <span>{selectedTransaction.customer_phone}</span>
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
                {selectedTransaction.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kadaluarsa</span>
                    <span>
                      {format(new Date(selectedTransaction.expires_at), 'dd MMM yyyy, HH:mm', {
                        locale: localeId,
                      })}
                    </span>
                  </div>
                )}
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
