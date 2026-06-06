'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { AdminLayout } from '@/components/admin-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

function statusVariant(statusId: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (statusId === StatusId.Active) return 'default';
  if (statusId === StatusId.Locked) return 'destructive';
  if (statusId === StatusId.PendingApproval) return 'secondary';
  return 'outline';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      adminApi
        .getUsers(p, 20)
        .then((res) => {
          setUsers((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
          setHasMore(res.hasNextPage);
          setPage(p);
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load users'))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  async function toggleLock(user: User) {
    const isLocked = user.status?.id === StatusId.Locked;
    setActioning(user.id);
    setError(null);
    try {
      const updated = isLocked
        ? await adminApi.unlockUser(user.id)
        : await adminApi.lockUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActioning(null);
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Joined</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const statusId = u.status?.id ?? 0;
              const roleId = u.role?.id ?? 0;
              const isLocked = statusId === StatusId.Locked;
              const isAdmin = roleId === RoleId.Admin;
              return (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {u.firstName ?? ''} {u.lastName ?? ''}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-3 py-2">{ROLE_LABELS[roleId] ?? roleId}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(statusId)}>
                      {STATUS_LABELS[statusId] ?? statusId}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {!isAdmin && (
                      <Button
                        variant={isLocked ? 'outline' : 'destructive'}
                        size="sm"
                        disabled={actioning === u.id}
                        onClick={() => void toggleLock(u)}
                      >
                        {actioning === u.id ? '…' : isLocked ? 'Unlock' : 'Lock'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {loading && <p className="text-muted-foreground mt-4 text-sm">Loading…</p>}

      {hasMore && !loading && (
        <Button variant="outline" className="mt-4" onClick={() => load(page + 1)}>
          Load more
        </Button>
      )}
    </AdminLayout>
  );
}
