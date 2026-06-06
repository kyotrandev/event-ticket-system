'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import type { User } from '@/lib/types';

export default function PendingOrganizersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .getPendingOrganizers()
      .then((res) => setUsers(res.data))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecision(user: User, approve: boolean) {
    setActioning(user.id);
    setError(null);
    try {
      if (approve) {
        await adminApi.approveOrganizer(user.id);
      } else {
        await adminApi.rejectOrganizer(user.id);
      }
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Pending Organizer Applications</h1>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && <p className="text-muted-foreground">Loading…</p>}

      {!loading && users.length === 0 && (
        <p className="text-muted-foreground">No pending applications.</p>
      )}

      {users.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Applied</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {u.firstName ?? ''} {u.lastName ?? ''}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2 flex gap-2">
                    <Button
                      size="sm"
                      disabled={actioning === u.id}
                      onClick={() => void handleDecision(u, true)}
                    >
                      {actioning === u.id ? '…' : 'Approve'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actioning === u.id}
                      onClick={() => void handleDecision(u, false)}
                    >
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
