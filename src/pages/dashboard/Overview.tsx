import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEnvMode } from '@/hooks/useEnvMode';
import { supabase } from '@/integrations/supabase/client';
import StatsCard from '@/components/dashboard/StatsCard';
import RealtimeStatusPanel from '@/components/dashboard/RealtimeStatusPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Wallet,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle,
  Loader2,
  Bell,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Transaction {
  id: string;
  partner_reference_no: string;
  amount: number;
  total_amount: number;
  admin_fee: number;
  payment_method: string;
  channel_code: string;
  status: string;
  created_at: string;
  customer_name: string;
}

interface Widget {
  id: string;
  type: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
}

interface Stats {
  totalTransactions: number;
  userBalance: number;
  pendingTransactions: number;
  successRate: number;
}

export default function Overview() {
  const { user, isAdmin } = useAuth();
  const { mode } = useEnvMode();
  const [stats, setStats] = useState<Stats>({
    totalTransactions: 0,
    userBalance: 0,
    pendingTransactions: 0,
    successRate: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchData();

    const channel = supabase
      .channel(`overview-transactions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);


  const fetchData = async () => {
    try {
      // Fetch stats
      let query = supabase.from('transactions').select('*').eq('mode', mode);
      
      if (!isAdmin) {
        query = query.eq('user_id', user?.id);
      }

      const { data: transactions, error } = await query;


      if (error) throw error;

      const total = transactions?.length || 0;
      const paid = transactions?.filter(t => t.status === 'paid') || [];
      const pending = transactions?.filter(t => t.status === 'pending') || [];
      
      // User balance = sum of (amount - admin_fee) for paid transactions
      const userBalance = isAdmin
        ? paid.reduce((sum, t) => sum + (t.admin_fee || 0), 0) // Admin sees total fees
        : paid.reduce((sum, t) => sum + (t.amount - (t.admin_fee || 0)), 0); // User sees net balance

      setStats({
        totalTransactions: total,
        userBalance: userBalance,
        pendingTransactions: pending.length,
        successRate: total > 0 ? Math.round((paid.length / total) * 100) : 0,
      });

      // Fetch recent transactions
      let recentQuery = supabase
        .from('transactions')
        .select('*')
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(5);


      if (!isAdmin) {
        recentQuery = recentQuery.eq('user_id', user?.id);
      }

      const { data: recent, error: recentError } = await recentQuery;

      if (recentError) throw recentError;
      setRecentTransactions(recent || []);

      // Fetch widgets
      const { data: widgetsData } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      setWidgets(widgetsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success hover:bg-success/20">Sukses</Badge>;
      case 'pending':
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-muted text-muted-foreground">Expired</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'qris':
        return 'QRIS';
      case 'va':
        return 'Virtual Account';
      case 'retail':
        return 'Retail';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-accent p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold">
          Selamat Datang, {user?.email?.split('@')[0]}! 👋
        </h1>
        <p className="mt-1 text-primary-foreground/80">
          {isAdmin
            ? 'Kelola semua transaksi dan pengguna dari dashboard ini.'
            : 'Buat dan kelola transaksi pembayaran Anda.'}
        </p>
      </div>

      <RealtimeStatusPanel userId={user?.id} />

      {/* Widgets */}

      {widgets.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.slice(0, 3).map((widget) => (
            <Card key={widget.id} className="overflow-hidden">
              {widget.image_url && (
                <div className="h-32 overflow-hidden">
                  <img
                    src={widget.image_url}
                    alt={widget.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-semibold">{widget.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{widget.content}</p>
                {widget.link_url && (
                  <a href={widget.link_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="link" className="mt-2 h-auto p-0">
                      Selengkapnya <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Transaksi"
          value={stats.totalTransactions}
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatsCard
          title={isAdmin ? "Total Fee" : "Saldo Anda"}
          value={formatCurrency(stats.userBalance)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatsCard
          title="Transaksi Pending"
          value={stats.pendingTransactions}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatsCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Buat Transaksi Baru</h3>
                <p className="text-sm text-muted-foreground">
                  Generate QRIS, VA, atau Retail
                </p>
              </div>
              <Link to="/dashboard/create">
                <Button size="icon" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent/10 p-3 text-accent">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Riwayat Transaksi</h3>
                <p className="text-sm text-muted-foreground">
                  Lihat semua transaksi Anda
                </p>
              </div>
              <Link to="/dashboard/transactions">
                <Button size="icon" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-success/10 p-3 text-success">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Notifikasi</h3>
                <p className="text-sm text-muted-foreground">
                  Lihat notifikasi terbaru
                </p>
              </div>
              <Link to="/dashboard/notifications">
                <Button size="icon" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>5 transaksi terakhir Anda</CardDescription>
          </div>
          <Link to="/dashboard/transactions">
            <Button variant="outline" size="sm">
              Lihat Semua
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CreditCard className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">Belum ada transaksi</p>
              <Link to="/dashboard/create">
                <Button className="mt-4">Buat Transaksi Pertama</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referensi</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Nominal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {tx.partner_reference_no}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {getPaymentMethodLabel(tx.payment_method)}
                          </p>
                          {tx.channel_code && (
                            <p className="text-xs text-muted-foreground">
                              {tx.channel_code}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(tx.total_amount)}</TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', {
                          locale: localeId,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
