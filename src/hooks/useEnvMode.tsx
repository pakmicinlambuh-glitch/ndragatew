import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type EnvMode = 'sandbox' | 'live';

interface EnvModeContextValue {
  mode: EnvMode;
  isSandbox: boolean;
  loading: boolean;
  setMode: (mode: EnvMode) => Promise<void>;
}

const EnvModeContext = createContext<EnvModeContextValue>({
  mode: 'live',
  isSandbox: false,
  loading: true,
  setMode: async () => {},
});

const STORAGE_KEY = 'cingateway.env-mode';

export function EnvModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [mode, setModeState] = useState<EnvMode>(
    (localStorage.getItem(STORAGE_KEY) as EnvMode) || 'live'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('user_api_settings')
        .select('active_mode')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!active) return;
      if (data?.active_mode) {
        setModeState(data.active_mode as EnvMode);
        localStorage.setItem(STORAGE_KEY, data.active_mode);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const setMode = useCallback(
    async (next: EnvMode) => {
      setModeState(next);
      localStorage.setItem(STORAGE_KEY, next);
      if (user) {
        await supabase
          .from('user_api_settings')
          .update({ active_mode: next })
          .eq('user_id', user.id);
      }
    },
    [user]
  );

  return (
    <EnvModeContext.Provider value={{ mode, isSandbox: mode === 'sandbox', loading, setMode }}>
      {children}
    </EnvModeContext.Provider>
  );
}

export const useEnvMode = () => useContext(EnvModeContext);
