'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Pencil,
  Receipt,
  ScanLine,
  Ticket,
  TicketCheck,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function EventHubNav({
  eventId,
  basePath = '/organizer/events',
  variant = 'organizer',
}: {
  eventId: string;
  basePath?: string;
  variant?: 'organizer' | 'admin';
}) {
  const pathname = usePathname();
  const base = `${basePath}/${eventId}`;

  const allTabs = [
    { href: base, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: `${base}/ticket-types`, label: 'Ticket types', icon: Ticket, organizerOnly: true },
    { href: `${base}/bookings`, label: 'Bookings', icon: Receipt },
    { href: `${base}/tickets`, label: 'Tickets', icon: TicketCheck },
    { href: `${base}/staff`, label: 'Staff', icon: UserCog, organizerOnly: true },
    { href: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `${base}/checkin`, label: 'Check-in', icon: ScanLine, organizerOnly: true },
    { href: `${base}/edit`, label: 'Settings', icon: Pencil, organizerOnly: true },
  ];

  const tabs =
    variant === 'admin'
      ? allTabs.filter((t) => !t.organizerOnly)
      : allTabs;

  return (
    <div className="flex flex-wrap gap-2 border-b-2 border-border pb-4 mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              buttonVariants({
                variant: active ? 'default' : 'ghost',
                size: 'sm',
              }),
              'rounded-2xl font-bold gap-2 shrink-0',
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
