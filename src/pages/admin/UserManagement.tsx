import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Search, Shield, Users, UserPlus, Edit, Ban, 
  CheckCircle, XCircle, Bell, Wallet, FileCheck, AlertTriangle,
  Send, DollarSign, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  role: string;
  balance?: number;
  kyc_status?: string;
}

interface NotificationForm {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  targetUserId?: string;
  isBroadcast: boolean;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [suspendUser, setSuspendUser] = useState<UserWithRole | null>(null);
  const [balanceUser, setBalanceUser] = useState<UserWithRole | null>(null);
  const [notificationDialog, setNotificationDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editIsActive, setEditIsActive] = useState(true);

  // Suspend form state
  const [suspendReason, setSuspendReason] = useState('');

  // Balance form state
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'credit' | 'debit'>('credit');
  const [balanceDescription, setBalanceDescription] = useState('');

  // Notification form state
  const [notification, setNotification] = useState<NotificationForm>({
    title: '',
    message: '',
    type: 'info',
    isBroadcast: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch balances
      const { data: balances, error: balancesError } = await supabase
        .from('user_balance')
        .select('user_id, balance')
        .eq('mode', 'live');

      // Fetch KYC status
      const { data: kycs, error: kycsError } = await supabase
        .from('user_kyc')
        .select('user_id, status');

      // Combine data
      const usersWithRoles = profiles?.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userBalance = balances?.find(b => b.user_id === profile.user_id);
        const userKyc = kycs?.find(k => k.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'user',
          balance: userBalance?.balance || 0,
          kyc_status: userKyc?.status || 'none',
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserWithRole) => {
    setEditUser(user);
    setEditFullName(user.full_name || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role);
    setEditIsActive(user.is_active);
  };

  const handleSaveUser = async () => {
    if (!editUser) return;

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          phone: editPhone || null,
          is_active: editIsActive,
        })
        .eq('user_id', editUser.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editRole !== editUser.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editRole as 'admin' | 'user' })
          .eq('user_id', editUser.user_id);

