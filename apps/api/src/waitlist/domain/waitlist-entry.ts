import { WaitlistStatusEnum } from '../waitlist-status.enum';

export class WaitlistEntry {
  id: string;
  userId: string;
  ticketTypeId: string;
  eventId: string;
  status: WaitlistStatusEnum;
  notifiedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
