# Upgrade CinGateway: Dukungan Multi Provider

## Kondisi saat ini (hasil pemeriksaan)

- Seluruh integrasi terkunci ke Sanpay: URL `https://sanpay.site/api/v1/...` ditulis langsung di `create-payment`, `get-channels`, dan `check-transaction`.
- Kredensial provider disimpan di tabel `api_settings` sebagai **satu baris tunggal** (api_key + merchant_code), jadi tidak mungkin menyimpan lebih dari satu provider.
- Webhook `sanpay-webhook` mengunci IP `103.127.137.140` dan format payload Sanpay.
- Tabel `fee_settings` memakai `channel_code` unik global, sehingga channel dari dua provider berbeda akan saling menimpa.
- Tabel `transactions` tidak punya kolom penanda provider, jadi tidak bisa diketahui transaksi diproses lewat provider mana.

Kesimpulan: sistem perlu lapisan abstraksi provider, bukan sekadar menambah URL baru.

## Yang akan dibangun

### 1. Konsep "Server"
Setiap provider yang diaktifkan admin tampil ke merchant sebagai **Server 1, Server 2, Server 3, ...** (nama internal Sanpay/Tripay/Duitku/Midtrans/Xendit hanya terlihat admin). Merchant memilih server yang dipakai saat membuat transaksi; semua server bisa aktif bersamaan.

### 2. Provider yang didukung
Sanpay (existing), Tripay, Duitku, Midtrans, Xendit, plus tipe **Custom** — admin mengisi base URL, format autentikasi, dan pemetaan field lewat form, tanpa perlu kode baru.

### 3. Panel Admin baru: Kelola Provider
- Daftar provider: tambah/edit/hapus, aktif/nonaktif, urutan tampil (menentukan nomor Server).
- Isi kredensial per provider (disimpan aman di backend, tidak pernah dikirim ke browser).
- Mode sandbox/live per provider.
- Tombol "Test Koneksi" dan "Sinkron Channel" per provider.
- Tampilan URL webhook unik per provider untuk dipasang di dashboard provider.

### 4. Merchant
- Halaman Buat Transaksi: pilihan Server (hanya server yang diizinkan admin dan mendukung metode yang dipilih), plus opsi "Otomatis" yang memakai server default.
- Halaman API merchant: parameter opsional `server` pada API publik, didokumentasikan di halaman Documentation.
- Riwayat transaksi menampilkan server yang dipakai.

### 5. Fee
Fee dasar mengikuti channel milik masing-masing provider; markup platform tetap dikelola admin per channel. Fee QRIS berjenjang yang sudah ada tetap berlaku.

### 6. Data lama
Transaksi lama dibiarkan apa adanya tanpa penandaan server; penanda provider hanya berlaku untuk transaksi baru.

## Detail teknis

### Perubahan database
- `payment_providers` — kode provider, nama internal, label server, tipe adapter, base URL, mode (sandbox/live), aktif, urutan, config JSON (pemetaan field untuk tipe custom).
- `provider_credentials` — kredensial per provider, hanya dapat dibaca service role (tidak ada akses anon/authenticated).
- `provider_channels` — channel per provider (unik: provider_id + channel_code), menggantikan peran `fee_settings` sebagai sumber channel; `fee_settings` dipertahankan untuk markup platform.
- `merchant_provider_access` — server mana yang boleh dipakai tiap merchant + server default.
- `transactions` — tambah `provider_id`, `provider_reference`, `provider_payload`.

Semua tabel baru memakai RLS: merchant hanya membaca data server yang diizinkan, admin penuh, kredensial khusus service role.

### Perubahan edge function
- `_shared/providers/` berisi antarmuka adapter (`createPayment`, `listChannels`, `checkStatus`, `parseWebhook`) dengan implementasi `sanpay`, `tripay`, `duitku`, `midtrans`, `xendit`, `custom`.
- `user-create-payment`, `create-payment`, `check-transaction`, `get-channels` diubah memanggil adapter sesuai server terpilih, bukan Sanpay langsung.
- Webhook generik `provider-webhook/:providerCode` yang memvalidasi signature sesuai adapter; `sanpay-webhook` tetap ada agar URL lama tidak putus.
- Idempotensi webhook: satu referensi provider hanya boleh mengubah status sekali.

### Kredensial
Kredensial tiap provider diminta lewat form aman saat provider ditambahkan; tidak ada nilai yang ditulis di kode.

## Urutan pengerjaan
1. Migrasi database + RLS.
2. Lapisan adapter + refactor Sanpay ke adapter (fungsionalitas lama tetap jalan).
3. Adapter Tripay, Duitku, Midtrans, Xendit, Custom.
4. Webhook generik.
5. Panel admin Kelola Provider.
6. Pemilihan Server di sisi merchant + dokumentasi API.
