'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { staffApi, organizerApi } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EventStaffAssignment, EventModel } from '@/lib/types';

export default function EventStaffPage() {
  const params = useParams();
  const eventId = params.id as string;
  
  const [staff, setStaff] = useState<EventStaffAssignment[]>([]);
  const [event, setEvent] = useState<EventModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStaffId, setNewStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (eventId) {
      Promise.all([
        organizerApi.getEvent(eventId),
        staffApi.list(eventId)
      ])
        .then(([ev, st]) => {
          setEvent(ev);
          setStaff(st);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to load staff');
        })
        .finally(() => setLoading(false));
    }
  }, [eventId]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!newStaffId.trim()) return;
    setAssigning(true);
    setError(null);
    try {
      const added = await staffApi.assign(eventId, newStaffId.trim());
      setStaff(prev => [...prev, added]);
      setNewStaffId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign staff');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(staffId: string) {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await staffApi.remove(eventId, staffId);
      setStaff(prev => prev.filter(s => s.staffId !== staffId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove');
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/organizer/events" className="text-sm text-muted-foreground hover:underline">
            &larr; Back to Events
          </Link>
          <h1 className="text-2xl font-bold mt-2">Manage Staff - {event?.name}</h1>
        </div>
      </div>

      {error && <div className="rounded-lg bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}

      <div className="bg-muted/30 p-4 rounded-lg border flex flex-col sm:flex-row gap-4 items-end mb-6">
        <div className="flex-1 space-y-1">
          <Label htmlFor="staffId">Assign new staff (User ID)</Label>
          <Input 
            id="staffId" 
            placeholder="Enter User ID of the staff member" 
            value={newStaffId}
            onChange={(e) => setNewStaffId(e.target.value)}
          />
        </div>
        <Button onClick={(e) => void handleAssign(e)} disabled={assigning || !newStaffId.trim()}>
          {assigning ? 'Assigning...' : 'Assign Staff'}
        </Button>
      </div>

      {staff.length === 0 ? (
        <p className="text-muted-foreground">No staff assigned yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Staff Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Assigned At</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">
                    {s.firstName || s.lastName ? `${s.firstName || ''} ${s.lastName || ''}`.trim() : `Staff ID: ${s.staffId}`}
                  </td>
                  <td className="px-3 py-2">{s.email || 'N/A'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(s.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      onClick={() => void handleRemove(s.staffId)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
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
