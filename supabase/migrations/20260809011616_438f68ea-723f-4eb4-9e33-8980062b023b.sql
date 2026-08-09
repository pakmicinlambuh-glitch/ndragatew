
-- 1. Payment provider config exposure: only admins may read the table
DROP POLICY IF EXISTS "Authenticated view active providers" ON public.payment_providers;

CREATE POLICY "Admins view providers"
ON public.payment_providers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Realtime broadcast/presence: scope topics to the user's own channels
DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;

CREATE POLICY "Users receive only their own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user:' || auth.uid()::text
  OR realtime.topic() LIKE 'user:' || auth.uid()::text || ':%'
);

-- 3. Lock down SECURITY DEFINER functions exposed through the API
REVOKE ALL ON FUNCTION public.adjust_user_balance(uuid, bigint, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_suspended(uuid) FROM PUBLIC, anon;

-- Keep the checks used by RLS policies callable by signed-in users and the backend
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_suspended(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_user_balance(uuid, bigint, text, text, uuid, uuid) TO service_role;
