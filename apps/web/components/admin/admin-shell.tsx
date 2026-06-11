'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  LayoutDashboard,
  Receipt,
  Shield,
  Tag,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { adminApi } from '@/lib/api';
import { RoleId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
  badge?: number;
  disabled?: boolean;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || user.role?.id !== RoleId.Admin)) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role?.id === RoleId.Admin) {
      adminApi
        .getStats()
        .then((s) => setPendingCount(s.pendingOrganizers))
        .catch(() => {});
    }
  }, [user]);

  if (loading || !user || user.role?.id !== RoleId.Admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const nav: NavItem[] = [
    {
      href: '/admin/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: (p) => p === '/admin/dashboard' || p === '/admin/stats',
    },
    {
      href: '/admin/users',
      label: 'Users',
      icon: Users,
      isActive: (p) => p.startsWith('/admin/users'),
    },
    {
      href: '/admin/organizers/pending',
      label: 'Pending Organizers',
      icon: UserCheck,
      isActive: (p) => p.startsWith('/admin/organizers'),
      badge: pendingCount,
    },
    {
      href: '/admin/promo-codes',
      label: 'Promo Codes',
      icon: Tag,
      isActive: (p) => p.startsWith('/admin/promo-codes'),
    },
    {
      href: '/admin/bookings',
      label: 'Bookings',
      icon: Receipt,
      isActive: (p) => p.startsWith('/admin/bookings'),
    },
    {
      href: '/admin/tickets',
      label: 'Tickets',
      icon: Ticket,
      isActive: (p) => p.startsWith('/admin/tickets'),
    },
  ];

  const comingSoon: NavItem[] = [
    {
      href: '#',
      label: 'Events',
      icon: CalendarDays,
      isActive: () => false,
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
      <div className="mx-auto max-w-[1440px] flex min-h-screen">
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-background/80 backdrop-blur-sm sticky top-0 h-screen">
          <div className="p-5 border-b">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Admin
                </p>
                <p className="font-extrabold text-sm leading-tight truncate max-w-[160px]">
                  {user.firstName ?? user.email?.split('@')[0]}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {nav.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null && item.badge > 0 && (
                    <Badge
                      variant={active ? 'secondary' : 'default'}
                      className="h-5 min-w-5 px-1.5 text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}

            <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
              Phase 2
            </p>
            {comingSoon.map((item) => {
              const Icon = item.icon;
              return (
                <span
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                  title="Coming in Phase 2"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Soon
                  </Badge>
                </span>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="lg:hidden border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 px-4 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {nav.map((item) => {
                const active = item.isActive(pathname);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                    {item.badge != null && item.badge > 0 && (
                      <span className="bg-background/20 rounded-full px-1.5 text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
