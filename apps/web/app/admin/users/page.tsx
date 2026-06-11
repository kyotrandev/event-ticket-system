'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  function load(p: number) {
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
  }

  useEffect(() => {
    adminApi
      .getUsers(1, 20)
      .then((res) => {
        setUsers(res.data);
        setHasMore(res.hasNextPage);
        setPage(1);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && String(u.role?.id) !== roleFilter) return false;
      if (!q) return true;
      const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, search, roleFilter]);

  async function toggleLock(user: User) {
    const isLocked = user.status?.id === StatusId.Locked;
    setActioning(user.id);
    setError(null);
    try {
      const updated = isLocked
        ? await adminApi.unlockUser(user.id)
        : await adminApi.lockUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(isLocked ? 'User unlocked' : 'User locked');
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
        <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">Manage accounts, roles, and access.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm rounded-2xl"
        />
        <select
          className="flex h-9 rounded-2xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm max-w-[180px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All roles</option>
          <option value={String(RoleId.Customer)}>Customer</option>
          <option value={String(RoleId.Organizer)}>Organizer</option>
          <option value={String(RoleId.Staff)}>Staff</option>
          <option value={String(RoleId.Admin)}>Admin</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border-2">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Joined</th>
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => {
              const statusId = u.status?.id ?? 0;
              const roleId = u.role?.id ?? 0;
              const isLocked = statusId === StatusId.Locked;
              const isAdmin = roleId === RoleId.Admin;
              return (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/users/${u.id}`} className="hover:text-primary hover:underline">
                      {u.firstName ?? ''} {u.lastName ?? ''}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[roleId] ?? roleId}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(statusId)}>
                      {STATUS_LABELS[statusId] ?? statusId}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium border border-input bg-background shadow-sm hover:bg-accent h-8 px-3"
                      >
                        View
                      </Link>
                      {!isAdmin && (
                      <Button
                        variant={isLocked ? 'outline' : 'destructive'}
                        size="sm"
                        className="rounded-xl"
                        disabled={actioning === u.id}
                        onClick={() => void toggleLock(u)}
                      >
                        {actioning === u.id ? '…' : isLocked ? 'Unlock' : 'Lock'}
                      </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm">No users match your filters.</p>
      )}

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {hasMore && !loading && (
        <Button variant="outline" className="rounded-2xl" onClick={() => load(page + 1)}>
          Load more
        </Button>
      )}
    </div>
  );
}
