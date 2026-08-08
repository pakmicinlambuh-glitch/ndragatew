
CREATE TYPE public.provider_mode AS ENUM ('sandbox', 'live');

CREATE TABLE public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  adapter_type text NOT NULL DEFAULT 'custom',
  server_label text,
  base_url text,
  mode provider_mode NOT NULL DEFAULT 'sandbox',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  supports_qris boolean NOT NULL DEFAULT true,
  supports_va boolean NOT NULL DEFAULT true,
  supports_retail boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_providers TO authenticated;
GRANT ALL ON public.payment_providers TO service_role;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage providers" ON public.payment_providers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view active providers" ON public.payment_providers FOR SELECT TO authenticated
  USING (is_active = true);
CREATE TRIGGER update_payment_providers_updated_at BEFORE UPDATE ON public.payment_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES public.payment_providers(id) ON DELETE CASCADE,
  api_key text,
  merchant_code text,
  private_key text,
  client_id text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.provider_credentials TO service_role;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_provider_credentials_updated_at BEFORE UPDATE ON public.provider_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.provider_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.payment_providers(id) ON DELETE CASCADE,
  channel_code text NOT NULL,
  channel_name text NOT NULL,
  channel_type text NOT NULL,
  base_fee_type fee_type NOT NULL DEFAULT 'fixed',
  base_fee_value numeric NOT NULL DEFAULT 0,
  min_amount integer NOT NULL DEFAULT 10000,
  max_amount integer NOT NULL DEFAULT 50000000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, channel_code)
);
GRANT SELECT ON public.provider_channels TO authenticated;
GRANT ALL ON public.provider_channels TO service_role;
ALTER TABLE public.provider_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider channels" ON public.provider_channels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated view active provider channels" ON public.provider_channels FOR SELECT TO authenticated
  USING (is_active = true);
CREATE TRIGGER update_provider_channels_updated_at BEFORE UPDATE ON public.provider_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.merchant_provider_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES public.payment_providers(id) ON DELETE CASCADE,
  is_allowed boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);
GRANT SELECT ON public.merchant_provider_access TO authenticated;
GRANT ALL ON public.merchant_provider_access TO service_role;
ALTER TABLE public.merchant_provider_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage merchant provider access" ON public.merchant_provider_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users view own provider access" ON public.merchant_provider_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE TRIGGER update_merchant_provider_access_updated_at BEFORE UPDATE ON public.merchant_provider_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transactions
  ADD COLUMN provider_id uuid REFERENCES public.payment_providers(id) ON DELETE SET NULL,
  ADD COLUMN provider_reference text,
  ADD COLUMN provider_payload jsonb;

CREATE INDEX idx_transactions_provider_reference ON public.transactions (provider_reference);
