

# CinGateway - Comprehensive Professional Upgrade Plan

## Overview

This plan covers a massive upgrade to transform CinGateway into a full-featured professional payment gateway aggregator system with:
- Transaction check API & webhook endpoint
- Real-time transaction expiry monitoring
- Enhanced KYC system (admin exempt, merchants need full verification)
- Full WebSocket/realtime integration
- Simplified transaction creation (amount + expiry only)
- Professional TailAdmin-style dashboard with navbar, sidebar, footer
- Landing page for public visitors
- Live chat system (user to admin)
- Merchant QRIS feature (coming soon)
- Complete API documentation with test functionality

---

## 1. New Edge Functions

### 1.1 Check Transaction API (`check-transaction`)
Public endpoint for checking transaction status by reference number.

```text
GET /functions/v1/check-transaction?ref=REFERENCE_NO
Headers: X-API-Key (optional for authenticated details)
```

Response:
```json
{
  "status": "success",
  "data": {
    "partnerReferenceNo": "INV-001",
    "status": "pending|paid|expired",
    "amount": 50000,
    "payment_method": "qris",
    "expires_at": "2025-02-09T12:00:00Z",
    "paid_at": null
  }
}
```

### 1.2 Webhook Endpoint (`sanpay-webhook`)
Dedicated endpoint for sanpay.site callbacks with proper IP validation.

```text
POST /functions/v1/sanpay-webhook
Headers: X-Merchant-Code, X-Signature
IP Whitelist: 103.127.137.140
```

### 1.3 Auto-Expire Transactions (`expire-transactions`)
Cron job function to automatically expire pending transactions past their expiry time (WIB timezone).

---

## 2. Database Schema Updates

### 2.1 New Tables

**merchant_qris_requests** (Coming Soon feature):
```sql
CREATE TABLE merchant_qris_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  qris_nmid TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**chat_messages** (Live chat):
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**dashboard_widgets** (Admin configurable):
```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Update user_kyc Table
Add new required fields:
```sql
ALTER TABLE user_kyc ADD COLUMN business_name TEXT;
ALTER TABLE user_kyc ADD COLUMN business_type TEXT;
ALTER TABLE user_kyc ADD COLUMN business_address TEXT;
ALTER TABLE user_kyc ADD COLUMN owner_name TEXT;
ALTER TABLE user_kyc ADD COLUMN owner_nik TEXT;
ALTER TABLE user_kyc ADD COLUMN owner_address TEXT;
ALTER TABLE user_kyc ADD COLUMN ktp_photo_url TEXT;
ALTER TABLE user_kyc ADD COLUMN selfie_ktp_photo_url TEXT;
ALTER TABLE user_kyc ADD COLUMN business_photo_url TEXT;
ALTER TABLE user_kyc ADD COLUMN rejection_reason TEXT;
```

### 2.3 Enable Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

---

## 3. Landing Page (`/`)

Professional payment gateway landing page with:
- Hero section with animated gradient
- Features showcase (QRIS, VA, Retail)
- Pricing/fee information
- Integration steps
- Testimonials/trust badges
- CTA buttons (Login/Register)
- Footer with links and contact

---

## 4. Dashboard Layout Upgrade

### 4.1 Sidebar (Collapsible)
- User section: Dashboard, Create Transaction, History, API & Docs, Notifications, Profile, KYC
- Merchant section: QRIS Merchant (Coming Soon)
- Admin section: All Transactions, Users, Fees, Settings, Reports, Live Chat, Widgets

### 4.2 Top Navbar
- Breadcrumb navigation
- Search bar
- Notification bell (realtime updates)
- Live chat indicator (for admin)
- User avatar dropdown (Profile, Settings, Logout)
- Dark mode toggle

### 4.3 Footer
- Copyright info
- Version number
- Quick links
- Support contact

---

## 5. User Dashboard Enhancements

