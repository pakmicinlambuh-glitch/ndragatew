import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  QrCode,
  Building2,
  Store,
  Shield,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  CreditCard,
  Globe,
  Users,
  TrendingUp,
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: <QrCode className="h-8 w-8" />,
      title: 'QRIS',
      description: 'Terima pembayaran dari semua e-wallet dan mobile banking dengan satu QR code.',
    },
    {
      icon: <Building2 className="h-8 w-8" />,
      title: 'Virtual Account',
      description: 'Transfer bank dari BCA, BNI, BRI, Mandiri, dan bank lainnya.',
    },
    {
      icon: <Store className="h-8 w-8" />,
      title: 'Retail Payment',
      description: 'Pembayaran tunai di Alfamart, Indomaret, dan gerai retail lainnya.',
    },
  ];

  const benefits = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Aman & Terpercaya',
      description: 'Transaksi dilindungi dengan enkripsi standar industri.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Integrasi Cepat',
      description: 'API dokumentasi lengkap, integrasi hanya dalam hitungan jam.',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Real-time Notification',
      description: 'Webhook callback instan saat pembayaran berhasil.',
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'Dashboard Analytics',
      description: 'Pantau transaksi dan pendapatan dengan dashboard interaktif.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Transaksi' },
    { value: '500+', label: 'Merchant' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' },
  ];

  const steps = [
    {
      step: '1',
      title: 'Daftar Akun',
      description: 'Buat akun dan lengkapi verifikasi KYC.',
    },
    {
      step: '2',
      title: 'Integrasi API',
      description: 'Gunakan API key untuk integrasi ke sistem Anda.',
    },
    {
      step: '3',
      title: 'Terima Pembayaran',
      description: 'Mulai terima pembayaran dari pelanggan Anda.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent p-2 text-primary-foreground">
              <CreditCard className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">CinGateway</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Fitur
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Biaya
            </a>
            <a href="#integration" className="text-sm text-muted-foreground hover:text-foreground">
              Integrasi
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">Masuk</Button>
            </Link>
            <Link to="/auth">
              <Button>Daftar Gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
              <Globe className="h-4 w-4" />
              Payment Gateway Indonesia
            </div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Solusi Payment Gateway{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Terpercaya
              </span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground md:text-xl">
              Terima pembayaran online dengan mudah melalui QRIS, Virtual Account, dan
              Retail. Integrasi cepat, biaya transparan, dashboard real-time.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Mulai Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  Pelajari Lebih Lanjut
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Metode Pembayaran Lengkap</h2>
            <p className="text-muted-foreground">
              Dukung berbagai metode pembayaran untuk kenyamanan pelanggan Anda
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="group relative overflow-hidden transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 p-3 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Mengapa Memilih CinGateway?</h2>
            <p className="text-muted-foreground">
              Platform payment gateway yang dibangun untuk bisnis modern
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="rounded-lg bg-card p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary">
                  {benefit.icon}
                </div>
                <h3 className="mb-2 font-semibold">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Biaya Transparan</h2>
            <p className="text-muted-foreground">
              Tidak ada biaya tersembunyi, hanya bayar per transaksi sukses
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardContent className="p-8">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <QrCode className="mx-auto mb-4 h-10 w-10 text-primary" />
                    <h3 className="mb-2 font-semibold">QRIS</h3>
                    <div className="text-2xl font-bold text-primary">0.7%</div>
                    <p className="mt-1 text-sm text-muted-foreground">per transaksi</p>
                  </div>
                  <div className="text-center">
                    <Building2 className="mx-auto mb-4 h-10 w-10 text-primary" />
                    <h3 className="mb-2 font-semibold">Virtual Account</h3>
                    <div className="text-2xl font-bold text-primary">Rp 4.000</div>
                    <p className="mt-1 text-sm text-muted-foreground">per transaksi</p>
                  </div>
                  <div className="text-center">
                    <Store className="mx-auto mb-4 h-10 w-10 text-primary" />
                    <h3 className="mb-2 font-semibold">Retail</h3>
                    <div className="text-2xl font-bold text-primary">Rp 5.000</div>
                    <p className="mt-1 text-sm text-muted-foreground">per transaksi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration Steps */}
      <section id="integration" className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Mulai dalam 3 Langkah</h2>
            <p className="text-muted-foreground">
              Integrasi mudah dan cepat untuk bisnis Anda
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xl font-bold text-primary-foreground">
                    {step.step}
                  </div>
                  <h3 className="mb-2 font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {index < steps.length - 1 && (
                    <div className="absolute right-0 top-6 hidden w-full translate-x-1/2 md:block">
                      <ArrowRight className="mx-auto h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-8 text-center text-primary-foreground md:p-12">
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold">Siap Untuk Mulai?</h2>
              <p className="mb-8 text-primary-foreground/80">
                Daftar sekarang dan mulai terima pembayaran dalam hitungan menit
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Users className="h-4 w-4" />
                  Daftar Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent p-2 text-primary-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className="font-bold">CinGateway</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Solusi payment gateway terpercaya untuk bisnis Indonesia.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Produk</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">QRIS</a></li>
                <li><a href="#features" className="hover:text-foreground">Virtual Account</a></li>
                <li><a href="#features" className="hover:text-foreground">Retail Payment</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-foreground">Kontak</a></li>
                <li><a href="#" className="hover:text-foreground">Karir</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-foreground">Kebijakan Privasi</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 CinGateway. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
