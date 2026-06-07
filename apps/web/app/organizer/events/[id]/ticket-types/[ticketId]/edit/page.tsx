'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ticketTypeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function EditTicketTypePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const ticketId = params.ticketId as string;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    price: 0,
    totalQty: 100,
    saleStart: '',
    saleEnd: '',
  });

  useEffect(() => {
    if (eventId && ticketId) {
      ticketTypeApi.list(eventId)
        .then(list => {
          const ticket = list.find(t => t.id === ticketId);
          if (ticket) {
            setForm({
              name: ticket.name,
              price: ticket.price,
              totalQty: ticket.totalQty,
              saleStart: new Date(ticket.saleStart).toISOString().slice(0, 16),
              saleEnd: new Date(ticket.saleEnd).toISOString().slice(0, 16),
            });
          } else {
            setError('Ticket type not found');
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to fetch ticket type');
        })
        .finally(() => {
          setFetching(false);
        });
    }
  }, [eventId, ticketId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = {
        name: form.name,
        price: Number(form.price),
        totalQty: Number(form.totalQty),
        saleStart: new Date(form.saleStart).toISOString(),
        saleEnd: new Date(form.saleEnd).toISOString(),
      };
      await ticketTypeApi.update(ticketId, data);
      router.push(`/organizer/events/${eventId}/ticket-types`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update ticket type');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="p-8 text-center text-muted-foreground">Loading ticket type...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/organizer/events/${eventId}/ticket-types`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Edit Ticket Type</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Ticket Name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="price">Price (VND)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              required
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="totalQty">Total Quantity</Label>
            <Input
              id="totalQty"
              type="number"
              min={1}
              required
              value={form.totalQty}
              onChange={(e) => setForm((f) => ({ ...f, totalQty: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="saleStart">Sale Start Date</Label>
            <Input
              id="saleStart"
              type="datetime-local"
              required
              value={form.saleStart}
              onChange={(e) => setForm((f) => ({ ...f, saleStart: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="saleEnd">Sale End Date</Label>
            <Input
              id="saleEnd"
              type="datetime-local"
              required
              value={form.saleEnd}
              onChange={(e) => setForm((f) => ({ ...f, saleEnd: e.target.value }))}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  );
}
