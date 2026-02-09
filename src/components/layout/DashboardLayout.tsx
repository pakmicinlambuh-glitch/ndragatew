import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  CreditCard,
  LayoutDashboard,
  Receipt,
  Users,
  Settings,
  FileText,
  PlusCircle,
  History,
  User,
  LogOut,
  Menu,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Shield,
  Code,
  Bell,
  MessageCircle,
  QrCode,
  BookOpen,
  LayoutGrid,
  Moon,
  Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(true);
  const [adminMenuOpen, setAdminMenuOpen] = useState(true);
  const [merchantMenuOpen, setMerchantMenuOpen] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchNotificationCount();
    if (isAdmin) {
      fetchUnreadChats();
    }
    subscribeToNotifications();
  }, [user, isAdmin]);

  const fetchNotificationCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},is_broadcast.eq.true`)
      .eq('is_read', false);
    setUnreadNotifications(count || 0);
  };

  const fetchUnreadChats = async () => {
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .is('receiver_id', null)
      .eq('is_read', false);
    setUnreadChats(count || 0);
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('layout-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchNotificationCount()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        () => { if (isAdmin) fetchUnreadChats(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const userNavItems: NavItem[] = [
    { title: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { title: 'Buat Transaksi', href: '/dashboard/create', icon: <PlusCircle className="h-5 w-5" /> },
    { title: 'Riwayat Transaksi', href: '/dashboard/transactions', icon: <History className="h-5 w-5" /> },
    { title: 'Notifikasi', href: '/dashboard/notifications', icon: <Bell className="h-5 w-5" />, badge: unreadNotifications },
    { title: 'API & Webhook', href: '/dashboard/api', icon: <Code className="h-5 w-5" /> },
    { title: 'Dokumentasi', href: '/dashboard/docs', icon: <BookOpen className="h-5 w-5" /> },
    { title: 'Verifikasi KYC', href: '/dashboard/kyc', icon: <Shield className="h-5 w-5" /> },
    { title: 'Live Chat', href: '/dashboard/chat', icon: <MessageCircle className="h-5 w-5" /> },
    { title: 'Profil', href: '/dashboard/profile', icon: <User className="h-5 w-5" /> },
  ];

  const merchantNavItems: NavItem[] = [
    { title: 'QRIS Merchant', href: '/dashboard/merchant-qris', icon: <QrCode className="h-5 w-5" /> },
  ];

  const adminNavItems: NavItem[] = [
    { title: 'Semua Transaksi', href: '/admin/transactions', icon: <Receipt className="h-5 w-5" /> },
    { title: 'Manajemen User', href: '/admin/users', icon: <Users className="h-5 w-5" /> },
    { title: 'Pengaturan Fee', href: '/admin/fees', icon: <DollarSign className="h-5 w-5" /> },
    { title: 'Pengaturan API', href: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
    { title: 'Laporan', href: '/admin/reports', icon: <FileText className="h-5 w-5" /> },
    { title: 'Live Chat', href: '/admin/chat', icon: <MessageCircle className="h-5 w-5" />, badge: unreadChats },
    { title: 'Dashboard Widgets', href: '/admin/widgets', icon: <LayoutGrid className="h-5 w-5" /> },
    { title: 'QRIS Merchant', href: '/admin/merchant-qris', icon: <QrCode className="h-5 w-5" /> },
  ];

  const NavContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent p-2 text-primary-foreground">
          <CreditCard className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold">CinGateway</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {/* User Menu */}
          <Collapsible open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
              <span>Menu Utama</span>
              {userMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1">
              {userNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  {item.title}
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge className="ml-auto bg-destructive text-destructive-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Merchant Menu */}
          <Collapsible open={merchantMenuOpen} onOpenChange={setMerchantMenuOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
              <span>Merchant</span>
              {merchantMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-1">
              {merchantNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  {item.title}
                  <Badge className="ml-auto bg-warning/10 text-warning text-xs">Soon</Badge>
                </Link>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Admin Menu */}
          {isAdmin && (
            <Collapsible open={adminMenuOpen} onOpenChange={setAdminMenuOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span>Admin</span>
                </div>
                {adminMenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1 space-y-1">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    {item.title}
                    {item.badge !== undefined && item.badge > 0 && (
                      <Badge className="ml-auto bg-destructive text-destructive-foreground">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </nav>
      </ScrollArea>

      {/* User info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? 'Super Admin' : 'Merchant'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-card lg:block">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <NavContent />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent p-1.5 text-primary-foreground">
            <CreditCard className="h-4 w-4" />
          </div>
          <span className="font-bold">CinGateway</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/notifications')} className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                {unreadNotifications}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="fixed left-64 right-0 top-0 z-30 hidden h-16 items-center justify-between border-b bg-card px-6 lg:flex">
        {/* Breadcrumb placeholder */}
        <div className="text-sm text-muted-foreground">
          {location.pathname.split('/').filter(Boolean).map((segment, index, arr) => (
            <span key={segment}>
              <span className="capitalize">{segment.replace('-', ' ')}</span>
              {index < arr.length - 1 && <span className="mx-2">/</span>}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/notifications')} className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs">
                {unreadNotifications}
              </Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm md:inline-block">{user?.email}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Super Admin' : 'Merchant'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16">
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 lg:ml-64">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 CinGateway. All rights reserved. | v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}