        if (roleError) throw roleError;
      }

      toast({
        title: 'User Diperbarui',
        description: 'Data user berhasil disimpan',
      });

      setEditUser(null);
      fetchUsers();
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

  const handleSuspendUser = async () => {
    if (!suspendUser) return;

    setSaving(true);

    try {
      const isSuspending = !suspendUser.suspended_at;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          suspended_at: isSuspending ? new Date().toISOString() : null,
          suspended_reason: isSuspending ? suspendReason : null,
        })
        .eq('user_id', suspendUser.user_id);

      if (error) throw error;

      toast({
        title: isSuspending ? 'User Disuspend' : 'Suspend Dicabut',
        description: isSuspending 
          ? `${suspendUser.email} telah disuspend`
          : `${suspendUser.email} dapat login kembali`,
      });

      setSuspendUser(null);
      setSuspendReason('');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!balanceUser || !balanceAmount) return;

    setSaving(true);

    try {
      const amount = parseInt(balanceAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Nominal tidak valid');
      }

      const { error } = await supabase.rpc('adjust_user_balance', {
        _user_id: balanceUser.user_id,
        _amount: amount,
        _type: balanceType,
        _description: balanceDescription || `${balanceType === 'credit' ? 'Penambahan' : 'Pengurangan'} saldo oleh admin`,
        _created_by: currentUser?.id,
        _mode: 'live',
      });


      if (error) throw error;

      toast({
        title: 'Saldo Diperbarui',
        description: `${balanceType === 'credit' ? 'Menambah' : 'Mengurangi'} Rp ${amount.toLocaleString('id-ID')}`,
      });

      setBalanceUser(null);
      setBalanceAmount('');
      setBalanceDescription('');
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notification.title || !notification.message) return;

    setSaving(true);

    try {
      if (notification.isBroadcast) {
        // Send to all users
        const notifications = users.map(user => ({
          user_id: user.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_broadcast: true,
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;

        toast({
          title: 'Notifikasi Terkirim',
          description: `Broadcast ke ${users.length} user`,
        });
      } else if (notification.targetUserId) {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: notification.targetUserId,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            is_broadcast: false,
          });

        if (error) throw error;

        toast({
          title: 'Notifikasi Terkirim',
          description: 'Notifikasi berhasil dikirim',
        });
      }

      setNotificationDialog(false);
      setNotification({
        title: '',
        message: '',
        type: 'info',
        isBroadcast: true,
      });
    } catch (error: any) {
      toast({
        title: 'Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getKycBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">Belum KYC</Badge>;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen User</h1>
          <p className="text-muted-foreground">Kelola pengguna, KYC, saldo, dan notifikasi</p>
        </div>
        <Button onClick={() => setNotificationDialog(true)}>
          <Bell className="h-4 w-4 mr-2" />
          Kirim Notifikasi
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total User</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2 text-success">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Verified</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.kyc_status === 'approved').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Pending</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.kyc_status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
                <Ban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Suspended</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.suspended_at).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Tidak ada user ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.suspended_at ? 'opacity-60' : ''}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'No Name'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <Badge className="bg-accent/10 text-accent">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {getKycBadge(user.kyc_status || 'none')}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono">
                          {formatCurrency(user.balance || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.suspended_at ? (
                          <Badge variant="destructive">
                            <Ban className="mr-1 h-3 w-3" />
                            Suspended
                          </Badge>
                        ) : user.is_active ? (
                          <Badge className="bg-success/10 text-success">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'dd MMM yyyy', {
                          locale: localeId,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBalanceUser(user)}
                            title="Kelola Saldo"
                          >
                            <Wallet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSuspendUser(user)}
                            title={user.suspended_at ? 'Unsuspend' : 'Suspend'}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setNotification(prev => ({
                                ...prev,
                                isBroadcast: false,
                                targetUserId: user.user_id,
                              }));
                              setNotificationDialog(true);
                            }}
                            title="Kirim Notifikasi"
                          >
                            <Bell className="h-4 w-4" />
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

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>No. Telepon</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="081234567890"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editIsActive ? 'active' : 'inactive'}
                onValueChange={(v) => setEditIsActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend User Dialog */}
      <Dialog open={!!suspendUser} onOpenChange={() => setSuspendUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendUser?.suspended_at ? 'Cabut Suspend' : 'Suspend User'}
            </DialogTitle>
            <DialogDescription>{suspendUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {suspendUser?.suspended_at ? (
              <div className="rounded-lg bg-warning/10 p-4">
                <p className="text-sm font-medium">User saat ini disuspend karena:</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {suspendUser.suspended_reason || 'Tidak ada alasan'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Alasan Suspend</Label>
                <Textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Masukkan alasan suspend..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendUser(null)}>
              Batal
            </Button>
            <Button 
              onClick={handleSuspendUser} 
              disabled={saving}
              variant={suspendUser?.suspended_at ? 'default' : 'destructive'}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {suspendUser?.suspended_at ? 'Cabut Suspend' : 'Suspend'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Dialog */}
      <Dialog open={!!balanceUser} onOpenChange={() => setBalanceUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kelola Saldo</DialogTitle>
            <DialogDescription>{balanceUser?.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Saldo Saat Ini</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(balanceUser?.balance || 0)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Tipe Transaksi</Label>
              <Select value={balanceType} onValueChange={(v) => setBalanceType(v as 'credit' | 'debit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Tambah Saldo (Credit)</SelectItem>
                  <SelectItem value="debit">Kurangi Saldo (Debit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nominal (Rp)</Label>
              <Input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="100000"
              />
            </div>

            <div className="space-y-2">
              <Label>Keterangan (opsional)</Label>
              <Input
                value={balanceDescription}
                onChange={(e) => setBalanceDescription(e.target.value)}
                placeholder="Topup manual, Refund, dll"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceUser(null)}>
              Batal
            </Button>
            <Button onClick={handleAdjustBalance} disabled={saving || !balanceAmount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {balanceType === 'credit' ? 'Tambah' : 'Kurangi'} Saldo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notificationDialog} onOpenChange={setNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim Notifikasi</DialogTitle>
            <DialogDescription>
              {notification.isBroadcast 
                ? 'Kirim ke semua user' 
                : 'Kirim ke user tertentu'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Target</Label>
              <Select 
                value={notification.isBroadcast ? 'broadcast' : 'single'}
                onValueChange={(v) => setNotification(prev => ({
                  ...prev,
                  isBroadcast: v === 'broadcast',
                  targetUserId: v === 'broadcast' ? undefined : prev.targetUserId,
                }))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broadcast">Broadcast (Semua)</SelectItem>
                  <SelectItem value="single">User Tertentu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!notification.isBroadcast && (
              <div className="space-y-2">
                <Label>Pilih User</Label>
                <Select 
                  value={notification.targetUserId || ''}
                  onValueChange={(v) => setNotification(prev => ({
                    ...prev,
                    targetUserId: v,
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.full_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Tipe</Label>
              <Select 
                value={notification.type}
                onValueChange={(v) => setNotification(prev => ({
                  ...prev,
                  type: v as 'info' | 'warning' | 'success' | 'error',
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Judul</Label>
              <Input
                value={notification.title}
                onChange={(e) => setNotification(prev => ({
                  ...prev,
                  title: e.target.value,
                }))}
                placeholder="Judul notifikasi"
              />
            </div>

            <div className="space-y-2">
              <Label>Pesan</Label>
              <Textarea
                value={notification.message}
                onChange={(e) => setNotification(prev => ({
                  ...prev,
                  message: e.target.value,
                }))}
                placeholder="Isi pesan notifikasi..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotificationDialog(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSendNotification} 
              disabled={saving || !notification.title || !notification.message}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
