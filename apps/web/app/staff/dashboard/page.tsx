'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { MapPin, CalendarDays, ScanLine } from 'lucide-react';

export default function StaffDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role?.id !== RoleId.Staff) {
      router.replace('/');
      return;
    }

    staffApi
      .getMyAssignments()
      .then((data) => setAssignments(data || []))
      .catch((err) => console.error('Failed to load assignments', err))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <p className="text-muted-foreground text-center">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Staff Dashboard</h1>
        <p className="text-muted-foreground">Select an event below to start scanning tickets.</p>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center border-dashed bg-muted/30">
          <CardContent className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">No events assigned</h3>
              <p className="text-sm text-muted-foreground">You have not been assigned to scan tickets for any events yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const event = assignment.event;
            if (!event) return null;
            
            return (
              <Link key={event.id} href={`/staff/dashboard/${event.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/50 group h-full cursor-pointer flex flex-col">
                  {event.bannerImage ? (
                    <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={event.bannerImage} 
                        alt={event.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-t-xl bg-muted flex items-center justify-center border-b">
                      <ScanLine className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardHeader className="flex-1 pb-2">
                    <CardTitle className="text-xl line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {event.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-2">
                      <CalendarDays className="w-4 h-4 shrink-0" />
                      {new Date(event.startTime).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{event.location}</span>
                    </div>
                    <div className={buttonVariants({ variant: 'default', className: 'w-full gap-2 rounded-xl' })}>
                      View Details
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
