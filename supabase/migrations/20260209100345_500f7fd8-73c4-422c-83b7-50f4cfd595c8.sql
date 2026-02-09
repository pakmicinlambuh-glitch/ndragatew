-- Create enums for new features
CREATE TYPE public.chat_message_type AS ENUM ('text', 'image', 'file');
CREATE TYPE public.widget_type AS ENUM ('info_box', 'slide', 'banner', 'announcement');
CREATE TYPE public.merchant_request_status AS ENUM ('pending', 'approved', 'rejected');

-- Create chat_messages table for live chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID,
  message TEXT NOT NULL,
  message_type public.chat_message_type DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create dashboard_widgets table for admin configurable widgets
CREATE TABLE public.dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.widget_type NOT NULL,
  title TEXT,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  target_role TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create merchant_qris_requests table
CREATE TABLE public.merchant_qris_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT,
  business_address TEXT,
  qris_nmid TEXT,
  status public.merchant_request_status DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to user_kyc for enhanced KYC
ALTER TABLE public.user_kyc 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS owner_nik TEXT,
ADD COLUMN IF NOT EXISTS owner_address TEXT,
ADD COLUMN IF NOT EXISTS ktp_photo_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_ktp_photo_url TEXT,
ADD COLUMN IF NOT EXISTS business_photo_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_qris_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_messages
CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR receiver_id IS NULL);

CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can view all messages"
ON public.chat_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage messages"
ON public.chat_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update read status"
ON public.chat_messages FOR UPDATE
USING (auth.uid() = receiver_id OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for dashboard_widgets
CREATE POLICY "Anyone can view active widgets"
ON public.dashboard_widgets FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage widgets"
ON public.dashboard_widgets FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for merchant_qris_requests
CREATE POLICY "Users can view own requests"
ON public.merchant_qris_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests"
ON public.merchant_qris_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
ON public.merchant_qris_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage requests"
ON public.merchant_qris_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger for new tables
CREATE TRIGGER update_dashboard_widgets_updated_at
BEFORE UPDATE ON public.dashboard_widgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_merchant_qris_requests_updated_at
BEFORE UPDATE ON public.merchant_qris_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime on notifications and chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;