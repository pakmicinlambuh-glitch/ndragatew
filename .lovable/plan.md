

# CinGateway - Comprehensive Fix & Upgrade Plan

## Overview

This plan addresses all requested fixes and upgrades across the entire application: balance system, checkout UI, notification system, API settings restructuring, withdrawal forms, admin dashboard stats, live chat upgrade, KYC review tools, webhook fix, and UI/UX improvements.

---

## 1. Fix sanpay-webhook Internal Server Error

**Problem**: The webhook crashes with `SyntaxError: Unexpected end of JSON input` when receiving requests with empty or non-JSON bodies (e.g. health checks, bots).

**Fix**: Add a try/catch around `req.json()` and validate content-type before parsing. Also handle GET/HEAD requests gracefully.

---

## 2. Balance System Overhaul (Admin & Merchant)

### 2.1 Database Changes
- Create `withdrawal_requests` table:
  - `id`, `user_id`, `amount`, `bank_name`, `account_number`, `account_holder`, `type` (bank/ewallet), `status` (pending/approved/rejected), `admin_notes`, `processed_by`, `processed_at`, `created_at`
- Add RLS policies for withdrawal requests

### 2.2 Admin Dashboard Overview
Complete rewrite with comprehensive stats:
- Total Saldo Semua User (sum of user_balance)
- Saldo Admin (fee collected minus base sanpay fee)
- Total User terdaftar
- Total Request KYC pending
- Total Request Penarikan pending
- Total Penarikan yang diproses
- Total Transaksi bulan ini
- Total Saldo bulan ini
- Total Transaksi sukses/gagal/expired
- Recent activity feed

### 2.3 Merchant Dashboard
- "Saldo Anda" reads from `user_balance` table (already exists)
- Add withdrawal form with bank & e-wallet options
- Show withdrawal history

### 2.4 Admin Balance Page (new route `/admin/balance`)
- View admin's own transaction balance
- View total fee collected (markup fee portion)
- Withdrawal request management (approve/reject with notes)

---

## 3. Checkout Page Upgrade

### 3.1 Remove "Pelanggan" / "Customer" section
- Remove the `customerName` display row from checkout
- Remove "Salin Data" button for QRIS

### 3.2 QRIS Image Click-to-Zoom
- Add a modal/dialog that shows the QR code full-screen when clicked
- Use Radix Dialog for the lightbox

### 3.3 Expired QRIS Shows Expired Image
- When status is expired, show a grayed-out overlay on the QR with "EXPIRED" text instead of the QR image

---

## 4. Notification System Upgrade

### 4.1 Admin Can Delete Notifications
- Add delete button per notification in admin view
- Add bulk delete option
- Add RLS policy for admin DELETE on notifications

### 4.2 Header Notification Bell Upgrade
- Replace simple navigate-to-page with a dropdown popover
- Show last 5 notifications in dropdown
- "Mark all as read" button in dropdown
- "View all" link to notifications page
- Real-time counter update
- Clear visual indicator (red dot) for unread

### 4.3 Accurate Notification System
- Ensure notification count respects both personal and broadcast
- Fix subscription to handle UPDATE events (mark as read) to update counter

---

## 5. User/Merchant API & Webhook Page Restructure

### 5.1 Remove "Konfigurasi Webhook Sanpay" for User Role
- This section is admin-only configuration, remove from user API page

### 5.2 User API Page Sections
Only show:
1. **API Key** - show/copy/regenerate
2. **Webhook Anda** - user's own webhook URL + secret
3. **Dokumentasi API** - complete with all endpoints including check status

### 5.3 Add Check Status API Documentation
Add documentation for:
```
GET /functions/v1/check-transaction?ref=REFERENCE_NO
Headers: X-API-Key: your-api-key
```
With response examples.

### 5.4 Merge "API Credentials" with "API & Webhook"
Combine into a single unified page with tabs or sections.

---

## 6. Admin API Settings (Pengaturan API) Restructure

### 6.1 Replace Callback URL Section
Replace the current editable callback URL with the Sanpay Webhook Configuration display:
- **Konfigurasi Webhook Sanpay** header
- Description: "Konfigurasi ini untuk menghubungkan ke website resmi sanpay.site"
- Callback URL (read-only): `https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/sanpay-webhook`
- Copy button
- Note: "Masukkan URL ini sebagai callback URL di dashboard sanpay.site"
- IP Whitelist: `103.127.137.140` with copy button
- Note: "Whitelist IP ini di firewall server Anda untuk menerima callback dari sanpay.site"

### 6.2 Keep API Credentials (API Key + Merchant Code)
### 6.3 Keep Channel Sync

---

## 7. KYC Review System (Admin) - Full Tools

### 7.1 Enhanced KYC Review Panel in UserManagement
- Photo preview with zoom/lightbox
- Per-field validation status (valid/invalid checkmarks)
- Admin can add comments per field (e.g., "Foto KTP buram, minta update")
- "Request Update" button that sends notification to user specifying which document needs re-upload
- Review data usaha section with approve/reject per section
- Detailed rejection reason with specific field mentions
- Overall approve/reject with comprehensive notes

---

## 8. Live Chat - Full Interactive Upgrade

