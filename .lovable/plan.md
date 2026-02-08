
# CinGateway - Major Enhancement Plan

## Overview
This plan addresses comprehensive updates including security fixes, UI modernization (TailAdmin-style), payment link improvements, tiered QRIS fees, advanced user management, and production-ready security.

---

## 1. Security Fixes (Critical)

### 1.1 RLS Policy Updates

**Transactions Table:**
- Remove any overly permissive policies
- Ensure transactions are only viewable by the owner (`user_id = auth.uid()`) or admins
- Add public access for checkout page via `partner_reference_no` lookup only

**Fee Settings Table:**
- Keep public read for checkout page (needed to calculate fees)
- Restrict sensitive business data to admins only by creating a separate view

**Checkout Page Public Access:**
- Create an edge function `get-transaction-by-ref` that allows unauthenticated access to transaction data by reference number only
- This ensures checkout page works without login while keeping RLS secure

### 1.2 Enable Leaked Password Protection
- Configure auth settings to enable leaked password protection via Supabase dashboard

### 1.3 API Signature Security (SNAP BI Standard)
- Implement proper HMAC-SHA256 signature validation
- Add timestamp validation to prevent replay attacks
- Add nonce support for idempotency

---

## 2. Database Schema Updates

### 2.1 New Tables

**user_balance:**
```sql
CREATE TABLE user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**user_kyc:**
```sql
CREATE TABLE user_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  id_type TEXT,
  id_number TEXT,
  id_photo_url TEXT,
  selfie_url TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  notes TEXT
);
```

**notifications:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id), -- NULL for broadcast
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- info, warning, success, error
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Profile Table Updates
- Add `suspended_at TIMESTAMPTZ`
- Add `suspended_reason TEXT`

### 2.3 Fee Settings Updates
- Add `threshold_amount INTEGER` for tiered fees
- Add `fee_below_threshold NUMERIC`
- Add `fee_above_threshold NUMERIC`

---

## 3. UI Modernization (TailAdmin Style)

### 3.1 Dashboard Layout Updates
- Sidebar with collapsible sections
- Dark/light mode toggle
- Breadcrumb navigation
- Better mobile responsiveness
- Card-based layout with shadows and gradients

### 3.2 New Dashboard Components
- **ChartCard** - For analytics with Recharts
- **DataTable** - Enhanced table with pagination, sorting, filtering
- **StatCard** - Modern stats cards with trends
- **NotificationDropdown** - Bell icon with notification list
- **UserAvatar** - With status indicator

### 3.3 Color Scheme
- Primary: Teal/Blue gradient
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Card backgrounds with subtle gradients

---

## 4. Checkout Page Fixes

### 4.1 Public Access Without Auth
- Create `get-transaction-by-ref` edge function for public lookup
- Remove Supabase client dependency for checkout
- Handle "invalid ref id" message when no ref provided

### 4.2 UI Improvements
- Better QR code display with download option
- Copy button for VA number and payment code
- Real-time countdown timer
- Status indicators with animations
- Mobile-optimized layout

### 4.3 Invalid Reference Handling
- Show clear error page when ref is missing or invalid
- Provide contact information for support

---

## 5. Transaction Improvements

### 5.1 Create Transaction Page
- Add "Go to Payment" button after creation
- Show payment link with copy button
- Add redirect to payment link option

### 5.2 Transaction History
- Show payment link for pending transactions
- Click to open in new tab
- Add "Copy Link" and "Open Link" actions
- Filter by date range
- Export to CSV/Excel

---

## 6. QRIS Fee Configuration

### 6.1 Tiered Fee Structure
- Fee below threshold (e.g., < 500,000): Configurable (default 0%)
- Fee above threshold (e.g., >= 500,000): Configurable (default 0.5%)

### 6.2 Fee Settings UI
- Add threshold amount input
- Separate fee inputs for below/above threshold
- Preview calculator

### 6.3 Fee Calculation Logic
- Update `calculateFee` function in all relevant files
- Update edge functions to use tiered fees

---

## 7. API & Response Alignment

### 7.1 Fix API Key Validation
- Check `user_api_settings` table properly
- Add proper error messages
- Log validation attempts

### 7.2 Response Format (sanpay.site compatible)

**QRIS Response:**
```json
{
  "status": "success",
  "partnerReferenceNo": "INV-123",
  "merchantName": "Merchant Name",
  "amount": 50000,
  "qrContent": "00020101...",
  "expiresAt": "2025-01-01 12:00:00"
}
```

**VA Response:**
```json
{
  "status": "success",
  "partnerReferenceNo": "INV-123",
  "amount": 50000,
  "bank_code": "BCA",
  "va_number": "1234567890",
  "expiration_date": "2025-01-01T12:00:00+07:00"
}
```

**Retail Response:**
```json
{
  "status": "success",
  "partnerReferenceNo": "INV-123",
  "amount": 50000,
  "retail_outlet": "ALFAMART",
  "payment_code": "888812345678",
  "expiration_date": "2025-01-01T12:00:00+07:00"
}
```

---

## 8. User Management Enhancements

### 8.1 KYC System
- KYC submission form for users
- Admin review panel with approve/reject
- Status badges (Pending, Approved, Rejected)

### 8.2 Suspend/Unsuspend
- One-click suspend with reason input
- Suspended users cannot login
- Show suspension notice on login attempt

### 8.3 Notifications
- Broadcast to all users
- Targeted notification to specific user
- Notification center in header
- Mark as read functionality

### 8.4 User Balance
- View balance on profile
- Admin can add/deduct balance
- Balance history/transactions

---

## 9. API Documentation

### 9.1 User-Facing Documentation Page
- Markdown-rendered docs
- Code examples in multiple languages (cURL, PHP, Node.js, Python)
- Interactive API tester
- Error code reference

### 9.2 Documentation Sections
- Authentication (API Key usage)
- Create Payment (QRIS, VA, Retail)
- Webhook handling
- Error codes
- Rate limits

---

## 10. Edge Functions Updates

### 10.1 `user-create-payment` Updates
- Fix API key validation (query `user_api_settings` correctly)
- Add proper HMAC signature generation
- Return sanpay-compatible responses

### 10.2 `get-transaction-by-ref` (New)
- Public endpoint for checkout page
- No auth required
- Returns transaction details by reference number

### 10.3 `payment-callback` Updates
- Improve webhook forwarding
- Add retry logic for failed webhook deliveries
- Log all callback attempts

---

## 11. File Changes Summary

### New Files
- `src/pages/dashboard/Documentation.tsx` - API documentation page
- `src/pages/admin/Notifications.tsx` - Send notifications
- `src/pages/admin/KycManagement.tsx` - KYC review
- `src/components/dashboard/ChartCard.tsx` - Analytics charts
- `src/components/dashboard/NotificationBell.tsx` - Notification dropdown
- `src/components/ui/data-table.tsx` - Enhanced data table
- `supabase/functions/get-transaction-by-ref/index.ts` - Public transaction lookup

### Modified Files
- `src/index.css` - TailAdmin-style CSS variables
- `src/pages/Checkout.tsx` - Fix public access, invalid ref handling
- `src/pages/dashboard/Transactions.tsx` - Add payment link display
- `src/pages/dashboard/CreateTransaction.tsx` - Add redirect button
- `src/pages/admin/FeeSettings.tsx` - Tiered fee UI
- `src/pages/admin/UserManagement.tsx` - KYC, suspend, balance, notifications
- `src/components/layout/DashboardLayout.tsx` - TailAdmin-style layout
- `supabase/functions/user-create-payment/index.ts` - Fix validation, response format
- `supabase/functions/payment-callback/index.ts` - Improve webhook handling

### Database Migrations
- Add `user_balance` table
- Add `user_kyc` table
- Add `notifications` table
- Update `profiles` with suspension fields
- Update `fee_settings` with tiered fee fields
- Update RLS policies for security

---

## 12. Technical Implementation Details

### Fee Calculation Formula
```typescript
function calculateQrisFee(amount: number, settings: FeeSettings): number {
  const threshold = settings.threshold_amount || 500000;
  let baseFee = 0;
  
  if (amount < threshold) {
    baseFee = settings.fee_below_threshold || 0;
  } else {
    baseFee = (amount * (settings.fee_above_threshold || 0.5)) / 100;
  }
  
  // Add markup
  let markupFee = 0;
  if (settings.markup_fee_type === 'fixed') {
    markupFee = settings.markup_fee_value;
  } else {
    markupFee = (amount * settings.markup_fee_value) / 100;
  }
  
  return Math.ceil(baseFee + markupFee);
}
```

### API Signature Validation
```typescript
async function validateSignature(
  payload: string, 
  signature: string, 
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const calculatedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return calculatedSignature === signature;
}
```

---

## 13. Implementation Order

1. **Database migrations** - Create new tables and update existing ones
2. **RLS policy fixes** - Secure transactions and fee_settings
3. **Edge function updates** - Fix API key validation, add public transaction lookup
4. **Checkout page fixes** - Public access, invalid ref handling
5. **Transaction improvements** - Payment link display and redirect
6. **Fee settings UI** - Tiered fee configuration
7. **User management features** - KYC, suspend, balance, notifications
8. **UI modernization** - TailAdmin-style dashboard
9. **API documentation** - User-friendly docs page
10. **Testing** - End-to-end testing of all flows

---

## 14. Testing Checklist

- [ ] Checkout page accessible without login
- [ ] Invalid ref shows error message
- [ ] Payment link displayed after transaction creation
- [ ] Payment link clickable in transaction history
- [ ] QRIS fee correctly calculated for amounts below/above 500k
- [ ] API key validation works correctly
- [ ] Webhook forwarding works
- [ ] User suspension prevents login
- [ ] Notifications sent and received
- [ ] KYC submission and review flow works
