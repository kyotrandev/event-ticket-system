'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { organizerApi, fileApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LocationPicker } from '@/components/LocationPicker';

const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  location: z.string().min(1, 'Location is required'),
  category: z.string().min(1, 'Category is required'),
  startTime: z.string().min(1, 'Start time is required').refine((val) => new Date(val) > new Date(), {
    message: 'Start time must be in the future',
  }),
  endTime: z.string().min(1, 'End time is required'),
  maxTicketsPerOrder: z.coerce.number().min(1).max(10),
  cancellationWindowHours: z.coerce.number().min(0),
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      category: '',
      startTime: '',
      endTime: '',
      maxTicketsPerOrder: 5,
      cancellationWindowHours: 24,
    },
  });

  const locationValue = watch('location');

  async function onSubmit(data: EventFormValues) {
    setLoading(true);
    setError(null);
    try {
      let uploadedBannerUrl: string | undefined = undefined;
      if (bannerFile) {
        const uploadRes = await fileApi.upload(bannerFile);
        uploadedBannerUrl = uploadRes.file.path;
      }

      const payload = {
        ...data,
        ...(uploadedBannerUrl ? { bannerUrl: uploadedBannerUrl } : {}),
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      
      await organizerApi.createEvent(payload);
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="name">Event Name</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            {...register('description')}
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
          {bannerFile && (
            <div className="mt-2 rounded-md overflow-hidden border border-input w-full max-w-xs relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(bannerFile)}
                alt="Banner preview"
                className="object-cover w-full h-full"
              />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <Label>Location</Label>
          <LocationPicker 
            value={locationValue} 
            onChange={(val) => setValue('location', val, { shouldValidate: true })} 
          />
          {errors.location && <p className="text-sm text-destructive">{errors.location.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="category">Category</Label>
          <Input id="category" {...register('category')} />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="startTime">Start Time</Label>
            <Input id="startTime" type="datetime-local" {...register('startTime')} />
            {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="endTime">End Time</Label>
            <Input id="endTime" type="datetime-local" {...register('endTime')} />
            {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="maxTickets">Max Tickets / Order</Label>
            <Input id="maxTickets" type="number" {...register('maxTicketsPerOrder')} />
            {errors.maxTicketsPerOrder && <p className="text-sm text-destructive">{errors.maxTicketsPerOrder.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cancelWindow">Cancel Window (Hours)</Label>
            <Input id="cancelWindow" type="number" {...register('cancellationWindowHours')} />
            {errors.cancellationWindowHours && <p className="text-sm text-destructive">{errors.cancellationWindowHours.message}</p>}
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Event'}
        </Button>
      </form>
    </div>
  );
}
