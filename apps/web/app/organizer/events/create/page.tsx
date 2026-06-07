'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerApi, fileApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    category: '',
    startTime: '',
    endTime: '',
    maxTicketsPerOrder: 5,
    cancellationWindowHours: 24,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let uploadedBannerUrl: string | undefined = undefined;
      if (bannerFile) {
        const uploadRes = await fileApi.upload(bannerFile);
        uploadedBannerUrl = uploadRes.file.path;
      }

      const data = {
        ...form,
        ...(uploadedBannerUrl ? { bannerUrl: uploadedBannerUrl } : {}),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        maxTicketsPerOrder: Number(form.maxTicketsPerOrder),
        cancellationWindowHours: Number(form.cancellationWindowHours),
      };
      await organizerApi.createEvent(data);
      router.push('/organizer/events');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/organizer/events" className="text-sm text-muted-foreground hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-2xl font-bold">Create Event</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Event Name</Label>
          <Input
            id="name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="banner">Banner Image (Optional)</Label>
          <Input
            id="banner"
            type="file"
            accept="image/*"
            onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              required
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              required
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="datetime-local"
              required
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="maxTickets">Max Tickets / Order</Label>
            <Input
              id="maxTickets"
              type="number"
              min={1}
              required
              value={form.maxTicketsPerOrder}
              onChange={(e) => setForm((f) => ({ ...f, maxTicketsPerOrder: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cancelWindow">Cancel Window (Hours)</Label>
            <Input
              id="cancelWindow"
              type="number"
              min={0}
              required
              value={form.cancellationWindowHours}
              onChange={(e) => setForm((f) => ({ ...f, cancellationWindowHours: Number(e.target.value) }))}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Event'}
        </Button>
      </form>
    </div>
  );
}
