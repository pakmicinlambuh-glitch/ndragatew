import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, RadioTower, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';

type Status = 'connecting' | 'subscribed' | 'error' | 'closed';

const statusMeta: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  connecting: { label: 'Menghubungkan', variant: 'secondary' },
  subscribed: { label: 'Terhubung', variant: 'default' },
  error: { label: 'Gagal', variant: 'destructive' },
  closed: { label: 'Terputus', variant: 'outline' },
};

export default function RealtimeStatusPanel({ userId }: { userId?: string }) {
  const [status, setStatus] = useState<Status>('connecting');
  const [eventCount, setEventCount] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    if (!userId) return;
    mounted.current = true;
    setStatus('connecting');

    const channel = supabase
      .channel(`realtime-debug-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          if (!mounted.current) return;
          setEventCount((c) => c + 1);
          setLastEventAt(new Date());
        }
      )
      .subscribe((state, err) => {
        if (!mounted.current) return;
        if (state === 'SUBSCRIBED') {
          setStatus('subscribed');
          setLastError(null);
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          setStatus('error');
          setLastError(err?.message ?? state);
        } else if (state === 'CLOSED') {
          setStatus('closed');
        }
      });

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const meta = statusMeta[status];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Status Realtime</CardTitle>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <CardDescription>Kanal transaksi (overview-transactions)</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Event diterima:</span>
          <span className="font-medium">{eventCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Terakhir:</span>
          <span className="font-medium">
            {lastEventAt ? format(lastEventAt, 'HH:mm:ss') : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Error:</span>
          <span className="font-medium">{lastError ?? 'Tidak ada'}</span>
        </div>
      </CardContent>
    </Card>
  );
}
