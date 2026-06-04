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
  createdAt: string;
  updatedAt: string;
}
