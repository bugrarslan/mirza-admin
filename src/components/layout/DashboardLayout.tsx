'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { isAdmin, useAuthStore } from '@/stores/authStore';
import {
    Car,
    FileText,
    KeyRound,
    LayoutDashboard,
    LogOut,
    Megaphone,
    Menu,
    MessageSquare,
    UserCog,
    Users,
    Wrench
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Müşteriler', href: '/customers', icon: Users },
  { title: 'Araçlar', href: '/vehicles', icon: Car },
  { title: 'Kiralamalar', href: '/rentals', icon: KeyRound },
  { title: 'Kampanyalar', href: '/campaigns', icon: Megaphone },
  { title: 'Belgeler', href: '/documents', icon: FileText },
  { title: 'Talepler', href: '/requests', icon: MessageSquare },
  { title: 'Servis Geçmişi', href: '/service-history', icon: Wrench },
  { title: 'Personel', href: '/personnel', icon: UserCog, adminOnly: true },
];

function NavLinkComponent({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.title}
    </Link>
  );
}

const NavLink = memo(NavLinkComponent);

function SidebarComponent({ className, onNavClick }: { className?: string; onNavClick?: () => void }) {
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const userIsAdmin = isAdmin(profile?.role);

  const filteredNavItems = useMemo(() => navItems.filter(
    (item) => !item.adminOnly || userIsAdmin
  ), [userIsAdmin]);

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="flex h-14 items-center border-b px-4 lg:h-15 lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Car className="h-6 w-6" />
          <span>Mirza Admin</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4 lg:px-4">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
            onClick={onNavClick}
          />
        ))}
      </nav>
    </div>
  );
}

const Sidebar = memo(SidebarComponent);

function HeaderComponent() {
  const { profile, signOut } = useAuthStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [signOut, router]);

  const handleMobileClose = useCallback(() => setMobileOpen(false), []);

  const getInitials = useCallback(() => {
    if (profile?.name && profile?.surname) {
      return `${profile.name[0]}${profile.surname[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  }, [profile]);

  const getRoleBadge = useCallback(() => {
    switch (profile?.role) {
      case 'admin':
        return 'Yönetici';
      case 'personnel':
        return 'Personel';
      default:
        return 'Kullanıcı';
    }
  }, [profile?.role]);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-15 lg:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menüyü aç/kapat</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavClick={handleMobileClose} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {profile?.name} {profile?.surname}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile?.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {getRoleBadge()}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Çıkış Yap</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

const Header = memo(HeaderComponent);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { initialize, isInitialized, isLoading, user, profile } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && !isLoading && !user) {
      router.push('/login');
    }
  }, [isInitialized, isLoading, user, router]);

  // Don't render layout for login page
  if (pathname === '/login') {
    return children;
  }

  // Show loading state
  if (!isInitialized || isLoading || !user || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
