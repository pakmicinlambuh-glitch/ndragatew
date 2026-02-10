
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  withdrawal_type TEXT NOT NULL CHECK (withdrawal_type IN ('bank', 'ewallet')),
  bank_name TEXT,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal requests"
ON public.withdrawal_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests"
ON public.withdrawal_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all withdrawal requests"
ON public.withdrawal_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin delete notifications policy
CREATE POLICY "Admins can delete notifications"
ON public.notifications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for withdrawal_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
