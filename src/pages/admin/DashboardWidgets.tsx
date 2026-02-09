import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, Trash2, LayoutDashboard, Image } from 'lucide-react';

interface Widget {
  id: string;
  type: 'info_box' | 'slide' | 'banner' | 'announcement';
  title: string | null;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  order_index: number;
  target_role: string;
}

export default function DashboardWidgets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'info_box' as Widget['type'],
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    is_active: true,
    order_index: 0,
    target_role: 'all',
  });

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setWidgets(data || []);
    } catch (error) {
      console.error('Error fetching widgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingWidget(null);
    setFormData({
      type: 'info_box',
      title: '',
      content: '',
      image_url: '',
      link_url: '',
      is_active: true,
      order_index: widgets.length,
      target_role: 'all',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (widget: Widget) => {
    setEditingWidget(widget);
    setFormData({
      type: widget.type,
      title: widget.title || '',
      content: widget.content || '',
      image_url: widget.image_url || '',
      link_url: widget.link_url || '',
      is_active: widget.is_active,
      order_index: widget.order_index,
      target_role: widget.target_role,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast({
        title: 'Error',
        description: 'Judul wajib diisi',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      if (editingWidget) {
        const { error } = await supabase
          .from('dashboard_widgets')
          .update(formData)
          .eq('id', editingWidget.id);
        if (error) throw error;
        toast({ title: 'Widget berhasil diupdate' });
      } else {
        const { error } = await supabase
          .from('dashboard_widgets')
          .insert(formData);
        if (error) throw error;
        toast({ title: 'Widget berhasil ditambahkan' });
      }

      setDialogOpen(false);
      fetchWidgets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus widget ini?')) return;

    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Widget berhasil dihapus' });
      fetchWidgets();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      info_box: 'bg-primary/10 text-primary',
      slide: 'bg-accent/10 text-accent',
      banner: 'bg-warning/10 text-warning',
      announcement: 'bg-success/10 text-success',
    };
    return <Badge className={colors[type] || 'bg-muted'}>{type}</Badge>;
  };

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
          <h1 className="text-2xl font-bold">Dashboard Widgets</h1>
          <p className="text-muted-foreground">
            Kelola info box dan slide di dashboard user
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Widget
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Daftar Widget
          </CardTitle>
        </CardHeader>
        <CardContent>
          {widgets.length === 0 ? (
            <div className="py-12 text-center">
              <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Belum ada widget. Tambahkan widget untuk ditampilkan di dashboard user.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {widgets.map((widget) => (
                  <TableRow key={widget.id}>
                    <TableCell>{widget.order_index}</TableCell>
                    <TableCell>{getTypeBadge(widget.type)}</TableCell>
                    <TableCell className="font-medium">{widget.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{widget.target_role}</Badge>
                    </TableCell>
                    <TableCell>
                      {widget.is_active ? (
                        <Badge className="bg-success/10 text-success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(widget)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(widget.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWidget ? 'Edit Widget' : 'Tambah Widget'}
            </DialogTitle>
            <DialogDescription>
              Widget akan ditampilkan di dashboard user
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipe Widget</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as Widget['type'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info_box">Info Box</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="banner">Banner</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Judul widget"
              />
            </div>

            <div className="space-y-2">
              <Label>Konten</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Isi konten widget"
              />
            </div>

            <div className="space-y-2">
              <Label>URL Gambar (opsional)</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>URL Link (opsional)</Label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Role</Label>
                <Select
                  value={formData.target_role}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, target_role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_active: v }))}
              />
              <Label>Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
