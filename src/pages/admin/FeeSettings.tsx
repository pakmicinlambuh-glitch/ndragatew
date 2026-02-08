import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Edit, QrCode, Building2, Store, Calculator } from 'lucide-react';

interface FeeSettings {
  id: string;
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
  threshold_amount?: number;
  fee_below_threshold?: number;
  fee_above_threshold?: number;
}

export default function FeeSettings() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<FeeSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [editChannel, setEditChannel] = useState<FeeSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [markupFeeType, setMarkupFeeType] = useState<'fixed' | 'percent'>('fixed');
  const [markupFeeValue, setMarkupFeeValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Tiered fee state (for QRIS)
  const [thresholdAmount, setThresholdAmount] = useState('500000');
  const [feeBelowThreshold, setFeeBelowThreshold] = useState('0');
  const [feeAboveThreshold, setFeeAboveThreshold] = useState('0.5');

  // Fee calculator
  const [calcAmount, setCalcAmount] = useState('100000');

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_settings')
        .select('*')
        .order('channel_type', { ascending: true });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChannel = (channel: FeeSettings) => {
    setEditChannel(channel);
    setMarkupFeeType(channel.markup_fee_type as 'fixed' | 'percent');
    setMarkupFeeValue(channel.markup_fee_value.toString());
    setIsActive(channel.is_active);
    setThresholdAmount((channel.threshold_amount || 500000).toString());
    setFeeBelowThreshold((channel.fee_below_threshold || 0).toString());
    setFeeAboveThreshold((channel.fee_above_threshold || 0.5).toString());
  };

  const handleSaveChannel = async () => {
    if (!editChannel) return;

    setSaving(true);

    try {
      const updateData: any = {
        markup_fee_type: markupFeeType,
        markup_fee_value: parseFloat(markupFeeValue) || 0,
        is_active: isActive,
      };

      // Add tiered fee fields for QRIS
      if (editChannel.channel_type === 'qris') {
        updateData.threshold_amount = parseInt(thresholdAmount) || 500000;
        updateData.fee_below_threshold = parseFloat(feeBelowThreshold) || 0;
        updateData.fee_above_threshold = parseFloat(feeAboveThreshold) || 0.5;
      }

      const { error } = await supabase
        .from('fee_settings')
        .update(updateData)
        .eq('id', editChannel.id);

      if (error) throw error;

      toast({
        title: 'Fee Diperbarui',
        description: `Pengaturan fee untuk ${editChannel.channel_name} berhasil disimpan`,
      });

      setEditChannel(null);
      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Gagal Memperbarui',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (channel: FeeSettings) => {
    try {
      const { error } = await supabase
        .from('fee_settings')
        .update({ is_active: !channel.is_active })
        .eq('id', channel.id);

      if (error) throw error;

      fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Gagal Mengubah Status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatFee = (type: string, value: number) => {
    if (type === 'fixed') {
      return formatCurrency(value);
    }
    return `${value}%`;
  };

  const calculateQrisFee = (amount: number, channel: FeeSettings): number => {
    const threshold = channel.threshold_amount || 500000;
    let baseFee = 0;

    if (amount < threshold) {
      baseFee = (amount * (channel.fee_below_threshold || 0)) / 100;
    } else {
      baseFee = (amount * (channel.fee_above_threshold || 0.5)) / 100;
    }

    let markupFee = 0;
    if (channel.markup_fee_type === 'fixed') {
      markupFee = channel.markup_fee_value;
    } else {
      markupFee = (amount * channel.markup_fee_value) / 100;
    }

    return Math.ceil(baseFee + markupFee);
  };

  const calculateStandardFee = (amount: number, channel: FeeSettings): number => {
    let baseFee = 0;
    if (channel.base_fee_type === 'fixed') {
      baseFee = channel.base_fee_value;
    } else {
      baseFee = (amount * channel.base_fee_value) / 100;
    }

    let markupFee = 0;
    if (channel.markup_fee_type === 'fixed') {
      markupFee = channel.markup_fee_value;
    } else {
      markupFee = (amount * channel.markup_fee_value) / 100;
    }

    return Math.ceil(baseFee + markupFee);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const qrisChannels = channels.filter(c => c.channel_type === 'qris');
  const vaChannels = channels.filter(c => c.channel_type === 'va');
  const retailChannels = channels.filter(c => c.channel_type === 'retail');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan Fee</h1>
        <p className="text-muted-foreground">
          Kelola markup fee untuk setiap channel pembayaran
        </p>
      </div>

      {/* Fee Calculator */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5" />
            Kalkulator Fee
          </CardTitle>
          <CardDescription>
            Simulasi perhitungan fee untuk berbagai nominal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="calcAmount">Nominal Transaksi</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">Rp</span>
                <Input
                  id="calcAmount"
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value.replace(/\D/g, ''))}
                  className="pl-10"
                  placeholder="100000"
                />
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              {qrisChannels[0] && (
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">QRIS</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(calculateQrisFee(parseInt(calcAmount) || 0, qrisChannels[0]))}
                  </p>
                </div>
              )}
              {vaChannels[0] && (
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">VA</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(calculateStandardFee(parseInt(calcAmount) || 0, vaChannels[0]))}
                  </p>
                </div>
              )}
              {retailChannels[0] && (
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Retail</p>
                  <p className="font-bold text-primary">
                    {formatCurrency(calculateStandardFee(parseInt(calcAmount) || 0, retailChannels[0]))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">Belum ada channel terkonfigurasi</p>
            <p className="text-sm">
              Sinkronisasi channel dari halaman Pengaturan API
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="qris" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="qris" className="gap-2">
              <QrCode className="h-4 w-4" />
              QRIS
            </TabsTrigger>
            <TabsTrigger value="va" className="gap-2">
              <Building2 className="h-4 w-4" />
              Virtual Account
            </TabsTrigger>
            <TabsTrigger value="retail" className="gap-2">
              <Store className="h-4 w-4" />
              Retail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qris">
            <Card>
              <CardHeader>
                <CardTitle>QRIS - Tiered Fee</CardTitle>
                <CardDescription>
                  Fee QRIS dapat dikonfigurasi berbeda untuk transaksi di bawah dan di atas threshold
                </CardDescription>
              </CardHeader>
              <CardContent>
                {qrisChannels.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Tidak ada channel QRIS</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Fee &lt; Threshold</TableHead>
                        <TableHead>Fee ≥ Threshold</TableHead>
                        <TableHead>Markup</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {qrisChannels.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">
                            {channel.channel_name}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(channel.threshold_amount || 500000)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {channel.fee_below_threshold || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {channel.fee_above_threshold || 0.5}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatFee(channel.markup_fee_type, channel.markup_fee_value)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={channel.is_active}
                              onCheckedChange={() => handleToggleActive(channel)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditChannel(channel)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="va">
            <Card>
              <CardHeader>
                <CardTitle>Virtual Account</CardTitle>
              </CardHeader>
              <CardContent>
                {vaChannels.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Tidak ada channel VA</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead>Fee Dasar</TableHead>
                        <TableHead>Markup</TableHead>
                        <TableHead>Min</TableHead>
                        <TableHead>Max</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaChannels.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">
                            {channel.channel_name}
                          </TableCell>
                          <TableCell>
                            {formatFee(channel.base_fee_type, channel.base_fee_value)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatFee(channel.markup_fee_type, channel.markup_fee_value)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(channel.min_amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {channel.max_amount === 0
                              ? 'Unlimited'
                              : formatCurrency(channel.max_amount)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={channel.is_active}
                              onCheckedChange={() => handleToggleActive(channel)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditChannel(channel)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retail">
            <Card>
              <CardHeader>
                <CardTitle>Retail</CardTitle>
              </CardHeader>
              <CardContent>
                {retailChannels.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Tidak ada channel Retail</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Fee Dasar</TableHead>
                        <TableHead>Markup</TableHead>
                        <TableHead>Min</TableHead>
                        <TableHead>Max</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retailChannels.map((channel) => (
                        <TableRow key={channel.id}>
                          <TableCell className="font-medium">
                            {channel.channel_name}
                          </TableCell>
                          <TableCell>
                            {formatFee(channel.base_fee_type, channel.base_fee_value)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {formatFee(channel.markup_fee_type, channel.markup_fee_value)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(channel.min_amount)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatCurrency(channel.max_amount)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={channel.is_active}
                              onCheckedChange={() => handleToggleActive(channel)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditChannel(channel)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editChannel} onOpenChange={() => setEditChannel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Fee - {editChannel?.channel_name}</DialogTitle>
            <DialogDescription>
              {editChannel?.channel_type === 'qris' 
                ? 'Konfigurasi tiered fee untuk QRIS' 
                : 'Edit markup fee untuk channel ini'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show base fee info */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Fee Dasar (Provider)</p>
              <p className="font-medium">
                {editChannel && formatFee(editChannel.base_fee_type, editChannel.base_fee_value)}
              </p>
            </div>

            {/* Tiered fee settings for QRIS */}
            {editChannel?.channel_type === 'qris' && (
              <>
                <div className="space-y-2">
                  <Label>Threshold Amount (Rp)</Label>
                  <Input
                    type="number"
                    value={thresholdAmount}
                    onChange={(e) => setThresholdAmount(e.target.value)}
                    placeholder="500000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Batas nominal untuk menentukan fee yang berbeda
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee &lt; Threshold (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeBelowThreshold}
                      onChange={(e) => setFeeBelowThreshold(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee ≥ Threshold (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={feeAboveThreshold}
                      onChange={(e) => setFeeAboveThreshold(e.target.value)}
                      placeholder="0.5"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Markup fee settings */}
            <div className="space-y-2">
              <Label>Tipe Markup (Tambahan)</Label>
              <Select value={markupFeeType} onValueChange={(v) => setMarkupFeeType(v as 'fixed' | 'percent')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Nilai Markup {markupFeeType === 'fixed' ? '(Rp)' : '(%)'}
              </Label>
              <Input
                type="number"
                step={markupFeeType === 'percent' ? '0.1' : '1'}
                value={markupFeeValue}
                onChange={(e) => setMarkupFeeValue(e.target.value)}
                placeholder={markupFeeType === 'fixed' ? '1000' : '0.5'}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Status Aktif</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditChannel(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveChannel} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
