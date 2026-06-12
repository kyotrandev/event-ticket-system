import { useEffect, useState } from 'react';
import { staffApi } from '@/lib/api';
import type { TicketDetails } from '@/lib/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Ticket, Smartphone, FileText, User } from 'lucide-react';
import { toast } from 'sonner';

interface TicketDetailsSheetProps {
  ticketId: string | null;
  onClose: () => void;
  onStatusChange: (ticketId: string, newStatus: string) => void;
}

export function TicketDetailsSheet({ ticketId, onClose, onStatusChange }: TicketDetailsSheetProps) {
  const [details, setDetails] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticketId) {
      setDetails(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    staffApi.getTicketDetails(ticketId)
      .then(data => {
        if (mounted) setDetails(data);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load ticket details');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [ticketId]);

  return (
    <Sheet open={!!ticketId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto border-l-0 shadow-2xl sm:rounded-l-2xl">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-2xl font-bold flex justify-between items-center pr-6">
            Ticket Info
            {details?.status && (
              <Badge variant={details.status.toUpperCase() === 'USED' ? 'default' : details.status.toUpperCase() === 'ISSUED' ? 'outline' : 'destructive'} 
                className={`shadow-none px-3 py-1 ${details.status.toUpperCase() === 'USED' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}>
                {details.status.toUpperCase()}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-sm">
            Detailed booking and validation records.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 animate-pulse">
            <Ticket className="w-8 h-8 text-muted/50" />
            <p className="text-muted-foreground text-sm">Fetching data...</p>
          </div>
        ) : !details ? (
          <div className="py-12 text-center text-muted-foreground text-sm">No ticket selected</div>
        ) : (
          <div className="space-y-8 pb-10">
            
            {/* Customer Section */}
            <section className="space-y-4">
              <h3 className="font-semibold text-xs tracking-widest text-muted-foreground uppercase">
                Customer Information
              </h3>
              <div className="bg-muted/30 rounded-2xl p-5 space-y-4 text-sm border border-border/50">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-right">
                    {details.customer ? `${details.customer.firstName || ''} ${details.customer.lastName || ''}`.trim() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-right">{details.customer?.email || 'N/A'}</span>
                </div>
                {details.customer?.phoneNumber && (
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium text-right">{details.customer.phoneNumber}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Ticket Section */}
            <section className="space-y-4">
              <h3 className="font-semibold text-xs tracking-widest text-muted-foreground uppercase">
                Ticket Details
              </h3>
              <div className="bg-muted/30 rounded-2xl p-5 space-y-4 text-sm border border-border/50">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Code</span>
                  <code className="text-xs font-mono bg-background px-2 py-1 rounded border shadow-sm select-all">
                    {details.code}
                  </code>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-right">
                    {details.ticketType?.name || 'Unknown'} 
                    <span className="text-muted-foreground ml-1 font-normal">
                      ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(details.ticketType?.price || 0)})
                    </span>
                  </span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-muted-foreground">Purchased</span>
                  <span className="font-medium text-right">
                    {new Date(details.booking?.createdAt || details.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </section>

            {/* Check-in Log (Only shown if status is USED) */}
            {details.checkIn && details.status.toUpperCase() === 'USED' && (
              <section className="space-y-4">
                <h3 className="font-semibold text-xs tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Validation Log
                </h3>
                <div className="bg-green-50/50 rounded-2xl p-5 space-y-4 text-sm border border-green-100 dark:bg-green-950/20 dark:border-green-900/50">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Scanned At</span>
                    <span className="font-medium text-right text-green-800 dark:text-green-300">
                      {new Date(details.checkIn.scannedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Staff Member</span>
                    <span className="font-medium text-right flex items-center gap-1.5 text-green-800 dark:text-green-300">
                      <User className="w-3.5 h-3.5 opacity-70" />
                      {details.checkIn.staff ? `${details.checkIn.staff.firstName || ''} ${details.checkIn.staff.lastName || ''}`.trim() : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium text-right flex items-center gap-1.5 capitalize text-green-800 dark:text-green-300">
                      {details.checkIn.method === 'qr' ? <Smartphone className="w-3.5 h-3.5 opacity-70" /> : <FileText className="w-3.5 h-3.5 opacity-70" />}
                      {details.checkIn.method} App
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Administration / Status Control */}
            <section className="space-y-4 pt-6 mt-6 border-t border-dashed">
              <h3 className="font-semibold text-xs tracking-widest text-muted-foreground uppercase">
                Administration
              </h3>
              <div className="space-y-2">
                <Select 
                  value={details.status.toUpperCase()} 
                  onValueChange={(val) => {
                    if (!val) return;
                    setDetails({ ...details, status: val.toLowerCase() as any });
                    onStatusChange(details.id, val.toLowerCase());
                  }}
                >
                  <SelectTrigger className="w-full h-12 rounded-xl bg-background border-border/50 font-medium">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ISSUED">Reset to Not Scanned</SelectItem>
                    <SelectItem value="USED">Force Check In</SelectItem>
                    <SelectItem value="CANCELLED">Cancel Ticket</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground leading-relaxed px-1 mt-3">
                  Changing a status to{' '}
                  <span className="font-medium text-foreground">
                    &ldquo;Reset to Not Scanned&rdquo;
                  </span>{' '}
                  will clear its current validation and allow the ticket to be scanned again at the gate.
                </p>
              </div>
            </section>

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
