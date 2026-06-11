// Typed fetch client for the Nest.js backend.
//
// Auth model: the backend returns { token, refreshToken } in the response body
// (not httpOnly cookies), so tokens live in localStorage and every authed call
// is made client-side. On a 401 we transparently rotate the refresh token once
// and replay the original request. Concurrent 401s are single-flighted behind
// one in-flight refresh promise so we never spend a rotated refresh token twice.

import type { LoginResponse, User } from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const TOKEN_KEY = 'ets.token';
const REFRESH_KEY = 'ets.refreshToken';

export class ApiError extends Error {
  status: number;
  // Field-level validation errors from class-validator, when present.
  fields?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export const tokenStore = {
  get: () =>
    typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY),
  getRefresh: () =>
    typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY),
  set: (token: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// Single-flight refresh: all 401s queue behind one rotation.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${refreshToken}` },
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as {
        token: string;
        refreshToken: string;
      };
      tokenStore.set(data.token, data.refreshToken);
      return data.token;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Attach the bearer token. Defaults to true.
  auth?: boolean;
  // Internal: prevents infinite refresh recursion.
  _retried?: boolean;
  query?: Record<string, string | number | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let message = res.statusText || 'Request failed';
  let fields: Record<string, string> | undefined;
  try {
    const body = await res.json();
    if (body?.errors && typeof body.errors === 'object') {
      fields = body.errors;
      message =
        Object.values(body.errors as Record<string, string>)[0] ?? message;
    } else if (typeof body?.message === 'string') {
      message = body.message;
    }
  } catch {
    // non-JSON error body; keep status text
  }
  return new ApiError(res.status, message, fields);
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, query } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !opts._retried) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, { ...opts, _retried: true });
    }
  }

  if (!res.ok) throw await parseError(res);

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], auth = true) =>
    request<T>(path, { method: 'GET', query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: 'PATCH', body, auth }),
  delete: <T>(path: string, auth = true) =>
    request<T>(path, { method: 'DELETE', auth }),
};

export const fileApi = {
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = tokenStore.get();
    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
    const res = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`File upload failed: ${text}`);
    }
    const data = await res.json();
    return data as { file: { id: string; path: string } };
  },
};

// --- Auth endpoints ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/email/login', { email, password }, false),
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: number;
    companyName?: string;
    phoneNumber?: string;
  }) => api.post<void>('/auth/email/register', data, false),
  logout: () => api.post<void>('/auth/logout'),
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    photo?: { id: string; path: string } | null;
  }) => api.patch<User>('/auth/me', data),
  forgotPassword: (email: string) =>
    api.post<void>('/auth/forgot/password', { email }, false),
  resetPassword: (hash: string, password: string) =>
    api.post<void>('/auth/reset/password', { hash, password }, false),
};

// --- Booking endpoints ---
import type {
  Booking,
  CreateIntentResponse,
  Ticket,
  EventStaffAssignment,
  CheckInResult,
  CheckInLogEntry,
  WaitlistEntry,
} from './types';

export const bookingApi = {
  create: (
    items: { ticketTypeId: string; quantity: number }[],
    promoCode?: string,
  ) =>
    api.post<Booking>('/bookings', {
      items,
      ...(promoCode ? { promoCode } : {}),
    }),
  findMine: () => api.get<Booking[]>('/bookings/me'),
  findById: (id: string) => api.get<Booking>(`/bookings/${id}`),
  cancel: (id: string) => api.delete<void>(`/bookings/${id}`),
};

export const paymentApi = {
  createIntent: (bookingId: string) =>
    api.post<CreateIntentResponse>(`/payments/intent/${bookingId}`),
};

