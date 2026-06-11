'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { staffApi, organizerApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { EventModel, EventStaffAssignment } from '@/lib/types';
import { EventHubNav } from '@/components/organizer/event-hub-nav';

export default function EventStaffPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [staff, setStaff] = useState<EventStaffAssignment[]>([]);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviting, setInviting] = useState(false);

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (eventId) {
      Promise.all([organizerApi.getEvent(eventId), staffApi.list(eventId)])
        .then(([ev, st]) => {
          setEvent(ev);
          setStaff(st);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load staff');
        })
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError(null);
    try {
      await staffApi.invite(eventId, {
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      // Refresh the list to get the full user info
      const st = await staffApi.list(eventId);
      setStaff(st);
      setEmail('');
      setFirstName('');
      setLastName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite staff');
    } finally {
      setInviting(false);
    }
  }

  function startEditing(s: EventStaffAssignment) {
    setEditingStaffId(s.staffId);
    setEditFirstName(s.firstName || '');
    setEditLastName(s.lastName || '');
  }

  function cancelEditing() {
    setEditingStaffId(null);
    setEditFirstName('');
    setEditLastName('');
  }

  async function saveEditing(staffId: string) {
    setSavingEdit(true);
    setError(null);
    try {
      await staffApi.update(eventId, staffId, {
        firstName: editFirstName.trim() || undefined,
        lastName: editLastName.trim() || undefined,
      });
      const st = await staffApi.list(eventId);
      setStaff(st);
      cancelEditing();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update staff member',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRemove(staffId: string) {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await staffApi.remove(eventId, staffId);
      setStaff((prev) => prev.filter((s) => s.staffId !== staffId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground">Loading...</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <Link
            href="/organizer/events"
            className="text-sm font-bold text-muted-foreground hover:text-primary"
          >
            &larr; My Events
          </Link>
          <h1 className="text-2xl font-extrabold mt-2">
            Staff — {event?.name}
          </h1>
        </div>
      </div>
      {eventId && <EventHubNav eventId={eventId} />}

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleInvite}
        className="bg-muted/30 p-4 rounded-lg border flex flex-col sm:flex-row gap-4 items-end mb-6"
      >
        <div className="flex-1 space-y-1">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="staff@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            placeholder="John"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={inviting || !email.trim()}>
          {inviting ? 'Inviting...' : 'Invite Staff'}
        </Button>
      </form>

      {staff.length === 0 ? (
        <p className="text-muted-foreground">No staff assigned yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Staff Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Assigned At</th>
                <th className="px-3 py-2 text-left text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {editingStaffId === s.staffId ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="First Name"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="h-8 text-xs"
                        />
                        <Input
                          placeholder="Last Name"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        {s.firstName || s.lastName
                          ? `${s.firstName || ''} ${s.lastName || ''}`.trim()
                          : `Staff ID: ${s.staffId}`}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">{s.email || 'N/A'}</td>
                  <td className="px-3 py-2">
                    {s.statusId === 1 ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Pending Setup</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 flex justify-end gap-2">
                    {editingStaffId === s.staffId ? (
                      <>
                        <Button
                          onClick={() => void saveEditing(s.staffId)}
                          variant="default"
                          size="sm"
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                          onClick={cancelEditing}
                          variant="outline"
                          size="sm"
                          disabled={savingEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => startEditing(s)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => void handleRemove(s.staffId)}
                          variant="destructive"
                          size="sm"
                        >
                          Remove
                        </Button>
                      </>
                    )}
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
