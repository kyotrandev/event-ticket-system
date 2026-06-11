'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, staffApi, checkInApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { RoleId } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Search, ScanLine, MapPin, CalendarDays, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { TicketDetailsSheet } from './TicketDetailsSheet';

export default function StaffEventDetailsPage() {
  const { eventId } = useParams() as { eventId: string };
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  const [pendingStatusChange, setPendingStatusChange] = useState<{ ticketId: string, newStatus: string, att: any } | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.id !== RoleId.Staff) {
      router.replace('/login');
      return;
    }

    Promise.all([
      api.get<any>(`/events/${eventId}`),
      staffApi.getAttendees(eventId),
    ])
      .then(([ev, atts]) => {
        setEvent(ev);
        setAttendees(atts || []);
      })
      .catch((err) => {
        console.error('Failed to load event details', err);
        toast.error('Could not load event details. Are you assigned to this event?');
        router.replace('/staff/dashboard');
      })
      .finally(() => setLoading(false));
  }, [user, authLoading, eventId, router]);

  const handleManualCheckIn = async (code: string) => {
    try {
      const result = await checkInApi.manual(code, eventId);
      if (result.status === 'VALID') {
        toast.success(`Check-in successful: ${result.attendeeName}`);
        // Optimistically update the local state
        setAttendees(prev => prev.map(a => 
          a.code === code ? { ...a, status: 'USED' } : a
        ));
      } else if (result.status === 'ALREADY_USED') {
        toast.error(`Ticket already used at ${new Date(result.originalScannedAt!).toLocaleTimeString()} by ${result.staffName}`);
      } else {
        toast.error('Invalid ticket code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await staffApi.updateTicketStatus(ticketId, newStatus);
      toast.success('Ticket status updated successfully');
      setAttendees(prev => prev.map(a => 
        a.id === ticketId ? { ...a, status: newStatus } : a
      ));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update ticket status');
    }
  };

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      const matchSearch = 
        a.customerName.toLowerCase().includes(search.toLowerCase()) ||
        a.customerEmail.toLowerCase().includes(search.toLowerCase()) ||
        a.code.toLowerCase().includes(search.toLowerCase());
        
      const matchStatus = statusFilter === 'ALL' || a.status?.toUpperCase() === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [attendees, search, statusFilter]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-muted-foreground">
        Loading event details...
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Back & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Link
          href="/staff/dashboard"
          className={buttonVariants({ variant: 'ghost', className: '-ml-4 text-muted-foreground hover:text-foreground' })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <Link
          href={`/checkin/${eventId}`}
          className={buttonVariants({ size: 'lg', className: 'rounded-xl shadow-lg w-full sm:w-auto font-bold gap-2' })}
        >
          <ScanLine className="h-5 w-5" />
          Open QR Scanner
        </Link>
      </div>

      {/* Event Info Card */}
      <Card className="overflow-hidden border-0 shadow-md ring-1 ring-border">
        {event.bannerUrl && (
          <div className="h-32 sm:h-48 w-full overflow-hidden bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={event.bannerUrl} 
              alt={event.name} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{event.name}</h1>
              <div className="flex flex-col gap-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span>
                    {new Date(event.startTime).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-2xl p-4 flex gap-6 text-center shrink-0 w-full md:w-auto justify-around">
              <div>
                <p className="text-3xl font-bold text-primary">{attendees.length}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Tickets</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">
                  {attendees.filter(a => a.status?.toUpperCase() === 'USED').length}
                </p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Checked In</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendees Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold tracking-tight">Tickets List</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search name, email, code..." 
                className="pl-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? '')}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl bg-muted/50 border-0">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ISSUED">Not Checked-in</SelectItem>
                <SelectItem value="USED">Checked-in</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Ticket Owner</TableHead>
                <TableHead>Ticket Type</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                    No attendees found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAttendees.map((att) => (
                  <TableRow 
                    key={att.id} 
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedTicketId(att.id)}
                  >
                    <TableCell>
                      <p className="font-medium">{att.customerName}</p>
                      <p className="text-xs text-muted-foreground">{att.customerEmail}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal rounded-md">
                        {att.ticketTypeName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(att.code);
                          toast.success('Ticket code copied to clipboard');
                        }}
                        className="group flex items-center gap-1.5 text-xs font-mono bg-muted px-2 py-1 rounded-md hover:bg-muted/80 hover:text-primary transition-colors cursor-pointer"
                        title="Click to copy full code"
                      >
                        {att.code.split('-')[0]}...
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select 
                        value={att.status?.toUpperCase()} 
                        onValueChange={(newStatus) => setPendingStatusChange({ ticketId: att.id, newStatus, att })}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0 [&>svg]:opacity-50">
                          <SelectValue>
                            {att.status?.toUpperCase() === 'USED' ? (
                              <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-0 flex w-fit gap-1 pr-3 shadow-none">
                                <CheckCircle2 className="w-3 h-3" />
                                Checked In
                              </Badge>
                            ) : att.status?.toUpperCase() === 'ISSUED' ? (
                              <Badge variant="outline" className="text-muted-foreground shadow-none">
                                Not scanned
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="shadow-none">Cancelled</Badge>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ISSUED">Not scanned</SelectItem>
                          <SelectItem value="USED">Checked In</SelectItem>
                          <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {att.status?.toUpperCase() === 'ISSUED' && (
                        <AlertDialog>
                          <AlertDialogTrigger 
                            className={buttonVariants({ size: 'sm', className: 'h-8 rounded-lg font-medium text-xs' })}
                          >
                            Manual Check-in
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Manual Check-in</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to manually check-in {att.customerName} for ticket {att.ticketTypeName}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleManualCheckIn(att.code)}>
                                Confirm Check-in
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {att.status?.toUpperCase() === 'USED' && (
                        <span className="text-xs text-muted-foreground font-medium mr-2">Done</span>
                      )}
                    </TableCell>

                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of <strong>{pendingStatusChange?.att.ticketTypeName}</strong> ticket for <strong>{pendingStatusChange?.att.customerName}</strong> to <strong>{pendingStatusChange?.newStatus}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingStatusChange) {
                handleStatusChange(pendingStatusChange.ticketId, pendingStatusChange.newStatus.toLowerCase());
                setPendingStatusChange(null);
              }
            }}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TicketDetailsSheet 
        ticketId={selectedTicketId} 
        onClose={() => setSelectedTicketId(null)}
        onStatusChange={(ticketId, newStatus) => {
          setAttendees(prev => prev.map(a => 
            a.id === ticketId ? { ...a, status: newStatus } : a
          ));
        }}
      />
    </div>
  );
}
