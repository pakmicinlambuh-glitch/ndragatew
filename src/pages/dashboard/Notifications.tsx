import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCircle, AlertTriangle, Info, XCircle, Check, Loader2, BellOff, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  is_broadcast: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (user) { fetchNotifications(); subscribeToNotifications(); }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (!isAdmin) { query = query.or(`user_id.eq.${user?.id},is_broadcast.eq.true`); }
      const { data, error } = await query;
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const subscribeToNotifications = () => {
    const channel = supabase.channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const n = payload.new as Notification & { user_id?: string };
        if (isAdmin || n.user_id === user?.id || n.is_broadcast) setNotifications(prev => [n, ...prev]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast({ title: 'Dihapus' });
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
  };

  const deleteAllRead = async () => {
    const readIds = notifications.filter(n => n.is_read).map(n => n.id);
    if (readIds.length === 0) return;
    try {
      const { error } = await supabase.from('notifications').delete().in('id', readIds);
      if (error) throw error;
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast({ title: 'Dihapus', description: `${readIds.length} notifikasi dihapus` });
    } catch (error: any) { toast({ title: 'Gagal', description: error.message, variant: 'destructive' }); }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'error': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi</h1>
          <p className="text-muted-foreground">Kelola semua notifikasi</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && <Button variant="outline" onClick={markAllAsRead}><Check className="mr-2 h-4 w-4" />Tandai Semua Dibaca</Button>}
          {isAdmin && <Button variant="outline" onClick={deleteAllRead} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Hapus Sudah Dibaca</Button>}
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2"><Bell className="h-4 w-4" />Semua<Badge variant="secondary" className="ml-1">{notifications.length}</Badge></TabsTrigger>
          <TabsTrigger value="unread" className="gap-2"><BellOff className="h-4 w-4" />Belum Dibaca{unreadCount > 0 && <Badge className="ml-1 bg-primary">{unreadCount}</Badge>}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <NotificationsList notifications={filteredNotifications} onMarkAsRead={markAsRead} onDelete={isAdmin ? deleteNotification : undefined} getTypeIcon={getTypeIcon} />
        </TabsContent>
        <TabsContent value="unread" className="mt-6">
          <NotificationsList notifications={filteredNotifications} onMarkAsRead={markAsRead} onDelete={isAdmin ? deleteNotification : undefined} getTypeIcon={getTypeIcon} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationsList({ notifications, onMarkAsRead, onDelete, getTypeIcon }: {
  notifications: any[]; onMarkAsRead: (id: string) => void; onDelete?: (id: string) => void; getTypeIcon: (type: string) => React.ReactNode;
}) {
  if (notifications.length === 0) {
    return <Card><CardContent className="py-12 text-center"><Bell className="mx-auto h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-muted-foreground">Tidak ada notifikasi</p></CardContent></Card>;
  }
  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-3">
        {notifications.map(n => (
          <Card key={n.id} className={`transition-colors ${!n.is_read ? 'border-primary/50 bg-primary/5' : ''}`}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">{getTypeIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{n.title}</h4>
                      {n.is_broadcast && <Badge variant="outline">Broadcast</Badge>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.is_read && <Button size="sm" variant="ghost" onClick={() => onMarkAsRead(n.id)}><Check className="h-4 w-4" /></Button>}
                      {onDelete && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(n.id)}><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{format(new Date(n.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
