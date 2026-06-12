// Shared API types mirroring the Nest.js backend domain models.

export enum RoleId {
  Admin = 1,
  Customer = 2,
  Organizer = 3,
  Staff = 4,
}

export enum StatusId {
  Active = 1,
  Inactive = 2,
  PendingApproval = 3,
  Locked = 4,
}

export interface Role {
  id: number;
  name?: string;
}

export interface Status {
  id: number;
  name?: string;
}

export interface User {
  id: number | string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  companyName?: string | null;
  phoneNumber?: string | null;
  provider?: string;
  photo?: { id: string; path: string } | null;
  role?: Role | null;
  status?: Status | null;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  tokenExpires: number;
  user: User;
}

// Backend serializes enum *values*, which are lowercase.
export type EventStatus =
  | 'draft'
  | 'published'
  | 'ongoing'
  | 'ended'
  | 'cancelled';

export interface EventModel {
  id: string;
  organizerId: string;
  name: string;
  description: string | null;
  location: string;
  category: string;
  tags: string[] | null;
  startTime: string;
  endTime: string;
  bannerUrl: string | null;
  cancellationWindowHours: number;
  maxTicketsPerOrder: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type TicketTypeStatus = 'available' | 'upcoming' | 'sold_out' | 'closed';

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  totalQty: number;
  soldQty: number;
  reservedQty: number;
  saleStart: string;
  saleEnd: string;
  status: TicketTypeStatus;
  event?: EventModel;
  createdAt: string;
  updatedAt: string;
}

// The backend uses infinity pagination: { data, hasNextPage }.
export interface Paginated<T> {
  data: T[];
  hasNextPage: boolean;
}

export interface EventQuery {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  status?: EventStatus | '';
  sort?: 'createdAt' | 'startTime' | 'revenue' | 'sold' | 'name';
}

export interface OrganizerStats {
  totalEvents: number;
  liveNow: number;
  totalRevenue: number;
  totalTicketsSold: number;
  draftCount: number;
  upcomingCount: number;
}

export interface OrganizerEventSummary extends EventModel {
  ticketsSold: number;
  totalCapacity: number;
  revenue: number;
  checkInRate: number;
  ticketTypeCount: number;
  staffCount: number;
}

export interface OrganizerBookingSummary {
  id: string;
  customerId: string;
  status: BookingStatus;
  totalAmount: number;
  ticketCount: number;
  createdAt: string;
  eventId: string;
  eventName: string;
  customerName: string;
  customerEmail: string;
}

export interface OrganizerTicketSummary {
  id: string;
  code: string;
  status: TicketStatus;
  createdAt: string;
  eventId: string;
  eventName: string;
  ticketTypeName: string | null;
  customerName: string;
  customerEmail: string;
  bookingId: string | null;
}

export interface AdminBookingSummary extends OrganizerBookingSummary {
  organizerName: string;
  organizerEmail: string;
}

export interface AdminTicketSummary extends OrganizerTicketSummary {
  organizerName: string;
  organizerEmail: string;
}

export interface AdminEventSummary extends OrganizerEventSummary {
  organizerName: string;
  organizerEmail: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: string;
  code: string;
  status: TicketStatus;
  createdAt: string;
  ticketTypeName?: string;
  customerName: string;
  customerEmail: string;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  ticketTypeId: string;
  ticketType?: TicketType;
  quantity: number;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | 'pending_payment'
  | 'paid'
  | 'expired'
  | 'failed'
  | 'refunded';

export interface Booking {
  id: string;
  customerId: string;
  status: BookingStatus;
  expiresAt: string;
  promoCodeId: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  items?: BookingItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntentResponse {
  clientSecret: string | null;
  paymentId: string;
  status: 'requires_payment' | 'paid';
}

export type TicketStatus = 'issued' | 'used' | 'cancelled';

export interface Ticket {
  id: string;
  bookingItemId: string;
  eventId: string;
  customerId: string;
  code: string;
  status: TicketStatus;
  bookingItem?: BookingItem;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetails {
  id: string;
  code: string;
  status: TicketStatus;
  createdAt: string;
  ticketType?: TicketType;
  event?: {
    id: string;
    name: string;
    startTime: string;
    endTime?: string;
    location?: string;
    bannerUrl?: string | null;
  };
  booking?: {
    id: string;
    createdAt: string;
  };
  customer?: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber?: string | null;
  } | null;
  checkIn?: {
    scannedAt: string;
    method: string;
    staff?: {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
    } | null;
  } | null;
}

// Phase 4 — Check-In

export interface EventStaffAssignment {
  id: string;
  eventId: string;
  staffId: string;
  assignedAt: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  statusId?: number | null;
}

export interface StaffEventSummary {
  id: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  bannerImage: string | null;
}

export interface StaffAssignmentWithEvent extends EventStaffAssignment {
  event: StaffEventSummary | null;
}

export type CheckInStatus = 'VALID' | 'ALREADY_USED' | 'INVALID' | 'NOT_FOUND';

export interface CheckInResult {
  status: CheckInStatus;
  attendeeName?: string;
  ticketTypeName?: string;
  ticketCode?: string;
  originalScannedAt?: string;
  staffName?: string;
}

export type CheckInMethod = 'qr' | 'manual';

export interface CheckInLogEntry {
  ticketCode: string;
  attendeeName: string;
  ticketTypeName: string;
  scannedAt: string;
  method: CheckInMethod;
  staffName: string;
}

// Phase 6 — Analytics & Admin

export interface TicketTypeStat {
  ticketTypeId: string;
  name: string;
  sold: number;
  revenue: number;
}

export interface DailyBookingStat {
  date: string;
  bookings: number;
  revenue: number;
}

export interface TopPromoCode {
  code: string;
  usageCount: number;
  totalDiscount: number;
}

export interface EventAnalytics {
  ticketTypeStats: TicketTypeStat[];
  totalRevenue: number;
  checkInRate: number;
  dailyBookings: DailyBookingStat[];
  topPromoCodes: TopPromoCode[];
}

export interface AdminDailyStat {
  date: string;
  bookings: number;
  revenue: number;
}

export interface AdminStats {
  users: {
    admin: number;
    customer: number;
    organizer: number;
    staff: number;
    total: number;
  };
  events: {
    draft: number;
    published: number;
    ongoing: number;
    ended: number;
    cancelled: number;
  };
  bookings: {
    pendingPayment: number;
    paid: number;
    expired: number;
    failed: number;
    refunded: number;
  };
  totalGrossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  pendingOrganizers: number;
  totalTicketsSold: number;
  liveEvents: number;
  dailyStats: AdminDailyStat[];
}

export type PromoDiscountType = 'percent' | 'fixed';

export interface PromoCode {
  id: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Phase 5 — Waitlist

export type WaitlistStatus = 'waiting' | 'notified' | 'fulfilled' | 'expired';

export interface WaitlistEntry {
  id: string;
  userId: string;
  ticketTypeId: string;
  eventId: string;
  status: WaitlistStatus;
  notifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}
