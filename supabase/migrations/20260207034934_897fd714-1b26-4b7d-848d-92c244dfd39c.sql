-- Create user_api_settings table for user API keys and webhook URLs
CREATE TABLE public.user_api_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    api_key text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    webhook_url text,
    webhook_secret text DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_api_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own api settings"
ON public.user_api_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own api settings"
ON public.user_api_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api settings"
ON public.user_api_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all api settings"
ON public.user_api_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Add payment_url column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_url text;

-- Create trigger for updated_at
CREATE TRIGGER update_user_api_settings_updated_at
BEFORE UPDATE ON public.user_api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default QRIS fee setting with percentage
INSERT INTO public.fee_settings (channel_code, channel_name, channel_type, base_fee_type, base_fee_value, markup_fee_type, markup_fee_value, is_active)
VALUES ('QRIS', 'QRIS', 'qris', 'percent', 0.7, 'percent', 0.5, true)
ON CONFLICT (channel_code) DO UPDATE SET
    base_fee_type = 'percent',
    base_fee_value = 0.7,
    markup_fee_type = 'percent',
    markup_fee_value = 0.5;