'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  Pencil,
  ScanLine,
  Ticket,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export function EventHubNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/organizer/events/${eventId}`;

  const tabs = [
    { href: base, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: `${base}/ticket-types`, label: 'Ticket types', icon: Ticket },
    { href: `${base}/staff`, label: 'Staff', icon: UserCog },
    { href: `${base}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `${base}/checkin`, label: 'Check-in', icon: ScanLine },
    { href: `${base}/edit`, label: 'Settings', icon: Pencil },
  ];

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
