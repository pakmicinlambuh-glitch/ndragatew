import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, QrCode, Building2, Store, CreditCard, Copy, ExternalLink, CheckCircle } from 'lucide-react';
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

const transactionSchema = z.object({
  amount: z.number().min(10000, 'Minimal Rp 10.000').max(50000000, 'Maksimal Rp 50.000.000'),
  paymentMethod: z.enum(['qris', 'va', 'retail']),
  channelCode: z.string().optional(),
  customerName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  customerEmail: z.string().email('Email tidak valid').optional().or(z.literal('')),
  customerPhone: z.string().optional(),
});

export default function CreateTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<FeeSettings[]>([]);
  const [fetchingChannels, setFetchingChannels] = useState(true);
  const [createdTransaction, setCreatedTransaction] = useState<{
    id: string;
    partner_reference_no: string;
    payment_url: string;
  } | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'retail'>('qris');
  const [channelCode, setChannelCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchChannels();
  }, []);

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
    } finally {
      setFetchingChannels(false);
    }
  };

  const calculateFee = (baseAmount: number) => {
    if (paymentMethod === 'qris') {
      // QRIS default fee
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

  const generateReferenceNo = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CIN-${timestamp}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const numAmount = parseInt(amount.replace(/\D/g, '')) || 0;

    const result = transactionSchema.safeParse({
      amount: numAmount,
      paymentMethod,
      channelCode: paymentMethod !== 'qris' ? channelCode : undefined,
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
      const paymentUrl = `${window.location.origin}/checkout?ref=${partnerReferenceNo}`;

      // Create transaction in database
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          partner_reference_no: partnerReferenceNo,
          amount: numAmount,
          admin_fee: adminFee,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          channel_code: paymentMethod === 'qris' ? 'QRIS' : channelCode,
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone || null,
          payment_url: paymentUrl,
          status: 'pending',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        })
        .select()
        .single();

      if (txError) throw txError;

      // Call edge function to create payment
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
        'create-payment',
        {
          body: {
            transactionId: transaction.id,
            amount: numAmount,
            paymentMethod,
            channelCode: paymentMethod === 'qris' ? 'QRIS' : channelCode,
            partnerReferenceNo,
            customerName,
          },
        }
      );

      if (paymentError) throw paymentError;

      // Set created transaction to show payment link
      setCreatedTransaction({
        id: transaction.id,
        partner_reference_no: partnerReferenceNo,
        payment_url: paymentUrl,
      });

      toast({
        title: 'Transaksi Berhasil Dibuat',
        description: `Referensi: ${partnerReferenceNo}`,
      });

      // Reset form
      setAmount('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setChannelCode('');
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buat Transaksi Baru</h1>
        <p className="text-muted-foreground">
          Generate pembayaran QRIS, Virtual Account, atau Retail
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Metode Pembayaran</CardTitle>
            <CardDescription>Pilih metode pembayaran yang diinginkan</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value as 'qris' | 'va' | 'retail');
                setChannelCode('');
              }}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="qris"
                  id="qris"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="qris"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <QrCode className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">QRIS</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="va"
                  id="va"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="va"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Building2 className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Virtual Account</span>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="retail"
                  id="retail"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="retail"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Store className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Retail</span>
                </Label>
              </div>
            </RadioGroup>

            {/* Channel Selection for VA/Retail */}
            {paymentMethod === 'va' && (
              <div className="mt-4">
                <Label htmlFor="vaChannel">Pilih Bank</Label>
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
                <Label htmlFor="retailChannel">Pilih Outlet</Label>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detail Transaksi</CardTitle>
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
                  className={`pl-10 ${errors.amount ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">Nama Pelanggan</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
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
                <Label htmlFor="customerPhone">No. Telepon (opsional)</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="081234567890"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nominal</span>
              <span>{formatCurrency(numAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya Admin</span>
              <span>{formatCurrency(adminFee)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Total Bayar</span>
                <span className="text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Buat Transaksi
            </>
          )}
        </Button>
      </form>

      {/* Payment Link Card - Shows after transaction created */}
      {createdTransaction && (
        <Card className="mt-6 border-success/50 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              Transaksi Berhasil Dibuat!
            </CardTitle>
            <CardDescription>
              Bagikan link pembayaran ini ke pelanggan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Referensi</Label>
              <p className="font-mono text-sm">{createdTransaction.partner_reference_no}</p>
            </div>
            <div className="space-y-2">
              <Label>Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  value={createdTransaction.payment_url}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(createdTransaction.payment_url);
                    toast({
                      title: 'Disalin!',
                      description: 'Payment link berhasil disalin',
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(createdTransaction.payment_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setCreatedTransaction(null)}
            >
              Buat Transaksi Baru
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
