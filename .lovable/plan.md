
# Implementation: Routes, Sidebar, Notification Bell & Live Chat Upgrade

## 1. Add Missing Routes to App.tsx

Add three missing routes that were created but never registered:
- `/dashboard/withdraw` -- Withdraw component
- `/admin/withdrawals` -- Withdrawals component  
- `/admin/balance` -- AdminBalance component

## 2. Update Sidebar Navigation (DashboardLayout.tsx)

### User Menu Updates
- Add "Penarikan Saldo" menu item pointing to `/dashboard/withdraw` with a Wallet icon

### Admin Menu Updates
- Add "Saldo Admin" pointing to `/admin/balance` with a DollarSign icon
- Add "Penarikan" pointing to `/admin/withdrawals` with an ArrowDownCircle icon
- Rename "QRIS Merchant" to "Data QRIS Merchant"

### Also subscribe to UPDATE events on notifications (for accurate unread count when messages are marked read)

## 3. Notification Bell Popover (DashboardLayout.tsx)

Replace the current "navigate to notifications page" bell button with a Popover dropdown:
- Shows last 5 unread notifications in a dropdown panel
- Each notification shows title, message preview, and timestamp
- "Tandai Semua Dibaca" (Mark All Read) button
- "Lihat Semua" link to `/dashboard/notifications`
- Red dot indicator when unread count > 0
- Realtime updates via existing subscription

Uses the already-imported Popover component from `@/components/ui/popover`.

## 4. Live Chat Upgrade

### User Chat (src/pages/dashboard/Chat.tsx)
- Full-height responsive chat interface (calc 100vh minus header)
- Improved message bubbles with better styling and rounded corners
- Online status indicator for admin (visual)
- Enter key to send (already works via form submit)
- Empty state with a welcoming message and icon

### Admin Live Chat (src/pages/admin/LiveChat.tsx) - Telegram-style
- Left sidebar: conversation list with search input, unread badges, last message preview, relative timestamps
- Right panel: full chat window with user info header
- Mobile responsive: on small screens show list first, clicking opens chat with back button
- Mark as resolved button per conversation
- Message read receipts (double check for read, single check for sent)
- Quick reply suggestions (predefined buttons like "Terima kasih", "Mohon tunggu", etc.)
- Realtime message sync (already using postgres_changes)
- Search/filter conversations by email

## Technical Details

### Files Modified
- `src/App.tsx` -- Add 3 new route definitions
- `src/components/layout/DashboardLayout.tsx` -- Add sidebar items, notification popover, import Popover
- `src/pages/dashboard/Chat.tsx` -- Full rewrite with improved UI
- `src/pages/admin/LiveChat.tsx` -- Full rewrite with Telegram-style interface

### New Imports Needed
- `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover` in DashboardLayout
- `ArrowDownCircle, Wallet` icons (already imported in DashboardLayout)
- `Search, ArrowLeft, CheckCheck, Check` icons for LiveChat

### No Database Changes Required
All tables (chat_messages, notifications, withdrawal_requests) already exist with proper RLS policies.
