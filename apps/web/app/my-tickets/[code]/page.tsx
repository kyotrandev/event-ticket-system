'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Clock, Ticket as TicketIcon } from 'lucide-react';

import { api, ticketApi, bookingApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Ticket, EventModel, BookingItem } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

function statusVariant(
  s: Ticket['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'issued') return 'default';
  if (s === 'used') return 'secondary';
  return 'destructive';
}

function QrImageBig({ code }: { code: string }) {
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

  if (err) return <p className="text-muted-foreground text-sm">QR Code unavailable</p>;
  if (!src) return <div className="size-48 animate-pulse rounded-xl bg-muted" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code" className="size-48 rounded-xl bg-white p-2 border" />;
}

export default function TicketDetailPage() {
  const params = useParams();
  const code = typeof params?.code === 'string' ? params.code : '';

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [bookingItem, setBookingItem] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!code) { setError('Invalid ticket code'); setLoading(false); return; }

    async function fetchData() {
      try {
        // Find the specific ticket
        const myTickets = await ticketApi.findMine();
        const foundTicket = myTickets.find(t => t.code === code);
        
        if (!foundTicket) {
          setError('Ticket not found or you do not have permission to view it.');
          return;
        }
        
        setTicket(foundTicket);
        
        // Fetch related event details
        try {
          const eventData = await api.get<EventModel>(`/events/${foundTicket.eventId}`);
          setEvent(eventData);
        } catch (eventErr) {
          console.error("Failed to load event details", eventErr);
        }

        // Fetch related booking to get ticket type info
        try {
          const myBookings = await bookingApi.findMine();
          for (const booking of myBookings) {
            const item = booking.items?.find((i) => i.id === foundTicket.bookingItemId);
            if (item) {
              setBookingItem(item);
              break;
            }
          }
        } catch (bookingErr) {
          console.error("Failed to load booking details", bookingErr);
        }
      } catch (err) {
        setError('Failed to load ticket details.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading, router, code]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-muted-foreground animate-pulse">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-destructive/10">
          <TicketIcon className="size-8 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Oops!</h1>
        <p className="mb-8 text-muted-foreground">{error || 'Ticket not found.'}</p>
        <Link href="/my-tickets" className={buttonVariants({ variant: 'default' })}>
          <ArrowLeft className="mr-2 size-4" />
          Back to My Tickets
        </Link>
      </div>
    );
  }

  const startDate = event ? new Date(event.startTime) : null;
  const endDate = event ? new Date(event.endTime) : null;
  const isUsed = ticket.status === 'used';
  const isCancelled = ticket.status === 'cancelled';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <Link
        href="/my-tickets"
        className="mb-8 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 size-4" />
        Back to tickets
      </Link>

      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl shadow-black/5 ring-1 ring-border sm:max-w-lg">
        {/* Top Header / Banner Area */}
        <div className="relative h-32 w-full sm:h-40">
          {event?.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={event.bannerUrl} 
              alt={event.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/80 to-primary" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <Badge 
              variant={statusVariant(ticket.status)} 
              className="shadow-sm capitalize font-medium"
            >
              {ticket.status}
            </Badge>
          </div>
        </div>

        {/* Event Details */}
        <div className="px-6 pt-6 pb-8 sm:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight mb-6">
            {event?.name || 'Event Details Unavailable'}
          </h1>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-2">
                <Calendar className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Date</p>
                <p className="text-sm text-muted-foreground">
                  {startDate ? startDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'TBD'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-2">
                <Clock className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Time</p>
                <p className="text-sm text-muted-foreground">
                  {startDate ? startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                  {endDate ? ` - ${endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-muted p-2">
                <MapPin className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Location</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event?.location || 'TBD'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider with cutout circles */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -left-3 h-6 w-6 rounded-full bg-background ring-1 ring-border ring-inset" />
          <div className="w-full border-t-2 border-dashed border-border" />
          <div className="absolute -right-3 h-6 w-6 rounded-full bg-background ring-1 ring-border ring-inset" />
        </div>

        {/* QR Code and Ticket Info */}
        <div className="flex flex-col items-center px-6 py-8 sm:px-8">
          <div className={`relative transition-opacity duration-300 ${isUsed || isCancelled ? 'opacity-50' : 'opacity-100'}`}>
            <QrImageBig code={ticket.code} />
            {isUsed && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
                <div className="bg-background/90 text-foreground px-4 py-2 rounded-full font-bold shadow-lg border border-border rotate-[-12deg]">
                  SCANNED
                </div>
              </div>
            )}
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
                <div className="bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-full font-bold shadow-lg rotate-[-12deg]">
                  CANCELLED
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
              Ticket Code
            </p>
            <p className="font-mono text-lg font-bold tracking-widest text-foreground bg-muted px-4 py-1.5 rounded-lg border">
              {ticket.code.substring(0, 8).toUpperCase()}
            </p>
          </div>
          
          <div className="mt-8 grid w-full grid-cols-2 gap-4 rounded-xl bg-muted/50 p-4 border">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ticket Type</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {bookingItem?.ticketType?.name || 'Standard Ticket'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Price</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {bookingItem?.unitPrice != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bookingItem.unitPrice) : 'Free'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Issued to</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : user?.email || 'Attendee'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Order Date</p>
              <p className="text-sm font-semibold text-foreground truncate mt-0.5">
                {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
            <div className="col-span-2 pt-2 mt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Note</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Please present this QR code at the event entrance for scanning. Ensure your screen brightness is turned up.
              </p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
