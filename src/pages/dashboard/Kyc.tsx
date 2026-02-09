import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  MessageCircle,
  AlertTriangle,
  Image,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface KycData {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  owner_name: string | null;
  owner_nik: string | null;
  owner_address: string | null;
  business_name: string | null;
  business_type: string | null;
  business_address: string | null;
  ktp_photo_url: string | null;
  selfie_ktp_photo_url: string | null;
  business_photo_url: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

export default function Kyc() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_nik: '',
    owner_address: '',
    business_name: '',
    business_type: '',
    business_address: '',
    ktp_photo_url: '',
    selfie_ktp_photo_url: '',
    business_photo_url: '',
  });

  useEffect(() => {
    if (user) {
      fetchKycData();
    }
  }, [user]);

  const fetchKycData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_kyc')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setKycData(data);
        setFormData({
          owner_name: data.owner_name || '',
          owner_nik: data.owner_nik || '',
          owner_address: data.owner_address || '',
          business_name: data.business_name || '',
          business_type: data.business_type || '',
          business_address: data.business_address || '',
          ktp_photo_url: data.ktp_photo_url || '',
          selfie_ktp_photo_url: data.selfie_ktp_photo_url || '',
          business_photo_url: data.business_photo_url || '',
        });
      }
    } catch (error) {
      console.error('Error fetching KYC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'ktp_photo_url' | 'selfie_ktp_photo_url' | 'business_photo_url'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Format Tidak Valid',
        description: 'Hanya file gambar yang diperbolehkan',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Terlalu Besar',
        description: 'Maksimal ukuran file 5MB',
        variant: 'destructive',
      });
      return;
    }

    setUploadingField(field);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${field}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, [field]: urlData.publicUrl }));

      toast({
        title: 'Upload Berhasil',
        description: 'Foto berhasil diupload',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Gagal',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.owner_name || !formData.owner_nik || !formData.owner_address) {
      toast({
        title: 'Data Tidak Lengkap',
        description: 'Lengkapi semua data pribadi',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.business_name || !formData.business_type || !formData.business_address) {
      toast({
        title: 'Data Tidak Lengkap',
        description: 'Lengkapi semua data usaha',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.ktp_photo_url || !formData.selfie_ktp_photo_url || !formData.business_photo_url) {
      toast({
        title: 'Dokumen Tidak Lengkap',
        description: 'Upload semua dokumen yang diperlukan',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const kycPayload = {
        user_id: user?.id,
        ...formData,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      };

      if (kycData) {
        const { error } = await supabase
          .from('user_kyc')
          .update(kycPayload)
          .eq('id', kycData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_kyc').insert(kycPayload);
        if (error) throw error;
      }

      toast({
        title: 'KYC Berhasil Diajukan',
        description: 'Tim kami akan mereview dalam 1-2 hari kerja',
      });

      fetchKycData();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Gagal Mengajukan KYC',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin is exempt from KYC
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Verifikasi KYC</h1>
          <p className="text-muted-foreground">Know Your Customer</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto h-16 w-16 text-success" />
            <h2 className="mt-4 text-xl font-semibold">Admin Terverifikasi</h2>
            <p className="mt-2 text-muted-foreground">
              Sebagai admin, Anda tidak perlu melakukan verifikasi KYC.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show status if already submitted and not rejected
  if (kycData && kycData.status !== 'rejected') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Verifikasi KYC</h1>
          <p className="text-muted-foreground">Know Your Customer</p>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            {kycData.status === 'pending' ? (
              <>
                <Clock className="mx-auto h-16 w-16 text-warning" />
                <h2 className="mt-4 text-xl font-semibold">Menunggu Review</h2>
                <p className="mt-2 text-muted-foreground">
                  Pengajuan KYC Anda sedang dalam proses review.
                  <br />
                  Diajukan pada: {new Date(kycData.submitted_at!).toLocaleDateString('id-ID')}
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="mx-auto h-16 w-16 text-success" />
                <h2 className="mt-4 text-xl font-semibold">Terverifikasi</h2>
                <p className="mt-2 text-muted-foreground">
                  Akun Anda telah terverifikasi. Anda dapat menggunakan semua fitur.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {kycData.status === 'pending' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Perlu Bantuan?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Jika Anda ingin mengubah data KYC, silakan hubungi admin melalui live chat.
              </p>
              <Link to="/dashboard/chat">
                <Button className="mt-4" variant="outline">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Hubungi Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show form for new submission or rejected
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verifikasi KYC</h1>
        <p className="text-muted-foreground">
          Lengkapi verifikasi untuk menggunakan semua fitur
        </p>
      </div>

      {kycData?.status === 'rejected' && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <XCircle className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Pengajuan Ditolak</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {kycData.rejection_reason || 'Silakan perbaiki dan ajukan kembali.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle>Data Pribadi</CardTitle>
            <CardDescription>Informasi pemilik usaha</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Nama Lengkap (sesuai KTP)</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_nik">NIK (Nomor Induk Kependudukan)</Label>
              <Input
                id="owner_nik"
                value={formData.owner_nik}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_nik: e.target.value }))}
                placeholder="1234567890123456"
                maxLength={16}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_address">Alamat Lengkap (sesuai KTP)</Label>
              <Textarea
                id="owner_address"
                value={formData.owner_address}
                onChange={(e) => setFormData(prev => ({ ...prev, owner_address: e.target.value }))}
                placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan, Kota"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Data */}
        <Card>
          <CardHeader>
            <CardTitle>Data Usaha</CardTitle>
            <CardDescription>Informasi bisnis/usaha Anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Nama Usaha</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Toko ABC"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Jenis Usaha</Label>
              <Select
                value={formData.business_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, business_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis usaha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail / Toko</SelectItem>
                  <SelectItem value="fnb">Food & Beverage</SelectItem>
                  <SelectItem value="jasa">Jasa</SelectItem>
                  <SelectItem value="online">Online Shop</SelectItem>
                  <SelectItem value="other">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_address">Alamat Usaha</Label>
              <Textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) => setFormData(prev => ({ ...prev, business_address: e.target.value }))}
                placeholder="Alamat tempat usaha Anda"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Dokumen</CardTitle>
            <CardDescription>
              Upload foto dengan jelas (maksimal 5MB per file)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KTP Photo */}
            <div className="space-y-2">
              <Label>Foto KTP</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'ktp_photo_url')}
                    disabled={uploadingField === 'ktp_photo_url'}
                    className="hidden"
                    id="ktp_photo"
                  />
                  <label
                    htmlFor="ktp_photo"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {uploadingField === 'ktp_photo_url' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5" />
                    )}
                    <span>Upload Foto KTP</span>
                  </label>
                </div>
                {formData.ktp_photo_url && (
                  <div className="relative h-20 w-32 overflow-hidden rounded-lg border">
                    <img
                      src={formData.ktp_photo_url}
                      alt="KTP"
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute right-1 top-1 bg-success">
                      <CheckCircle className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Selfie with KTP */}
            <div className="space-y-2">
              <Label>Foto Selfie Memegang KTP</Label>
              <p className="text-xs text-muted-foreground">
                Foto Anda memegang KTP dengan jelas terlihat wajah dan data KTP
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'selfie_ktp_photo_url')}
                    disabled={uploadingField === 'selfie_ktp_photo_url'}
                    className="hidden"
                    id="selfie_photo"
                  />
                  <label
                    htmlFor="selfie_photo"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {uploadingField === 'selfie_ktp_photo_url' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                    <span>Upload Foto Selfie + KTP</span>
                  </label>
                </div>
                {formData.selfie_ktp_photo_url && (
                  <div className="relative h-20 w-32 overflow-hidden rounded-lg border">
                    <img
                      src={formData.selfie_ktp_photo_url}
                      alt="Selfie KTP"
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute right-1 top-1 bg-success">
                      <CheckCircle className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Business Photo */}
            <div className="space-y-2">
              <Label>Foto Tempat Usaha/Rumah</Label>
              <p className="text-xs text-muted-foreground">
                Foto Anda berdiri di depan tempat usaha atau rumah
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'business_photo_url')}
                    disabled={uploadingField === 'business_photo_url'}
                    className="hidden"
                    id="business_photo"
                  />
                  <label
                    htmlFor="business_photo"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    {uploadingField === 'business_photo_url' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                    <span>Upload Foto Tempat Usaha</span>
                  </label>
                </div>
                {formData.business_photo_url && (
                  <div className="relative h-20 w-32 overflow-hidden rounded-lg border">
                    <img
                      src={formData.business_photo_url}
                      alt="Business"
                      className="h-full w-full object-cover"
                    />
                    <Badge className="absolute right-1 top-1 bg-success">
                      <CheckCircle className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Ajukan Verifikasi KYC
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
