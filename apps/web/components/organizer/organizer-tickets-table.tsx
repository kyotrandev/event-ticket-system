'use client';

import Link from 'next/link';
import type { OrganizerTicketSummary } from '@/lib/types';
import { fmtDateTime } from '@/lib/booking-utils';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

function statusVariant(
  s: OrganizerTicketSummary['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'issued') return 'default';
  if (s === 'used') return 'secondary';
  return 'destructive';
}

export function OrganizerTicketsTable({
  tickets,
  showEvent = true,
  showOrganizer = false,
  detailBase = '/organizer/tickets',
}: {
  tickets: (OrganizerTicketSummary & { organizerName?: string; organizerEmail?: string })[];
  showEvent?: boolean;
  showOrganizer?: boolean;
  detailBase?: string;
}) {
  if (!tickets.length) {
    return (
      <p className="text-center text-muted-foreground py-12 rounded-3xl border-2 border-dashed">
        No tickets sold yet for this scope.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b-2 border-border">
            <tr className="text-left">
              <th className="px-4 py-3 font-bold">Code</th>
              {showEvent && <th className="px-4 py-3 font-bold">Event</th>}
              {showOrganizer && <th className="px-4 py-3 font-bold">Organizer</th>}
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Customer</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Issued</th>
              <th className="px-4 py-3 font-bold" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-border/60 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{t.code.slice(0, 13)}…</td>
                {showEvent && (
                  <td className="px-4 py-3 font-semibold max-w-[180px] truncate">
                    {t.eventName}
                  </td>
                )}
                {showOrganizer && (
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.organizerName ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{t.organizerEmail ?? ''}</p>
                  </td>
                )}
                <td className="px-4 py-3">{t.ticketTypeName ?? '—'}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{t.customerName}</p>
                  <p className="text-xs text-muted-foreground">{t.customerEmail}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(t.status)} className="rounded-full font-bold capitalize">
                    {t.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {fmtDateTime(t.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`${detailBase}/${t.id}`}
                    className={buttonVariants({ variant: 'outline', size: 'sm', className: 'rounded-xl font-bold' })}
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
