-- Environment enum
DO $$ BEGIN
  CREATE TYPE public.app_env AS ENUM ('sandbox', 'live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Transactions get a mode
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS mode public.app_env NOT NULL DEFAULT 'live';
CREATE INDEX IF NOT EXISTS idx_transactions_mode ON public.transactions (mode);
CREATE INDEX IF NOT EXISTS idx_transactions_user_mode ON public.transactions (user_id, mode);

-- API settings: separate sandbox key + active dashboard mode
ALTER TABLE public.user_api_settings
  ADD COLUMN IF NOT EXISTS sandbox_api_key text,
  ADD COLUMN IF NOT EXISTS active_mode public.app_env NOT NULL DEFAULT 'sandbox';

UPDATE public.user_api_settings
SET sandbox_api_key = 'sk_test_' || replace(gen_random_uuid()::text, '-', '')
WHERE sandbox_api_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_api_settings_sandbox_api_key_key
  ON public.user_api_settings (sandbox_api_key);

-- Balances split per mode
ALTER TABLE public.user_balance
  ADD COLUMN IF NOT EXISTS mode public.app_env NOT NULL DEFAULT 'live';
ALTER TABLE public.user_balance DROP CONSTRAINT IF EXISTS user_balance_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_balance_user_id_mode_key
  ON public.user_balance (user_id, mode);

ALTER TABLE public.balance_history
  ADD COLUMN IF NOT EXISTS mode public.app_env NOT NULL DEFAULT 'live';
CREATE INDEX IF NOT EXISTS idx_balance_history_user_mode
  ON public.balance_history (user_id, mode);

-- Balance adjuster becomes mode-aware
CREATE OR REPLACE FUNCTION public.adjust_user_balance(
  _user_id uuid,
  _amount bigint,
  _type text,
  _description text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL,
  _created_by uuid DEFAULT NULL,
  _mode public.app_env DEFAULT 'live'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_balance (user_id, balance, mode)
  VALUES (_user_id, CASE WHEN _type = 'credit' THEN _amount ELSE -_amount END, _mode)
  ON CONFLICT (user_id, mode) DO UPDATE
  SET balance = user_balance.balance + CASE WHEN _type = 'credit' THEN _amount ELSE -_amount END,
      updated_at = now();

  INSERT INTO public.balance_history (user_id, amount, type, description, reference_id, created_by, mode)
  VALUES (_user_id, _amount, _type, _description, _reference_id, _created_by, _mode);

  RETURN TRUE;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.adjust_user_balance(uuid, bigint, text, text, uuid, uuid, public.app_env) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_user_balance(uuid, bigint, text, text, uuid, uuid, public.app_env) TO service_role;

-- Old 6-arg signature is superseded
DROP FUNCTION IF EXISTS public.adjust_user_balance(uuid, bigint, text, text, uuid, uuid);

-- Auto-provision sandbox keys for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');

    INSERT INTO public.user_api_settings (user_id, api_key, sandbox_api_key, active_mode)
    VALUES (
      NEW.id,
      'sk_live_' || replace(gen_random_uuid()::text, '-', ''),
      'sk_test_' || replace(gen_random_uuid()::text, '-', ''),
      'sandbox'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;