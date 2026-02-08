-- =====================================================
-- CinGateway Major Database Enhancement Migration
-- =====================================================

-- 1. Create notification_type enum
CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'success', 'error');

-- 2. Create kyc_status enum
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. Create user_balance table
CREATE TABLE public.user_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create balance_history table for audit trail
CREATE TABLE public.balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  description TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create user_kyc table
CREATE TABLE public.user_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status public.kyc_status DEFAULT 'pending',
  id_type TEXT,
  id_number TEXT,
  id_photo_url TEXT,
  selfie_url TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  is_broadcast BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Update profiles table with suspension fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- 8. Update fee_settings table with tiered fee fields
ALTER TABLE public.fee_settings
ADD COLUMN IF NOT EXISTS threshold_amount INTEGER DEFAULT 500000,
ADD COLUMN IF NOT EXISTS fee_below_threshold NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_above_threshold NUMERIC DEFAULT 0.5;

-- 9. Enable RLS on all new tables
ALTER TABLE public.user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- User Balance policies
CREATE POLICY "Users can view own balance"
ON public.user_balance FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances"
ON public.user_balance FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage balances"
ON public.user_balance FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Balance History policies
CREATE POLICY "Users can view own balance history"
ON public.balance_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balance history"
ON public.balance_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage balance history"
ON public.balance_history FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- User KYC policies
CREATE POLICY "Users can view own kyc"
ON public.user_kyc FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit own kyc"
ON public.user_kyc FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending kyc"
ON public.user_kyc FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all kyc"
ON public.user_kyc FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all kyc"
ON public.user_kyc FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR is_broadcast = true);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id OR is_broadcast = true);

CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- FIX EXISTING RLS POLICIES
-- =====================================================

-- Drop overly permissive fee_settings policy
DROP POLICY IF EXISTS "Anyone authenticated can view fee settings" ON public.fee_settings;

-- Create new restricted policy - fee settings viewable by authenticated users for checkout calculation
-- But sensitive markup data only for admins (handled in application logic)
CREATE POLICY "Authenticated users can view active fee settings"
ON public.fee_settings FOR SELECT
TO authenticated
USING (is_active = true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for user_balance
CREATE TRIGGER update_user_balance_updated_at
BEFORE UPDATE ON public.user_balance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for user_kyc
CREATE TRIGGER update_user_kyc_updated_at
BEFORE UPDATE ON public.user_kyc
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to adjust user balance
CREATE OR REPLACE FUNCTION public.adjust_user_balance(
  _user_id UUID,
  _amount BIGINT,
  _type TEXT,
  _description TEXT DEFAULT NULL,
  _reference_id UUID DEFAULT NULL,
  _created_by UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update balance
  INSERT INTO public.user_balance (user_id, balance)
  VALUES (_user_id, CASE WHEN _type = 'credit' THEN _amount ELSE -_amount END)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = user_balance.balance + CASE WHEN _type = 'credit' THEN _amount ELSE -_amount END,
      updated_at = now();
  
  -- Record history
  INSERT INTO public.balance_history (user_id, amount, type, description, reference_id, created_by)
  VALUES (_user_id, _amount, _type, _description, _reference_id, _created_by);
  
  RETURN TRUE;
END;
$$;

-- Function to check if user is suspended
CREATE OR REPLACE FUNCTION public.is_user_suspended(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND suspended_at IS NOT NULL
  )
$$;