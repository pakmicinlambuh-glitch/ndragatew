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
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Edit, QrCode, Building2, Store } from 'lucide-react';

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
  };

  const handleSaveChannel = async () => {
    if (!editChannel) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('fee_settings')
        .update({
          markup_fee_type: markupFeeType,
          markup_fee_value: parseFloat(markupFeeValue) || 0,
          is_active: isActive,
        })
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

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'qris':
        return <QrCode className="h-4 w-4" />;
      case 'va':
        return <Building2 className="h-4 w-4" />;
      case 'retail':
        return <Store className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatFee = (type: string, value: number) => {
    if (type === 'fixed') {
      return formatCurrency(value);
    }
    return `${value}%`;
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
        <>
          {/* QRIS */}
          {qrisChannels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QRIS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Fee Dasar</TableHead>
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
                          {formatFee(channel.base_fee_type, channel.base_fee_value)}
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
              </CardContent>
            </Card>
          )}

          {/* Virtual Account */}
          {vaChannels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Virtual Account
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Retail */}
          {retailChannels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Retail
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editChannel} onOpenChange={() => setEditChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Markup Fee</DialogTitle>
            <DialogDescription>
              {editChannel?.channel_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Fee Dasar (sanpay.site)</p>
              <p className="font-medium">
                {editChannel && formatFee(editChannel.base_fee_type, editChannel.base_fee_value)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipe Markup</Label>
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
                value={markupFeeValue}
                onChange={(e) => setMarkupFeeValue(e.target.value)}
                placeholder={markupFeeType === 'fixed' ? '1000' : '1.5'}
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
