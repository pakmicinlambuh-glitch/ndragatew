import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  DollarSign,
  Shield,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Buat Transaksi',
    href: '/dashboard/create',
    icon: <PlusCircle className="h-5 w-5" />,
  },
  {
    title: 'Riwayat Transaksi',
    href: '/dashboard/transactions',
    icon: <History className="h-5 w-5" />,
  },
  {
    title: 'API & Webhook',
    href: '/dashboard/api',
    icon: <Code className="h-5 w-5" />,
  },
  {
    title: 'Semua Transaksi',
    href: '/admin/transactions',
    icon: <Receipt className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    title: 'Manajemen User',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    title: 'Pengaturan Fee',
    href: '/admin/fees',
    icon: <DollarSign className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    title: 'Pengaturan API',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    title: 'Laporan',
    href: '/admin/reports',
    icon: <FileText className="h-5 w-5" />,
    adminOnly: true,
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
        <nav className="space-y-1">
          {filteredNavItems.map((item) => (
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
              {item.adminOnly && (
                <Shield className="ml-auto h-3 w-3 text-accent" />
              )}
            </Link>
          ))}
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
              {isAdmin ? 'Super Admin' : 'User'}
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
      </header>

      {/* Desktop Header */}
      <header className="fixed left-64 right-0 top-0 z-30 hidden h-16 items-center justify-end border-b bg-card px-6 lg:flex">
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
                  {isAdmin ? 'Super Admin' : 'User'}
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
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16">
          <div className="p-4 lg:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
