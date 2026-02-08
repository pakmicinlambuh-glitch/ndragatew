import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, CreditCard, CheckCircle, Clock, Copy, XCircle, AlertTriangle, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  partnerReferenceNo: string;
  amount: number;
  adminFee: number;
  totalAmount: number;
  paymentMethod: string;
  channelCode: string;
  customerName: string;
  status: string;
  qrContent: string | null;
  vaNumber: string | null;
  paymentCode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
}

export default function Checkout() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const refParam = searchParams.get('ref');

  useEffect(() => {
    if (!refParam) {
      setError('MISSING_REF');
      setLoading(false);
      return;
    }
    loadTransaction(refParam);
  }, [refParam]);

  const loadTransaction = async (ref: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use edge function for public access
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-transaction-by-ref?ref=${encodeURIComponent(ref)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.code || 'NOT_FOUND');
        return;
      }

      setTransaction(result.data);
      
      // Start realtime subscription for payment updates
      const channel = supabase
        .channel(`checkout-${result.data.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `id=eq.${result.data.id}`,
          },
          (payload) => {
            const updated = payload.new;
            if (updated.status === 'paid') {
              setTransaction(prev => prev ? { ...prev, status: 'paid', paidAt: updated.paid_at } : null);
            } else if (updated.status === 'expired') {
              setTransaction(prev => prev ? { ...prev, status: 'expired' } : null);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error('Error loading transaction:', err);
      setError('INTERNAL_ERROR');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transaction?.expiresAt && transaction.status === 'pending') {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(transaction.expiresAt!).getTime();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setCountdown(diff);

        if (diff === 0) {
          clearInterval(interval);
          setTransaction(prev => prev ? { ...prev, status: 'expired' } : null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [transaction?.expiresAt, transaction?.status]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const downloadQR = () => {
    if (!transaction?.qrContent) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(transaction.qrContent)}`;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `qr-${transaction.partnerReferenceNo}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Error states
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-muted p-4">
        <div className="mx-auto max-w-md pt-12">
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                {error === 'MISSING_REF' ? (
                  <AlertTriangle className="h-10 w-10 text-warning" />
                ) : (
                  <XCircle className="h-10 w-10 text-destructive" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-destructive">
                {error === 'MISSING_REF' ? 'Referensi Tidak Valid' : 'Transaksi Tidak Ditemukan'}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {error === 'MISSING_REF' 
                  ? 'Link pembayaran tidak memiliki kode referensi yang valid.'
                  : 'Transaksi dengan referensi ini tidak ditemukan atau sudah tidak berlaku.'
                }
              </p>
              <div className="mt-6 p-4 rounded-lg bg-muted text-left">
                <p className="text-sm font-medium mb-2">Butuh bantuan?</p>
                <p className="text-xs text-muted-foreground">
                  Hubungi merchant yang memberikan link ini atau email ke support@cingateway.com
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Memuat transaksi...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (transaction?.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-primary/10 p-4">
        <div className="mx-auto max-w-md pt-12">
          <Card className="border-0 shadow-xl text-center overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-success to-primary" />
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/10 animate-pulse">
                <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <h1 className="text-3xl font-bold text-success">Pembayaran Berhasil!</h1>
              <p className="mt-2 text-muted-foreground">
                Terima kasih, pembayaran Anda telah kami terima
              </p>
              <div className="mt-8 space-y-3 text-sm">
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Referensi</span>
                  <span className="font-mono font-medium">{transaction.partnerReferenceNo}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span className="font-bold text-lg">{formatCurrency(transaction.totalAmount)}</span>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-muted">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-success text-white">Lunas</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Expired state
  if (transaction?.status === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted p-4">
        <div className="mx-auto max-w-md pt-12">
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Clock className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-muted-foreground">Pembayaran Kedaluwarsa</h1>
              <p className="mt-2 text-muted-foreground">
                Waktu pembayaran telah habis. Silakan buat transaksi baru.
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referensi</span>
                  <span className="font-mono">{transaction.partnerReferenceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span>{formatCurrency(transaction.totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pending payment state
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="mx-auto max-w-md pt-6 pb-12">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground shadow-lg">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold">CinGateway</h1>
          <p className="text-sm text-muted-foreground">Payment Gateway</p>
        </div>

        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-accent" />
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg">Menunggu Pembayaran</CardTitle>
            <CardDescription>
              Selesaikan pembayaran sebelum waktu habis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 rounded-xl bg-warning/10 p-4 border border-warning/20">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-3xl font-bold font-mono text-warning">
                {formatCountdown(countdown)}
              </span>
            </div>

            {/* Amount */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border">
              <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(transaction?.totalAmount || 0)}
              </p>
              {transaction?.adminFee && transaction.adminFee > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Termasuk biaya admin {formatCurrency(transaction.adminFee)}
                </p>
              )}
            </div>

            {/* QRIS Payment */}
            {transaction?.qrContent && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-2xl shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(transaction.qrContent)}`}
                    alt="QR Code"
                    className="rounded-lg"
                    width={220}
                    height={220}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadQR}>
                    <Download className="h-4 w-4 mr-1" />
                    Download QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(transaction.qrContent!)}>
                    <Copy className="h-4 w-4 mr-1" />
                    Salin Data
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Scan QR code dengan aplikasi
                  </p>
                  <p className="text-xs text-muted-foreground">
                    GoPay, OVO, DANA, ShopeePay, atau Mobile Banking
                  </p>
                </div>
              </div>
            )}

            {/* VA Payment */}
            {transaction?.vaNumber && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Virtual Account {transaction.channelCode}
                    </p>
                    <Badge variant="outline">{transaction.channelCode}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-mono font-bold tracking-wider">{transaction.vaNumber}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(transaction.vaNumber!)}
                      className="shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Cara pembayaran:</p>
                  <ol className="list-decimal list-inside text-xs space-y-1">
                    <li>Buka aplikasi mobile banking atau ATM</li>
                    <li>Pilih menu Transfer ke Virtual Account</li>
                    <li>Masukkan nomor VA di atas</li>
                    <li>Konfirmasi nominal dan bayar</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Retail Payment */}
            {transaction?.paymentCode && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted p-4 border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Kode Pembayaran {transaction.channelCode}
                    </p>
                    <Badge variant="outline">{transaction.channelCode}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-mono font-bold tracking-wider">{transaction.paymentCode}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(transaction.paymentCode!)}
                      className="shrink-0"
                    >
                      {copied ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Cara pembayaran:</p>
                  <ol className="list-decimal list-inside text-xs space-y-1">
                    <li>Kunjungi gerai {transaction.channelCode} terdekat</li>
                    <li>Tunjukkan kode pembayaran ke kasir</li>
                    <li>Bayar sesuai nominal</li>
                    <li>Simpan struk sebagai bukti</li>
                  </ol>
                </div>
              </div>
            )}

            {/* Reference Info */}
            <div className="space-y-2 text-sm border-t pt-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">No. Referensi</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs">{transaction?.partnerReferenceNo}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(transaction?.partnerReferenceNo || '')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pelanggan</span>
                <span>{transaction?.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  Menunggu Pembayaran
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Halaman akan otomatis terupdate saat pembayaran diterima
        </p>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-medium">CinGateway</span>
          </p>
        </div>
      </div>
    </div>
  );
}
