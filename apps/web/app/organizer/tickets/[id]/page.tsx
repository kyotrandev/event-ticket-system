'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  MapPin,
  Phone,
  Ticket as TicketIcon,
  User,
} from 'lucide-react';
import { organizerApi, ticketApi } from '@/lib/api';
import type { TicketDetails } from '@/lib/types';
import { fmtDateTime } from '@/lib/booking-utils';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function statusVariant(
  s: TicketDetails['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'issued') return 'default';
  if (s === 'used') return 'secondary';
  return 'destructive';
}

function QrPreview({ code }: { code: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    ticketApi
      .getQrBlob(code)
      .then(setSrc)
      .catch(() => setErr(true));
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (err) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        QR preview unavailable
      </p>
    );
  }
  if (!src) {
    return (
      <div className="size-40 mx-auto animate-pulse rounded-xl bg-muted" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Ticket QR"
      className="size-40 mx-auto rounded-xl bg-white p-2 border"
    />
  );
}

export default function OrganizerTicketDetailPage() {
  const params = useParams();
  const ticketId = typeof params?.id === 'string' ? params.id : '';

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ticketId) {
      setError('Invalid ticket');
      setLoading(false);
      return;
    }
    ticketApi
      .getDetails(ticketId)
      .then(setTicket)
      .catch(() => setError('Ticket not found or access denied'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  if (loading) {
    return (
      <p className="text-muted-foreground py-12 text-center">Loading ticket…</p>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4 max-w-lg mx-auto text-center py-12">
        <TicketIcon className="size-10 mx-auto text-muted-foreground" />
        <p className="text-destructive">{error || 'Ticket not found'}</p>
        <Link href="/organizer/tickets" className={buttonVariants()}>
          <ArrowLeft className="size-4 mr-2" />
          Back to tickets
        </Link>
      </div>
    );
  }

  const startDate = ticket.event?.startTime
    ? new Date(ticket.event.startTime)
    : null;
  const customerName = ticket.customer
    ? `${ticket.customer.firstName ?? ''} ${ticket.customer.lastName ?? ''}`.trim() ||
      ticket.customer.email
    : 'Unknown';

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <Link
        href="/organizer/tickets"
        className={buttonVariants({ variant: 'ghost', className: 'rounded-2xl font-bold -ml-2' })}
      >
        <ArrowLeft className="size-4 mr-2" />
        Back to tickets
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Ticket details</h1>
        <Badge variant={statusVariant(ticket.status)} className="capitalize font-bold rounded-full">
          {ticket.status}
        </Badge>
      </div>

      <Card className="border-2 rounded-2xl overflow-hidden">
        {ticket.event?.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ticket.event.bannerUrl}
            alt={ticket.event.name ?? 'Event'}
            className="w-full h-36 object-cover"
          />
        ) : (
          <div className="h-24 bg-primary/10" />
        )}
        <CardHeader>
          <CardTitle>{ticket.event?.name ?? 'Event'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ticket.ticketType?.name ?? 'Ticket type'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            {startDate && (
              <div className="flex gap-2">
                <Calendar className="size-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Date</p>
                  <p className="text-muted-foreground">
                    {startDate.toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
            {startDate && (
              <div className="flex gap-2">
                <Clock className="size-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-muted-foreground">
                    {startDate.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}
            {ticket.event?.location && (
              <div className="flex gap-2 sm:col-span-2">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{ticket.event.location}</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 flex flex-col items-center">
            <QrPreview code={ticket.code} />
            <p className="mt-3 font-mono text-xs text-muted-foreground break-all text-center px-4">
              {ticket.code}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="size-4" />
            Attendee
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-bold">{customerName}</p>
          {ticket.customer?.email && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="size-3.5" />
              {ticket.customer.email}
            </p>
          )}
          {ticket.customer?.phoneNumber && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="size-3.5" />
              {ticket.customer.phoneNumber}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Issued</span>
            <span>{fmtDateTime(ticket.createdAt)}</span>
          </div>
          {ticket.booking?.id && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order</span>
              <Link
                href={`/organizer/bookings/${ticket.booking.id}`}
                className="font-mono text-xs text-primary hover:underline truncate max-w-[60%]"
              >
                {ticket.booking.id.slice(0, 8)}…
              </Link>
            </div>
          )}
          {ticket.checkIn && (
            <div className="pt-2 border-t space-y-1">
              <p className="font-medium text-green-700 dark:text-green-400">Checked in</p>
              <p className="text-muted-foreground">
                {fmtDateTime(ticket.checkIn.scannedAt)} · {ticket.checkIn.method}
              </p>
              {ticket.checkIn.staff && (
                <p className="text-muted-foreground text-xs">
                  by {ticket.checkIn.staff.firstName} {ticket.checkIn.staff.lastName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