### 5.1 Overview Page
- Replace "Total Pendapatan" with "Saldo Anda" (transaction amount after fee deduction)
- Show realtime transaction status updates
- Admin-configurable info boxes/slides
- Quick action cards
- Recent transactions with payment links
- Balance display
- Notification preview

### 5.2 Create Transaction (Simplified)
- Payment method selector (QRIS/VA/Retail)
- Amount input only
- Expiry time selector (min 5 minutes)
- Channel selector (for VA/Retail)
- Optional customer info
- Direct "Go to Payment" button after creation

### 5.3 Transaction History
- Realtime status updates
- Payment link display for pending
- Filter by status, date, method
- Export functionality
- Click to view details

### 5.4 Notifications Page
- List all notifications
- Mark as read
- Realtime updates
- Filter by type

### 5.5 KYC Page
**For Users (Merchants):**
- Step-by-step form:
  1. Personal Data (Name, NIK, Address)
  2. Business Data (Name, Type, Address)
  3. Document Upload (KTP photo, Selfie holding KTP, Business/home photo)
- Status display (Pending/Approved/Rejected)
- Cannot edit after submission (must contact admin)
- Live chat button to contact admin

**Admin is exempt from KYC requirement**

### 5.6 Profile Page
- View profile info
- View balance and history
- View KYC status

---

## 6. Admin Dashboard Enhancements

### 6.1 User Management
- Enhanced KYC review panel with image preview
- Approve/Reject with reason
- Suspend/Unsuspend functionality
- Balance management
- Send notifications (text, image)
- View user transactions

### 6.2 Notifications Panel
- Send broadcast to all users
- Send to specific user
- Support text and image attachments
- View sent notifications

### 6.3 Live Chat
- View all active chats
- Reply to user messages
- Realtime updates
- Mark as resolved

### 6.4 Dashboard Widgets
- Add/edit info boxes for user dashboard
- Add/edit slide images
- Configure widget order

### 6.5 Merchant QRIS Requests
- View all QRIS merchant requests
- Approve/Reject applications
- Status management

---

## 7. API Settings Page Enhancement

### 7.1 Webhook Configuration
- Display callback URL for sanpay.site:
  `https://tlfnpkhwxmcajklkozor.supabase.co/functions/v1/sanpay-webhook`
- Display IP to whitelist: `103.127.137.140`
- Webhook URL input for merchant callbacks
- Test webhook button

### 7.2 API Tester
- Select endpoint (QRIS, VA, Retail, Check Transaction)
- Input parameters form
- Execute button
- Response display with formatting
- Copy curl command

### 7.3 Full Documentation
- Introduction & Authentication
- All endpoints with examples
- Code samples (cURL, PHP, Node.js, Python)
- Webhook handling guide
- Error codes reference
- Rate limits info

---

## 8. Checkout Page Enhancement

- Mobile-first responsive design
- Professional branded header
- QR code with download
- VA/Retail code with copy
- Countdown timer
- Payment instructions
- Realtime status updates
- Success/expired animations

---

## 9. Real-time Features

### 9.1 Transaction Status Updates
- Supabase Realtime subscription on transactions table
- Auto-update UI when status changes
- Toast notifications for status changes

### 9.2 Notification Bell
- Realtime notification count
- Dropdown list with recent notifications
- Mark as read on click

### 9.3 Live Chat
- Realtime message delivery
- Typing indicators
- Message read status
- Admin presence indicator

### 9.4 Auto-Expire Transactions
- Background check every minute
- Compare with WIB timezone (Asia/Jakarta)
- Update status to 'expired'
- Send notification to user

---

## 10. Technical Implementation

