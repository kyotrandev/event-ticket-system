'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode } from 'lucide-react';
import { ticketApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Ticket } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (err) return <p className="text-xs font-semibold text-muted-foreground">QR unavailable</p>;
  if (!src) return <div className="size-28 animate-pulse rounded-lg bg-muted" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="QR code" className="size-28 rounded-lg" />;
}

export default function MyTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    ticketApi
      .findMine()
      .then(setTickets)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="page-shell max-w-4xl">
        <div className="vibrant-card p-6 font-semibold text-muted-foreground">
          Loading tickets...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-4xl space-y-6">
      <div>
        <p className="vibrant-chip inline-flex">Access passes</p>
        <h1 className="display-play mt-3 text-6xl leading-[0.9]">My tickets</h1>
      </div>

      {tickets.length === 0 ? (
        <div className="vibrant-card p-8 text-center">
          <QrCode className="mx-auto mb-4 size-8 text-primary" />
          <p className="font-black text-muted-foreground">No tickets yet.</p>
          <Link href="/events" className={buttonVariants({ className: 'mt-5' })}>
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <CardTitle className="break-all font-mono text-sm">
                    {t.code}
                  </CardTitle>
                  <Badge variant={statusVariant(t.status)}>
                    {t.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="rounded-lg border-2 bg-white p-3 shadow-[4px_4px_0_var(--secondary)]">
                  <QrImage code={t.code} />
                </div>
                <div className="text-sm font-semibold leading-6 text-muted-foreground">
                  <p>
                    Issued:{' '}
                    <span className="font-black text-foreground">
                      {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </p>
                  <p>Show this QR code at check-in.</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
