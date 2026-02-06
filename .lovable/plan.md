

# CinGateway - Payment Gateway Platform

## Ringkasan Proyek
Membangun platform payment gateway multi-merchant yang terintegrasi dengan sanpay.site API, dilengkapi dengan sistem role (Super Admin & User), dashboard analytics, dan checkout page yang mendukung semua metode pembayaran (QRIS, Virtual Account, Retail).

---

## 🏗️ Arsitektur Sistem

### Database (Supabase)
- **users & user_roles** - Sistem autentikasi dan role management (admin/user)
- **merchants** - Data merchant dengan API credentials masing-masing
- **transactions** - Riwayat semua transaksi dengan status dan metode bayar
- **payment_channels** - Cache channel pembayaran yang aktif
- **fee_settings** - Pengaturan markup fee per channel
- **api_settings** - Konfigurasi API sanpay.site (API Key, Merchant Code, Callback URL)

### Edge Functions (Backend API)
- **create-payment** - Generate QRIS/VA/Retail payment
- **payment-callback** - Webhook receiver untuk notifikasi pembayaran (/callback)
- **get-channels** - Ambil list channel dari sanpay.site
- **get-mutations** - Ambil riwayat mutasi dari sanpay.site
- **validate-callback** - Validasi URL callback

---

## 📱 Halaman Aplikasi

### 1. Auth Pages
- **Login** - Halaman login dengan email/password
- **Register** - Pendaftaran user baru (memerlukan approval admin)

### 2. Super Admin Dashboard
- **Overview** - Statistik total transaksi, pendapatan, grafik harian/bulanan
- **Transaksi** - Daftar semua transaksi dengan filter & search, detail status
- **Manajemen User** - Tambah/edit/hapus user, atur role (admin/user)
- **Pengaturan API** - Input API Key & Merchant Code, validasi callback URL, whitelist IP info
- **Fee Settings** - Atur markup fee per channel pembayaran
- **Laporan** - Export data ke Excel/PDF, filter berdasarkan tanggal

### 3. User Dashboard
- **Dashboard** - Statistik transaksi pribadi, quick actions
- **Buat Transaksi** - Form membuat transaksi baru (pilih metode bayar)
- **Riwayat Transaksi** - Daftar transaksi dengan status pembayaran
- **Profil** - Edit profil dan password

### 4. Public Checkout Page
- **Checkout** - Halaman pembayaran public dengan:
  - Input nominal dan referensi
  - Pilihan metode bayar (QRIS, VA, Retail) dengan biaya admin ditampilkan
  - Tampilan QR Code / Nomor VA / Kode Retail
  - Countdown expiry time
  - Status pembayaran real-time

---

## 🔐 Keamanan

### Signature Generation
- Implementasi HMAC-SHA256 untuk semua request ke sanpay.site
- Validasi signature pada callback webhook

### Webhook Security
- Endpoint `/callback` public untuk menerima notifikasi sanpay.site
- Validasi X-Merchant-Code dan X-Signature dari header
- Whitelist IP: 103.127.137.140

### Role-Based Access
- Super Admin: Akses penuh ke semua fitur
- User: Hanya bisa membuat transaksi dan melihat riwayat sendiri

---

## 🎨 Desain

### Style
- Modern & Colorful dengan primary color biru/teal
- Gradient backgrounds pada headers
- Rounded cards dengan shadow
- Responsive untuk mobile dan desktop

### Components
- Dashboard cards dengan animasi
- Data tables dengan pagination
- Modal forms untuk CRUD
- Toast notifications untuk feedback
- QR Code generator untuk QRIS

---

## 🔗 Integrasi API sanpay.site

### Endpoints yang Digunakan
1. **POST /api/v1/topup_qris** - Generate QRIS dinamis
2. **POST /api/v1/topup_va** - Buat Virtual Account
3. **POST /api/v1/topup_retail** - Buat kode Retail
4. **GET /api/v1/get_channels** - Ambil daftar channel aktif
5. **GET /api/v1/get_mutasi** - Ambil 50 transaksi terakhir
6. **Callback Webhook** - Terima notifikasi pembayaran

### Fee Calculation
- Ambil biaya admin dari get_channels API
- Tambahkan markup fee sesuai pengaturan admin
- Tampilkan total yang harus dibayar ke customer

---

## 📦 Deliverables

1. ✅ Sistem autentikasi dengan role (Admin/User)
2. ✅ Dashboard admin lengkap dengan analytics
3. ✅ Manajemen user dan pengaturan API
4. ✅ Dashboard user untuk transaksi
5. ✅ Public checkout page dengan semua metode bayar
6. ✅ Webhook endpoint untuk callback pembayaran
7. ✅ Edge functions untuk komunikasi dengan sanpay.site API
8. ✅ Export laporan ke Excel/PDF

