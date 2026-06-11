import type { OrganizerEventSummary } from './types';

export function fmtVnd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}

export function parseLocation(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { address?: string };
    return parsed.address ?? raw;
  } catch {
    return raw;
  }
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export interface AttentionAlert {
  id: string;
  eventId: string;
  eventName: string;
  message: string;
  severity: 'warning' | 'info';
  href: string;
}

export function buildAttentionAlerts(events: OrganizerEventSummary[]): AttentionAlert[] {
  const alerts: AttentionAlert[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const ev of events) {
    if (ev.status === 'draft' && ev.ticketTypeCount === 0) {
      alerts.push({
        id: `${ev.id}-no-tickets`,
        eventId: ev.id,
        eventName: ev.name,
        message: 'Draft has no ticket types — add tickets before publishing.',
        severity: 'warning',
        href: `/organizer/events/${ev.id}/ticket-types`,
      });
    }

    if (
      (ev.status === 'published' || ev.status === 'ongoing') &&
      ev.staffCount === 0
    ) {
      const startsIn = new Date(ev.startTime).getTime() - now;
      if (startsIn > 0 && startsIn < 2 * dayMs) {
        alerts.push({
          id: `${ev.id}-no-staff`,
          eventId: ev.id,
          eventName: ev.name,
          message: 'Event starts soon but no check-in staff assigned.',
          severity: 'warning',
          href: `/organizer/events/${ev.id}/staff`,
        });
      }
    }

    if (ev.status === 'ongoing' && ev.checkInRate < 30 && ev.ticketsSold > 0) {
      alerts.push({
        id: `${ev.id}-low-checkin`,
        eventId: ev.id,
        eventName: ev.name,
        message: `Low check-in rate (${ev.checkInRate}%) — monitor live check-in.`,
        severity: 'info',
        href: `/organizer/events/${ev.id}/checkin`,
      });
    }
  }

  return alerts.slice(0, 5);
}

export function exportAttendeesCsv(
  attendees: Array<{
    customerName: string;
    customerEmail: string;
    ticketTypeName?: string;
    code: string;
    status: string;
    createdAt: string;
  }>,
  eventName: string,
) {
  const header = ['Name', 'Email', 'Ticket type', 'Ticket code', 'Status', 'Created at'];
  const rows = attendees.map((a) => [
    a.customerName,
    a.customerEmail,
    a.ticketTypeName ?? '',
    a.code,
    a.status,
    new Date(a.createdAt).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${eventName.replace(/[^\w\s-]/g, '')}-attendees.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
