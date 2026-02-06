import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Save, Lock } from 'lucide-react';
import { z } from 'zod';

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

const profileSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password minimal 6 karakter'),
  newPassword: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Password tidak sama',
  path: ['confirmPassword'],
});

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Profile form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    const result = profileSchema.safeParse({ fullName, phone });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setProfileErrors(errors);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profil Diperbarui',
        description: 'Data profil Anda berhasil disimpan',
      });
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
      });
      setPasswordErrors(errors);
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Diperbarui',
        description: 'Password Anda berhasil diubah',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Gagal Mengubah Password',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-muted-foreground">Kelola informasi akun Anda</p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informasi Profil
          </CardTitle>
          <CardDescription>Perbarui informasi profil Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email tidak dapat diubah
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className={profileErrors.fullName ? 'border-destructive' : ''}
              />
              {profileErrors.fullName && (
                <p className="text-sm text-destructive">{profileErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Ubah Password
          </CardTitle>
          <CardDescription>Perbarui password akun Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={passwordErrors.currentPassword ? 'border-destructive' : ''}
              />
              {passwordErrors.currentPassword && (
                <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={passwordErrors.newPassword ? 'border-destructive' : ''}
              />
              {passwordErrors.newPassword && (
                <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengubah...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Ubah Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
