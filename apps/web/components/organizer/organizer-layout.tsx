'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarDays, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/organizer/events', label: 'My Events', icon: CalendarDays },
  { href: '/organizer/events/create', label: 'Create Event', icon: Plus },
];

export function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user) {
      const role = user.role?.id;
      if (role !== RoleId.Organizer && role !== RoleId.Admin) {
        router.replace('/');
      }
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  const role = user.role?.id;
  if (role !== RoleId.Organizer && role !== RoleId.Admin) {
    return null;
  }

  const isEventsList = pathname === '/organizer/events';

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="border-b-2 border-border bg-background/80 backdrop-blur-sm sticky top-20 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <LayoutDashboard className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Organizer
              </p>
              <p className="font-extrabold text-lg leading-tight">
                Welcome, {user.firstName ?? user.email?.split('@')[0]}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.map((item) => {
              const active =
                item.href === '/organizer/events'
                  ? isEventsList
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    buttonVariants({
                      variant: active ? 'default' : 'outline',
                      size: 'sm',
                    }),
                    'rounded-2xl font-bold gap-2',
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