### 8.1 User Chat Page
- Full-height chat interface
- Message timestamps
- "Typing..." indicator (visual only)
- Auto-scroll to bottom
- Enter key to send
- Online status indicator for admin

### 8.2 Admin Chat Page - Telegram-style
- Left sidebar: conversation list with search, unread badges, last message preview, timestamps
- Right panel: full chat window
- Responsive: on mobile, show list first, tap to open chat
- Mark as resolved button
- User info header (email, KYC status)
- Quick reply suggestions
- Message read receipts (double check)

---

## 9. Withdrawal System (New)

### 9.1 User Withdrawal Form (`/dashboard/withdraw`)
- Select type: Bank Transfer or E-Wallet
- Bank: bank name, account number, account holder name
- E-Wallet: provider (GoPay, OVO, DANA, etc.), phone number, account name
- Amount input (max = current balance)
- Show current balance
- Submit creates `withdrawal_requests` record with status "pending"

### 9.2 Admin Withdrawal Management (`/admin/withdrawals`)
- List all withdrawal requests with filters
- Approve/reject with admin notes
- On approve: deduct from user_balance via `adjust_user_balance` function
- Show user details (email, balance)

---

## 10. Admin QRIS Merchant Page

- Change from request management to listing all merchant QRIS data
- Show table: merchant email, business name, QRIS NMID, status, created date
- Admin does not need to request QRIS, only views list
- Filter/search functionality

---

## 11. Sidebar & Navigation Updates

### 11.1 Add New Menu Items
- User: Add "Penarikan Saldo" menu item
- Admin: Add "Saldo & Penarikan" menu item
- Admin: Rename QRIS Merchant to "Data QRIS Merchant"

### 11.2 Differentiate Admin vs User Menus
- Ensure admin menu and user menu are completely different feature sets
- Admin should not see "Buat Transaksi" in user menu (or if they do, it's for testing)

---

## 12. Create Transaction UI Upgrade

- Better card-based payment method selector with icons and descriptions
- Animated selection feedback
- Better fee breakdown visualization
- Success state with confetti-like animation
- Remove hardcoded "Customer" name from transaction insert

---

## 13. UI/UX Improvements

### 13.1 Remove Emoticons
- Replace all emoji usage (e.g., wave emoji in welcome header) with Lucide icons
- Use icon-based visual elements throughout

### 13.2 Landing Page Enhancement
- Add more content sections
- Better gradient animations
- Meta tags for SEO (title, description, og tags)
- Add visual assets/illustrations
- Professional footer with more links

### 13.3 Dashboard Styling
- More visual depth with shadows and gradients
- Better card hover effects
- Consistent color scheme across admin and user dashboards

---

## 14. Realtime Transaction Expiry

- Ensure transactions are updated to expired status regardless of whether checkout page is open
- The `expire-transactions` edge function handles this server-side
- Add realtime subscription on transactions table to auto-update UI
- On checkout: if expired, show expired overlay on QRIS image

---

## Technical Implementation Details

### Database Migration
```sql
-- Withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  withdrawal_type TEXT NOT NULL, -- 'bank' or 'ewallet'
  bank_name TEXT,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
-- Users view own, admins view all, admins manage all
```

### New Routes
- `/dashboard/withdraw` - User withdrawal form
- `/admin/withdrawals` - Admin withdrawal management  
- `/admin/balance` - Admin balance overview

### Files to Create
- `src/pages/dashboard/Withdraw.tsx`
- `src/pages/admin/Withdrawals.tsx`
- `src/pages/admin/AdminBalance.tsx`

### Files to Modify (Major)
- `supabase/functions/sanpay-webhook/index.ts` - Fix JSON parse error
- `src/pages/Checkout.tsx` - Remove customer/salin data, add QR zoom, expired overlay
- `src/pages/dashboard/Overview.tsx` - Admin stats overhaul, remove emoji
- `src/pages/dashboard/ApiSettings.tsx` - Remove Sanpay config, add check-status docs
- `src/pages/admin/ApiSettings.tsx` - Replace callback URL with Sanpay webhook display
- `src/pages/dashboard/Notifications.tsx` - Admin delete capability
- `src/components/layout/DashboardLayout.tsx` - Notification bell dropdown, new menu items
- `src/pages/admin/LiveChat.tsx` - Telegram-style upgrade
- `src/pages/dashboard/Chat.tsx` - Enhanced chat UI
- `src/pages/dashboard/Kyc.tsx` - Complete requirements display
- `src/pages/admin/UserManagement.tsx` - KYC review tools
- `src/pages/admin/MerchantQrisRequests.tsx` - Change to list view
- `src/pages/dashboard/CreateTransaction.tsx` - UI upgrade, remove hardcoded customer
- `src/pages/Index.tsx` - Enhanced landing page
- `src/App.tsx` - Add new routes

### Implementation Order
1. Database migration (withdrawal_requests table)
2. Fix sanpay-webhook edge function
3. Checkout page fixes (customer removal, QR zoom, expired state)
4. Balance system (admin stats, withdrawal form/management)
5. Notification system (admin delete, header bell dropdown)
6. API settings restructure (admin and user)
7. KYC review tools enhancement
8. Live chat upgrade
9. Create transaction UI upgrade
10. Landing page and overall UI polish
11. Route and navigation updates