export const ticketApi = {
  findMine: () => api.get<Ticket[]>('/tickets/me'),
  findByBooking: (bookingId: string) =>
    api.get<Ticket[]>(`/tickets/booking/${bookingId}`),
  getDetails: (id: string) =>
    api.get<import('./types').TicketDetails>(`/tickets/${id}/details`),
  getQrBlob: async (code: string): Promise<string> => {
    const token = tokenStore.get();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/tickets/${code}/qr`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    );
    if (!res.ok) throw new Error('QR fetch failed');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

// --- Ticket Types endpoints ---
export const ticketTypeApi = {
  list: (eventId: string) =>
    api.get<import('./types').TicketType[]>(`/events/${eventId}/ticket-types`),
  create: (eventId: string, data: Partial<import('./types').TicketType>) =>
    api.post<import('./types').TicketType>(
      `/events/${eventId}/ticket-types`,
      data,
    ),
  update: (id: string, data: Partial<import('./types').TicketType>) =>
    api.patch<import('./types').TicketType>(`/ticket-types/${id}`, data),
  delete: (id: string) => api.delete<void>(`/ticket-types/${id}`),
};

// --- Staff management endpoints ---
export const staffApi = {
  list: (eventId: string) =>
    api.get<EventStaffAssignment[]>(`/events/${eventId}/staff`),
  assign: (eventId: string, staffId: string) =>
    api.post<EventStaffAssignment>(`/events/${eventId}/staff`, { staffId }),
  invite: (
    eventId: string,
    data: { email: string; firstName?: string; lastName?: string },
  ) => api.post<EventStaffAssignment>(`/events/${eventId}/staff/invite`, data),

  update: (
    eventId: string,
    staffId: string,
    data: { firstName?: string; lastName?: string },
  ) =>
    api.patch<EventStaffAssignment>(
      `/events/${eventId}/staff/${staffId}`,
      data,
    ),

  remove: (eventId: string, staffId: string) =>
    api.delete<void>(`/events/${eventId}/staff/${staffId}`),

  getMyAssignments: () => api.get<any[]>('/events/staff/assignments'),
  getAttendees: (eventId: string) => api.get<any[]>(`/tickets/events/${eventId}/attendees`),
  getTicketDetails: (ticketId: string) => api.get<any>(`/tickets/${ticketId}/details`),
  updateTicketStatus: (ticketId: string, status: string) => 
    api.patch(`/tickets/${ticketId}/status`, { status }),
};

// --- Waitlist endpoints ---
export const waitlistApi = {
  join: (ticketTypeId: string) =>
    api.post<WaitlistEntry>('/waitlist', { ticketTypeId }),
  leave: (entryId: string) => api.delete<void>(`/waitlist/${entryId}`),
  listMine: () => api.get<WaitlistEntry[]>('/waitlist/me'),
};

// --- Admin endpoints ---
import type { AdminStats, PromoCode, EventAnalytics } from './types';

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  getUsers: (page = 1, limit = 20) =>
    api.get<{ data: import('./types').User[]; hasNextPage: boolean }>(
      '/users',
      { page, limit },
    ),

  getPendingOrganizers: (page = 1, limit = 20) =>
    api.get<{ data: import('./types').User[]; hasNextPage: boolean }>(
      '/admin/organizers/pending',
      { page, limit },
    ),

  approveOrganizer: (id: number | string) =>
    api.post<import('./types').User>(`/users/${id}/approve`),

  rejectOrganizer: (id: number | string) =>
    api.post<import('./types').User>(`/users/${id}/reject`),

  lockUser: (id: number | string) =>
    api.post<import('./types').User>(`/users/${id}/lock`),

  unlockUser: (id: number | string) =>
    api.post<import('./types').User>(`/users/${id}/unlock`),

  getPromoCodes: (page = 1, limit = 20) =>
    api.get<{ data: PromoCode[]; hasNextPage: boolean }>('/promo-codes', {
      page,
      limit,
    }),

  getPromoCode: (id: string) => api.get<PromoCode>(`/promo-codes/${id}`),

  createPromoCode: (dto: {
    code: string;
    discountType: string;
    discountValue: number;
    maxUses: number;
    validFrom: string;
    validTo: string;
    isActive?: boolean;
  }) => api.post<PromoCode>('/promo-codes', dto),

  updatePromoCode: (
    id: string,
    dto: Partial<{ isActive: boolean; maxUses: number }>,
  ) => api.patch<PromoCode>(`/promo-codes/${id}`, dto),

  deletePromoCode: (id: string) => api.delete<void>(`/promo-codes/${id}`),

  getBookings: (query?: {
    page?: number;
    limit?: number;
    eventId?: string;
    status?: string;
    keyword?: string;
    organizerId?: string;
  }) =>
    api.get<{ data: import('./types').AdminBookingSummary[]; hasNextPage: boolean }>(
      '/admin/bookings',
      {
        page: query?.page ?? 1,
        limit: query?.limit ?? 20,
        eventId: query?.eventId || undefined,
        status: query?.status || undefined,
        keyword: query?.keyword || undefined,
        organizerId: query?.organizerId || undefined,
      },
    ),

  getTickets: (query?: {
    page?: number;
    limit?: number;
    eventId?: string;
    status?: string;
    keyword?: string;
    organizerId?: string;
  }) =>
    api.get<{ data: import('./types').AdminTicketSummary[]; hasNextPage: boolean }>(
      '/admin/tickets',
      {
        page: query?.page ?? 1,
        limit: query?.limit ?? 20,
        eventId: query?.eventId || undefined,
        status: query?.status || undefined,
        keyword: query?.keyword || undefined,
        organizerId: query?.organizerId || undefined,
      },
    ),

  getUser: (id: number | string) =>
    api.get<import('./types').User>(`/users/${id}`),
};

// --- Organizer endpoints ---
export const organizerApi = {
  getStats: () => api.get<import('./types').OrganizerStats>('/events/my/stats'),

  getEvents: (query?: import('./types').EventQuery) =>
    api.get<{
      data: import('./types').OrganizerEventSummary[];
      hasNextPage: boolean;
    }>('/events/my', {
      page: query?.page ?? 1,
      limit: query?.limit ?? 12,
      keyword: query?.keyword || undefined,
      category: query?.category || undefined,
      dateFrom: query?.dateFrom || undefined,
      dateTo: query?.dateTo || undefined,
      status: query?.status || undefined,
      sort: query?.sort || undefined,
    }),

  getAnalytics: (eventId: string) =>
    api.get<EventAnalytics>(`/events/${eventId}/analytics`),

  duplicateEvent: (eventId: string) =>
    api.post<import('./types').EventModel>(`/events/${eventId}/duplicate`),

  getAttendees: (eventId: string) =>
    api.get<import('./types').EventAttendee[]>(
      `/tickets/events/${eventId}/attendees`,
    ),

  getBookings: (query?: {
    page?: number;
    limit?: number;
    eventId?: string;
    status?: string;
  }) =>
    api.get<{
      data: import('./types').OrganizerBookingSummary[];
      hasNextPage: boolean;
    }>('/events/my/bookings', {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      eventId: query?.eventId || undefined,
      status: query?.status || undefined,
    }),

  getTickets: (query?: {
    page?: number;
    limit?: number;
    eventId?: string;
    status?: string;
    keyword?: string;
  }) =>
    api.get<{
      data: import('./types').OrganizerTicketSummary[];
      hasNextPage: boolean;
    }>('/events/my/tickets', {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      eventId: query?.eventId || undefined,
      status: query?.status || undefined,
      keyword: query?.keyword || undefined,
    }),

  createEvent: (data: Partial<import('./types').EventModel>) =>
    api.post<import('./types').EventModel>('/events', data),

  getEvent: (id: string) =>
    api.get<import('./types').EventModel>(`/events/${id}`),

  updateEvent: (id: string, data: Partial<import('./types').EventModel>) =>
    api.patch<import('./types').EventModel>(`/events/${id}`, data),

  updateEventStatus: (id: string, status: string) =>
    api.patch<import('./types').EventModel>(`/events/${id}/status`, { status }),

  deleteEvent: (id: string) => api.delete<void>(`/events/${id}`),

  getStaffUsers: () => api.get<import('./types').User[]>('/users/staff/list'),
};

// --- Check-in endpoints ---
export const checkInApi = {
  scan: (code: string, eventId: string, s: string) =>
    api.post<CheckInResult>('/checkin/scan', { code, eventId, s }),
  manual: (code: string, eventId: string) =>
    api.post<CheckInResult>('/checkin/manual', { code, eventId }),
  getLogs: (eventId: string) =>
    api.get<CheckInLogEntry[]>(`/checkin/logs/${eventId}`),
};
