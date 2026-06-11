'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ticketApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Ticket } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

function statusVariant(
  s: Ticket['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'issued') return 'default';
  if (s === 'used') return 'secondary';
  return 'destructive';
}

function QrImage({ code }: { code: string }) {
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

  if (err) return <p className="text-muted-foreground text-xs">QR unavailable</p>;
  if (!src) return <div className="size-24 animate-pulse rounded bg-muted" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code" className="size-24 rounded" />;
}

export default function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }

    ticketApi
      .findMine()
      .then(setTickets)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-muted-foreground">Loading tickets…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">My Tickets</h1>

      {tickets.length === 0 ? (
        <div className="space-y-3 text-center py-12">
          <p className="text-muted-foreground">No tickets yet.</p>
          <Link href="/events" className={buttonVariants()}>
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Link key={t.id} href={`/my-tickets/${t.code}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base font-mono">{t.code}</CardTitle>
                    <Badge variant={statusVariant(t.status)}>
                      {t.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-start gap-4 flex-col sm:flex-row">
                  <div className="shrink-0 bg-white p-2 rounded-lg shadow-sm border">
                    <QrImage code={t.code} />
                  </div>
                  <div className="flex-1 text-sm space-y-2 text-muted-foreground w-full">
                    <div className="grid grid-cols-2 gap-y-2">
                      <div>
                        <p className="font-medium text-foreground">Issued Date</p>
                        <p>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
