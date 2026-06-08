'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ticketTypeApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateTicketTypePage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    price: '0',
    totalQty: 100,
    saleStart: '',
    saleEnd: '',
  });

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-digit characters
    const val = e.target.value.replace(/\D/g, '');
    if (val === '') {
      setForm((f) => ({ ...f, price: '' }));
      return;
    }
    // Format with commas
    const formatted = new Intl.NumberFormat('en-US').format(parseInt(val, 10));
    setForm((f) => ({ ...f, price: formatted }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = {
        name: form.name,
        price: Number(form.price.replace(/,/g, '')),
        totalQty: Number(form.totalQty),
        saleStart: new Date(form.saleStart).toISOString(),
        saleEnd: new Date(form.saleEnd).toISOString(),
      };
      await ticketTypeApi.create(eventId, data);
      router.push(`/organizer/events/${eventId}/ticket-types`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket type');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/organizer/events/${eventId}/ticket-types`} className="text-sm text-muted-foreground hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Create Ticket Type</h1>
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
            placeholder="e.g. Early Bird, VIP"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="price">Price (VND)</Label>
            <Input
              id="price"
              type="text"
              required
              value={form.price}
              onChange={handlePriceChange}
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
          {loading ? 'Creating...' : 'Create Ticket Type'}
        </Button>
      </form>
    </div>
  );
}
