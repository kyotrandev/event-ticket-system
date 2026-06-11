'use client';

import { CalendarDays, Radio, Ticket, Wallet } from 'lucide-react';
import type { OrganizerStats } from '@/lib/types';
import { fmtVnd } from '@/lib/organizer-utils';
import { Card, CardContent } from '@/components/ui/card';

const ITEMS = [
  {
    key: 'totalEvents' as const,
    label: 'Total events',
    icon: CalendarDays,
    format: (s: OrganizerStats) => String(s.totalEvents),
    sub: (s: OrganizerStats) => `${s.draftCount} drafts · ${s.upcomingCount} upcoming`,
  },
  {
    key: 'liveNow' as const,
    label: 'Live now',
    icon: Radio,
    format: (s: OrganizerStats) => String(s.liveNow),
    sub: () => 'Events happening right now',
  },
  {
    key: 'totalRevenue' as const,
    label: 'Revenue',
    icon: Wallet,
    format: (s: OrganizerStats) => fmtVnd(s.totalRevenue),
    sub: () => 'Total paid revenue',
  },
  {
    key: 'totalTicketsSold' as const,
    label: 'Tickets sold',
    icon: Ticket,
    format: (s: OrganizerStats) => s.totalTicketsSold.toLocaleString('en-US'),
    sub: () => 'Across all events',
  },
];

export function OrganizerKpiStrip({ stats }: { stats: OrganizerStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.key}
            className="border-2 border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </p>
                <div className="bg-primary/10 p-2 rounded-xl shrink-0">
                  <Icon className="size-4 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-extrabold tracking-tight">
                {item.format(stats)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {item.sub(stats)}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
