'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@/lib/types';
import { StatusId, RoleId } from '@/lib/types';

const ROLE_LABELS: Record<number, string> = {
  [RoleId.Admin]: 'Admin',
  [RoleId.Customer]: 'Customer',
  [RoleId.Organizer]: 'Organizer',
  [RoleId.Staff]: 'Staff',
};

const STATUS_LABELS: Record<number, string> = {
  [StatusId.Active]: 'Active',
  [StatusId.Inactive]: 'Inactive',
  [StatusId.PendingApproval]: 'Pending',
  [StatusId.Locked]: 'Locked',
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    adminApi
      .getUser(userId)
      .then(setUser)
      .catch((e) => setError(e instanceof Error ? e.message : 'User not found'))
      .finally(() => setLoading(false));
  }, [userId]);

  async function toggleLock() {
    if (!user) return;
    const isLocked = user.status?.id === StatusId.Locked;
    setActioning(true);
    try {
      const updated = isLocked
        ? await adminApi.unlockUser(user.id)
        : await adminApi.lockUser(user.id);
      setUser(updated);
      toast.success(isLocked ? 'User unlocked' : 'User locked');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActioning(false);
    }
  }

  if (loading) return <p className="text-muted-foreground">Loading user…</p>;
  if (error || !user) {
    return <p className="text-destructive">{error ?? 'User not found'}</p>;
  }

  const roleId = user.role?.id ?? 0;
  const statusId = user.status?.id ?? 0;
  const isAdmin = roleId === RoleId.Admin;
  const isLocked = statusId === StatusId.Locked;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/users" className="text-sm font-bold text-muted-foreground hover:text-primary">
        ← Users
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">
          {user.firstName} {user.lastName}
        </h1>
        <Badge>{ROLE_LABELS[roleId] ?? roleId}</Badge>
        <Badge variant={isLocked ? 'destructive' : 'secondary'}>
          {STATUS_LABELS[statusId] ?? statusId}
        </Badge>
      </div>

      <Card className="border-2 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          {user.companyName && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Company</span>
              <span>{user.companyName}</span>
            </div>
          )}
          {user.phoneNumber && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span>{user.phoneNumber}</span>
            </div>
          )}
          {user.createdAt && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Joined</span>
              <span>{new Date(user.createdAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {roleId === RoleId.Organizer && (
        <Card className="border-2 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Organizer data</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link
              href={`/admin/events?organizerId=${user.id}`}
              className="text-sm font-bold text-primary hover:underline"
            >
              View events →
            </Link>
            <Link
              href={`/admin/bookings?organizerId=${user.id}`}
              className="text-sm font-bold text-primary hover:underline"
            >
              View bookings →
            </Link>
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <Button
          variant={isLocked ? 'outline' : 'destructive'}
          className="rounded-2xl"
          disabled={actioning}
          onClick={() => void toggleLock()}
        >
          {actioning ? '…' : isLocked ? 'Unlock account' : 'Lock account'}
        </Button>
      )}
    </div>
  );
}
