'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

export default function PendingOrganizersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getPendingOrganizers()
      .then((res) => setUsers(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDecision(user: User, approve: boolean) {
    if (!approve) {
      const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
      if (!confirm(`Reject application from ${name}? This cannot be undone.`)) return;
    }

    setActioning(user.id);
    setError(null);
    try {
      if (approve) {
        await adminApi.approveOrganizer(user.id);
        toast.success('Organizer approved');
      } else {
        await adminApi.rejectOrganizer(user.id);
        toast.success('Application rejected');
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Pending Organizers</h1>
        <p className="text-muted-foreground mt-1">Review and approve organizer applications.</p>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && users.length === 0 && (
        <p className="text-muted-foreground">No pending applications.</p>
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border-2">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Company</th>
                <th className="px-4 py-3 text-left font-semibold">Phone</th>
                <th className="px-4 py-3 text-left font-semibold">Applied</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {u.firstName ?? ''} {u.lastName ?? ''}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">{u.companyName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phoneNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        disabled={actioning === u.id}
                        onClick={() => void handleDecision(u, true)}
                      >
                        {actioning === u.id ? '…' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl"
                        disabled={actioning === u.id}
                        onClick={() => void handleDecision(u, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