### 10.1 File Structure
```text
src/
  pages/
    Index.tsx (Landing page)
    dashboard/
      Overview.tsx (Enhanced)
      CreateTransaction.tsx (Simplified)
      Transactions.tsx (Enhanced)
      Notifications.tsx (New)
      Kyc.tsx (New)
      Profile.tsx (Enhanced)
      ApiSettings.tsx (Enhanced with tester)
      Documentation.tsx (Full docs)
      Chat.tsx (New - user side)
      MerchantQris.tsx (New - coming soon)
    admin/
      UserManagement.tsx (Enhanced)
      LiveChat.tsx (New)
      DashboardWidgets.tsx (New)
      MerchantQrisRequests.tsx (New)
  components/
    layout/
      DashboardLayout.tsx (Enhanced)
      LandingLayout.tsx (New)
      Navbar.tsx (New)
      Sidebar.tsx (New)
      Footer.tsx (New)
    dashboard/
      NotificationBell.tsx (New)
      ChatWidget.tsx (New)
      BalanceCard.tsx (New)
      InfoSlider.tsx (New)
    kyc/
      KycForm.tsx (New)
      KycStatus.tsx (New)
      KycReview.tsx (New)
    api/
      ApiTester.tsx (New)
    chat/
      ChatWindow.tsx (New)
      MessageBubble.tsx (New)

supabase/functions/
  check-transaction/ (New)
  sanpay-webhook/ (New)
  expire-transactions/ (New - cron)
```

### 10.2 Fee Calculation for User Balance
```typescript
// User balance = sum of (amount - admin_fee) for paid transactions
const userBalance = transactions
  .filter(t => t.status === 'paid')
  .reduce((sum, t) => sum + (t.amount - t.admin_fee), 0);
```

### 10.3 WIB Timezone Handling
```typescript
// Convert to WIB for expiry comparison
const wibOffset = 7 * 60 * 60 * 1000; // UTC+7
const nowWib = new Date(Date.now() + wibOffset);
```

---

## 11. Implementation Order

1. **Database Migrations**
   - Create new tables (chat_messages, dashboard_widgets, merchant_qris_requests)
   - Update user_kyc table with new fields
   - Enable realtime on required tables
   - Add RLS policies

2. **Edge Functions**
   - Create check-transaction endpoint
   - Create sanpay-webhook endpoint
   - Create expire-transactions cron job
   - Update config.toml

3. **Landing Page**
   - Create professional landing page
   - Add routing for `/`

4. **Dashboard Layout**
   - Enhance sidebar with collapsible groups
   - Add navbar with notification bell
   - Add footer component
   - Implement dark mode toggle

5. **User Dashboard Pages**
   - Enhance Overview with balance display
   - Simplify CreateTransaction
   - Add Notifications page
   - Create KYC submission page
   - Add Chat page

6. **Admin Dashboard Pages**
   - Enhance UserManagement with KYC review
   - Add LiveChat page
   - Add DashboardWidgets management
   - Add MerchantQrisRequests page

7. **API Settings Enhancement**
   - Add webhook URL display
   - Add IP whitelist display
   - Create API tester component
   - Complete documentation

8. **Real-time Integration**
   - Add Supabase Realtime subscriptions
   - Implement notification bell
   - Add live chat functionality
   - Auto-expire transaction monitoring

---

## 12. Security Considerations

- Admin users are exempt from KYC requirements (checked via user_roles table)
- KYC data locked after submission (only admin can modify)
- All file uploads go to Supabase Storage with proper RLS
- API endpoints validate authentication
- Webhook endpoint validates IP and signature
- Chat messages have proper RLS (sender/receiver only)

---

## 13. Responsive Design

All pages will be fully responsive:
- Mobile-first approach
- Collapsible sidebar on tablet/mobile
- Touch-friendly interactions
- Optimized checkout for mobile payments
- Bottom navigation option for mobile

---

## 14. Testing Checklist

- [ ] Landing page displays correctly on all devices
- [ ] User can create transaction with just amount and expiry
- [ ] Payment link works and shows realtime status
- [ ] Transactions auto-expire at correct WIB time
- [ ] User balance shows correct calculation
- [ ] KYC form submits with all required documents
- [ ] Admin can review KYC with image preview
- [ ] Live chat works in realtime
- [ ] Notification bell updates in realtime
- [ ] API tester works for all endpoints
- [ ] Webhook endpoint receives and processes callbacks
- [ ] Check transaction API returns correct data

