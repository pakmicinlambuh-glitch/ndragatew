import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, QrCode, Building2, Store, CreditCard, CheckCircle, Clock, Copy, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface FeeSettings {
  channel_code: string;
  channel_name: string;
  channel_type: string;
  base_fee_type: string;
  base_fee_value: number;
  markup_fee_type: string;
  markup_fee_value: number;
  min_amount: number;
  max_amount: number;
  is_active: boolean;
}

interface Transaction {
  id: string;
  partner_reference_no: string;
  amount: number;
  admin_fee: number;
  total_amount: number;
  payment_method: string;
  channel_code: string;
  status: string;
  qr_content: string | null;
  va_number: string | null;
  payment_code: string | null;
  expires_at: string | null;
}

const checkoutSchema = z.object({
  amount: z.number().min(10000, 'Minimal Rp 10.000').max(50000000, 'Maksimal Rp 50.000.000'),
  customerName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  customerEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
});

export default function Checkout() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'form' | 'payment' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<FeeSettings[]>([]);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Form state
  const [amount, setAmount] = useState(searchParams.get('amount') || '');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'retail'>('qris');
  const [channelCode, setChannelCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (transaction?.expires_at) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(transaction.expires_at!).getTime();
        const diff = Math.max(0, Math.floor((expiry - now) / 1000));
        setCountdown(diff);

        if (diff === 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [transaction]);

  useEffect(() => {
    if (transaction?.id) {
      const channel = supabase
        .channel(`checkout-${transaction.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `id=eq.${transaction.id}`,
          },
          (payload) => {
            const updated = payload.new as Transaction;
            setTransaction(updated);
            if (updated.status === 'paid') {
              setStep('success');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [transaction?.id]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_settings')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const calculateFee = (baseAmount: number) => {
    if (paymentMethod === 'qris') {
      const qrisChannel = channels.find(c => c.channel_type === 'qris');
      if (qrisChannel) {
        let fee = 0;
        if (qrisChannel.base_fee_type === 'fixed') {
          fee = qrisChannel.base_fee_value;
        } else {
          fee = (baseAmount * qrisChannel.base_fee_value) / 100;
        }
        if (qrisChannel.markup_fee_type === 'fixed') {
          fee += qrisChannel.markup_fee_value;
        } else {
          fee += (baseAmount * qrisChannel.markup_fee_value) / 100;
        }
        return Math.ceil(fee);
      }
      return 0;
    }

    const channel = channels.find(c => c.channel_code === channelCode);
    if (!channel) return 0;

    let fee = 0;
    if (channel.base_fee_type === 'fixed') {
      fee = channel.base_fee_value;
    } else {
      fee = (baseAmount * channel.base_fee_value) / 100;
    }
    if (channel.markup_fee_type === 'fixed') {
      fee += channel.markup_fee_value;
    } else {
      fee += (baseAmount * channel.markup_fee_value) / 100;
    }
    return Math.ceil(fee);
  };

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

  const generateReferenceNo = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CHK-${timestamp}-${random}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;

    const result = checkoutSchema.safeParse({
      amount: numAmount,
      customerName,
      customerEmail: customerEmail || undefined,
      customerPhone,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) newErrors[err.path[0] as string] = err.message;
      });
      setErrors(newErrors);
      return;
    }

    if ((paymentMethod === 'va' || paymentMethod === 'retail') && !channelCode) {
      setErrors({ channelCode: 'Pilih channel pembayaran' });
      return;
    }

    setLoading(true);

    try {
      const adminFee = calculateFee(numAmount);
      const totalAmount = numAmount + adminFee;
      const partnerReferenceNo = generateReferenceNo();

      // Create transaction
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          partner_reference_no: partnerReferenceNo,
          amount: numAmount,
          admin_fee: adminFee,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          channel_code: paymentMethod === 'qris' ? 'QRIS' : channelCode,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (txError) throw txError;

      // Call edge function to create payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment',
        {
          body: {
            transactionId: txData.id,
            amount: numAmount,
            paymentMethod,
            channelCode: paymentMethod === 'qris' ? 'QRIS' : channelCode,
            partnerReferenceNo,
            customerName,
          },
        }
      );

      if (paymentError) throw paymentError;

      // Fetch updated transaction with payment details
      const { data: updatedTx, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txData.id)
        .single();

      if (fetchError) throw fetchError;

      setTransaction(updatedTx);
      setStep('payment');
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Gagal Membuat Transaksi',
        description: error.message || 'Terjadi kesalahan',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const vaChannels = channels.filter(c => c.channel_type === 'va');
  const retailChannels = channels.filter(c => c.channel_type === 'retail');

  const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;
  const adminFee = calculateFee(numAmount);
  const totalAmount = numAmount + adminFee;

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-primary/10 p-4">
        <div className="mx-auto max-w-md pt-12">
          <Card className="border-0 shadow-xl text-center">
            <CardContent className="p-8">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h1 className="text-2xl font-bold text-success">Pembayaran Berhasil!</h1>
              <p className="mt-2 text-muted-foreground">
                Terima kasih, pembayaran Anda telah kami terima
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referensi</span>
                  <span className="font-mono">{transaction?.partner_reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah</span>
                  <span className="font-bold">{formatCurrency(transaction?.total_amount || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'payment' && transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <div className="mx-auto max-w-md pt-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent p-2 text-primary-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            <h1 className="mt-3 text-xl font-bold">CinGateway</h1>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle>Menunggu Pembayaran</CardTitle>
              <CardDescription>
                Selesaikan pembayaran sebelum waktu habis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 rounded-lg bg-warning/10 p-4">
                <Clock className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold text-warning">
                  {formatCountdown(countdown)}
                </span>
              </div>

              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(transaction.total_amount)}
                </p>
              </div>

              {/* Payment Details */}
              {transaction.qr_content && (
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(transaction.qr_content)}`}
                    alt="QR Code"
                    className="rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Scan QR code menggunakan aplikasi e-wallet atau mobile banking
                  </p>
                </div>
              )}

              {transaction.va_number && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    Nomor Virtual Account ({transaction.channel_code})
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xl font-mono font-bold">{transaction.va_number}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(transaction.va_number!)}
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

              {transaction.payment_code && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    Kode Pembayaran ({transaction.channel_code})
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xl font-mono font-bold">{transaction.payment_code}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(transaction.payment_code!)}
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tunjukkan kode ini ke kasir {transaction.channel_code}
                  </p>
                </div>
              )}

              {/* Reference */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Referensi</span>
                  <span className="font-mono">{transaction.partner_reference_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-warning/10 text-warning">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Halaman akan otomatis terupdate saat pembayaran diterima
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="mx-auto max-w-lg pt-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent p-3 text-primary-foreground">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">CinGateway</h1>
          <p className="mt-1 text-muted-foreground">Pembayaran Cepat & Aman</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Pilih Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value as 'qris' | 'va' | 'retail');
                  setChannelCode('');
                }}
                className="grid grid-cols-3 gap-3"
              >
                <div>
                  <RadioGroupItem value="qris" id="qris" className="peer sr-only" />
                  <Label
                    htmlFor="qris"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <QrCode className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">QRIS</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="va" id="va" className="peer sr-only" />
                  <Label
                    htmlFor="va"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <Building2 className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">VA</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="retail" id="retail" className="peer sr-only" />
                  <Label
                    htmlFor="retail"
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  >
                    <Store className="mb-2 h-6 w-6" />
                    <span className="text-sm font-medium">Retail</span>
                  </Label>
                </div>
              </RadioGroup>

              {paymentMethod === 'va' && (
                <div className="mt-4">
                  <Select value={channelCode} onValueChange={setChannelCode}>
                    <SelectTrigger className={errors.channelCode ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Pilih bank..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vaChannels.map((channel) => (
                        <SelectItem key={channel.channel_code} value={channel.channel_code}>
                          {channel.channel_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.channelCode && (
                    <p className="mt-1 text-sm text-destructive">{errors.channelCode}</p>
                  )}
                </div>
              )}

              {paymentMethod === 'retail' && (
                <div className="mt-4">
                  <Select value={channelCode} onValueChange={setChannelCode}>
                    <SelectTrigger className={errors.channelCode ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Pilih outlet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {retailChannels.map((channel) => (
                        <SelectItem key={channel.channel_code} value={channel.channel_code}>
                          {channel.channel_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.channelCode && (
                    <p className="mt-1 text-sm text-destructive">{errors.channelCode}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount & Customer Info */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Detail Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Nominal</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      const formatted = new Intl.NumberFormat('id-ID').format(
                        parseInt(value) || 0
                      );
                      setAmount(formatted);
                    }}
                    className={`pl-10 text-lg font-semibold ${errors.amount ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerName">Nama</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama Anda"
                  className={errors.customerName ? 'border-destructive' : ''}
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email (opsional)</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Telepon (opsional)</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(numAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Biaya Admin</span>
                <span>{formatCurrency(adminFee)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full h-12 text-lg"
            disabled={loading || numAmount < 10000}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Memproses...
              </>
            ) : (
              'Bayar Sekarang'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Transaksi aman & terenkripsi • Powered by CinGateway
        </p>
      </div>
    </div>
  );
}
