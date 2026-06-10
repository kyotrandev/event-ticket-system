import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

import { RoleEnum } from '../../../../roles/roles.enum';
import { StatusEnum } from '../../../../statuses/statuses.enum';
import { EventStatusEnum } from '../../../../events/event-status.enum';
import { TicketTypeStatusEnum } from '../../../../ticket-types/ticket-type-status.enum';
import { BookingStatusEnum } from '../../../../bookings/booking-status.enum';
import { PaymentStatusEnum } from '../../../../payments/payment-status.enum';
import { TicketStatusEnum } from '../../../../tickets/ticket-status.enum';
import { PromoCodeDiscountTypeEnum } from '../../../../promo-codes/promo-code-discount-type.enum';
import { CheckInMethodEnum } from '../../../../check-in/check-in-method.enum';
import { WaitlistStatusEnum } from '../../../../waitlist/waitlist-status.enum';

import { EventEntity } from '../../../../events/infrastructure/persistence/relational/entities/event.entity';
import { TicketTypeEntity } from '../../../../ticket-types/infrastructure/persistence/relational/entities/ticket-type.entity';
import { UserEntity } from '../../../../users/infrastructure/persistence/relational/entities/user.entity';
import { BookingEntity } from '../../../../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { BookingItemEntity } from '../../../../booking-items/infrastructure/persistence/relational/entities/booking-item.entity';
import { PaymentEntity } from '../../../../payments/infrastructure/persistence/relational/entities/payment.entity';
import { TicketEntity } from '../../../../tickets/infrastructure/persistence/relational/entities/ticket.entity';
import { CheckInLogEntity } from '../../../../check-in/infrastructure/persistence/relational/entities/check-in-log.entity';
import { PromoCodeEntity } from '../../../../promo-codes/infrastructure/persistence/relational/entities/promo-code.entity';
import { WaitlistEntryEntity } from '../../../../waitlist/infrastructure/persistence/relational/entities/waitlist-entry.entity';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

// Sentinel promo code: if it exists, demo data is already seeded. This seed
// runs on every API startup, so the gate must be the first thing checked.
const SENTINEL_CODE = 'SUMMER25';

/**
 * Deterministic PRNG (mulberry32) so reseeds against a fresh DB produce the
 * same demo dataset — stable screenshots, stable analytics.
 */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DemoTicketType {
  name: string;
  price: number;
  totalQty: number;
}

interface DemoEvent {
  name: string;
  description: string;
  location: string;
  category: string;
  tags: string[];
  startDaysFromNow: number; // negative = past
  durationHours: number;
  bannerUrl: string;
  status: EventStatusEnum;
  ticketTypes: DemoTicketType[];
  sellable: boolean; // generate bookings against this event?
}

const DEMO_EVENTS: DemoEvent[] = [
  {
    name: 'Indie Film Festival 2026',
    description:
      'Three nights of award-winning independent cinema, director Q&As and a closing-night gala.',
    location: 'Idecaf Theatre, District 1, HCMC',
    category: 'Film',
    tags: ['film', 'festival', 'culture'],
    startDaysFromNow: -55,
    durationHours: 6,
    bannerUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80',
    status: EventStatusEnum.ENDED,
    sellable: true,
    ticketTypes: [
      { name: 'Single Night', price: 200000, totalQty: 300 },
      { name: 'Festival Pass', price: 500000, totalQty: 150 },
    ],
  },
  {
    name: 'Saigon Street Food Carnival',
    description:
      'A weekend celebration of Vietnamese street food with 60+ vendors, live music and cooking demos.',
    location: 'Le Van Tam Park, HCMC',
    category: 'Food & Drink',
    tags: ['food', 'carnival', 'family'],
    startDaysFromNow: -35,
    durationHours: 10,
    bannerUrl:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80',
    status: EventStatusEnum.ENDED,
    sellable: true,
    ticketTypes: [
      { name: 'Day Pass', price: 120000, totalQty: 800 },
      { name: 'Tasting Bundle', price: 350000, totalQty: 200 },
    ],
  },
  {
    name: 'Startup Pitch Night Q2',
    description:
      'Ten early-stage startups pitch to a panel of VCs. Networking drinks after the show.',
    location: 'Dreamplex, District 1, HCMC',
    category: 'Business',
    tags: ['startup', 'networking', 'business'],
    startDaysFromNow: -18,
    durationHours: 4,
    bannerUrl:
      'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80',
    status: EventStatusEnum.ENDED,
    sellable: true,
    ticketTypes: [
      { name: 'General', price: 180000, totalQty: 250 },
      { name: 'Investor', price: 0, totalQty: 50 },
    ],
  },
  {
    name: 'Jazz in the Garden',
    description:
      'An intimate open-air jazz evening with a rotating lineup of local quartets.',
    location: 'Saigon Botanical Garden, HCMC',
    category: 'Music',
    tags: ['music', 'jazz', 'outdoor'],
    startDaysFromNow: -1,
    durationHours: 4,
    bannerUrl:
      'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&q=80',
    status: EventStatusEnum.ONGOING,
    sellable: true,
    ticketTypes: [
      { name: 'Lawn Seating', price: 250000, totalQty: 400 },
      { name: 'Front Table', price: 600000, totalQty: 80 },
    ],
  },
  {
    name: 'HCMC Marathon 2026',
    description:
      'Full, half and 10K routes through the heart of the city. Chip timing and finisher medals.',
    location: 'Nguyen Hue Walking Street, HCMC',
    category: 'Sports',
    tags: ['sports', 'running', 'marathon'],
    startDaysFromNow: 21,
    durationHours: 6,
    bannerUrl:
      'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1200&q=80',
    status: EventStatusEnum.PUBLISHED,
    sellable: true,
    ticketTypes: [
      { name: '10K', price: 300000, totalQty: 1000 },
      { name: 'Half Marathon', price: 450000, totalQty: 600 },
      { name: 'Full Marathon', price: 650000, totalQty: 400 },
    ],
  },
  {
    name: 'Future of AI Summit',
    description:
      'A full-day summit on applied machine learning, LLM products and responsible AI.',
    location: 'Lotte Hotel Saigon, HCMC',
    category: 'Technology',
    tags: ['tech', 'ai', 'conference'],
    startDaysFromNow: 48,
    durationHours: 9,
    bannerUrl:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    status: EventStatusEnum.DRAFT,
    sellable: false,
    ticketTypes: [
      { name: 'Standard', price: 700000, totalQty: 400 },
      { name: 'Workshop Add-on', price: 300000, totalQty: 120 },
    ],
  },
  {
    name: 'Open-Air Cinema: Cancelled Screening',
    description:
      'A rooftop movie night that was cancelled due to weather — kept for refund-flow demonstration.',
    location: 'Rooftop, Bitexco Tower, HCMC',
    category: 'Film',
    tags: ['film', 'outdoor'],
    startDaysFromNow: -8,
    durationHours: 3,
    bannerUrl:
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=80',
    status: EventStatusEnum.CANCELLED,
    sellable: true,
    ticketTypes: [{ name: 'Admission', price: 160000, totalQty: 300 }],
  },
];

interface DemoPromo {
  code: string;
  discountType: PromoCodeDiscountTypeEnum;
  discountValue: number;
  maxUses: number;
}

const DEMO_PROMOS: DemoPromo[] = [
  // SENTINEL_CODE must be first.
  {
    code: SENTINEL_CODE,
    discountType: PromoCodeDiscountTypeEnum.PERCENT,
    discountValue: 25,
    maxUses: 200,
  },
  {
    code: 'WELCOME10',
    discountType: PromoCodeDiscountTypeEnum.PERCENT,
    discountValue: 10,
    maxUses: 500,
  },
  {
    code: 'VIP15',
    discountType: PromoCodeDiscountTypeEnum.PERCENT,
    discountValue: 15,
    maxUses: 150,
  },
  {
    code: 'FLAT50K',
    discountType: PromoCodeDiscountTypeEnum.FIXED,
    discountValue: 50000,
    maxUses: 300,
  },
  {
    code: 'EARLYBIRD',
    discountType: PromoCodeDiscountTypeEnum.FIXED,
    discountValue: 100000,
    maxUses: 100,
  },
];

@Injectable()
export class DemoSeedService {
  private readonly qrSecret =
    process.env.TICKET_QR_SECRET ??
    process.env.AUTH_JWT_SECRET ??
    'dev_ticket_qr_secret';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepo: Repository<EventEntity>,
    @InjectRepository(TicketTypeEntity)
    private readonly ticketTypeRepo: Repository<TicketTypeEntity>,
    @InjectRepository(BookingEntity)
    private readonly bookingRepo: Repository<BookingEntity>,
    @InjectRepository(BookingItemEntity)
    private readonly bookingItemRepo: Repository<BookingItemEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepo: Repository<PaymentEntity>,
    @InjectRepository(TicketEntity)
    private readonly ticketRepo: Repository<TicketEntity>,
    @InjectRepository(CheckInLogEntity)
    private readonly checkInRepo: Repository<CheckInLogEntity>,
    @InjectRepository(PromoCodeEntity)
    private readonly promoRepo: Repository<PromoCodeEntity>,
    @InjectRepository(WaitlistEntryEntity)
    private readonly waitlistRepo: Repository<WaitlistEntryEntity>,
  ) {}

  private computeQrSecret(code: string, eventId: string): string {
    return createHmac('sha256', this.qrSecret)
      .update(`${code}${eventId}`)
      .digest('hex');
  }

  async run() {
    // --- Idempotency gate (runs on every startup) -------------------------
    const existing = await this.promoRepo.findOne({
      where: { code: SENTINEL_CODE },
    });
    if (existing) return;

    const organizer = await this.userRepo.findOne({
      where: { role: { id: RoleEnum.organizer } },
    });
    const staff = await this.userRepo.find({
      where: { role: { id: RoleEnum.staff } },
    });
    if (!organizer || staff.length === 0) return;

    const now = Date.now();
    const rng = makeRng(20260610);
    const randInt = (min: number, max: number) =>
      Math.floor(rng() * (max - min + 1)) + min;
    const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
    const chance = (p: number) => rng() < p;

    // --- Promo codes ------------------------------------------------------
    const promos: PromoCodeEntity[] = [];
    for (const p of DEMO_PROMOS) {
      promos.push(
        await this.promoRepo.save(
          this.promoRepo.create({
            code: p.code,
            discountType: p.discountType,
            discountValue: p.discountValue,
            maxUses: p.maxUses,
            usedCount: 0,
            validFrom: new Date(now - 90 * DAY),
            validTo: new Date(now + 30 * DAY),
            isActive: true,
          }),
        ),
      );
    }

    // --- Data-only customers (not used for login; no isEmailVerified touch).
    // Existing john.doe (customer) is also included so the demo login has
    // real booking history.
    const customerIds: string[] = [];
    const johnDoe = await this.userRepo.findOne({
      where: { email: 'john.doe@example.com' },
    });
    if (johnDoe) customerIds.push(String(johnDoe.id));

    const customerNames = [
      ['Linh', 'Nguyen'],
      ['Minh', 'Tran'],
      ['Trang', 'Le'],
      ['Hieu', 'Pham'],
      ['Mai', 'Vo'],
      ['Duc', 'Hoang'],
      ['Thao', 'Dang'],
    ];
    const salt = await bcrypt.genSalt();
    const demoPassword = await bcrypt.hash('secret', salt);
    for (let i = 0; i < customerNames.length; i++) {
      const email = `customer${i + 1}@demo.example.com`;
      let user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        user = await this.userRepo.save(
          this.userRepo.create({
            firstName: customerNames[i][0],
            lastName: customerNames[i][1],
            email,
            password: demoPassword,
            role: { id: RoleEnum.customer, name: 'Customer' },
            status: { id: StatusEnum.active, name: 'Active' },
          }),
        );
      }
      customerIds.push(String(user.id));
    }

    // --- Events + ticket types -------------------------------------------
    interface LiveTicketType {
      entity: TicketTypeEntity;
      sold: number; // tickets to add to soldQty
    }
    interface LiveEvent {
      entity: EventEntity;
      ticketTypes: LiveTicketType[];
      ended: boolean;
    }
    const liveEvents: LiveEvent[] = [];

    for (const de of DEMO_EVENTS) {
      const startTime = new Date(now + de.startDaysFromNow * DAY);
      const endTime = new Date(startTime.getTime() + de.durationHours * HOUR);
      const event = await this.eventRepo.save(
        this.eventRepo.create({
          organizerId: String(organizer.id),
          name: de.name,
          description: de.description,
          location: de.location,
          category: de.category,
          tags: de.tags,
          startTime,
          endTime,
          bannerUrl: de.bannerUrl,
          status: de.status,
        }),
      );

      const lts: LiveTicketType[] = [];
      for (const tt of de.ticketTypes) {
        const ttStatus =
          de.status === EventStatusEnum.ENDED ||
          de.status === EventStatusEnum.CANCELLED
            ? TicketTypeStatusEnum.CLOSED
            : TicketTypeStatusEnum.AVAILABLE;
        const entity = await this.ticketTypeRepo.save(
          this.ticketTypeRepo.create({
            eventId: event.id,
            name: tt.name,
            price: tt.price,
            totalQty: tt.totalQty,
            soldQty: 0,
            reservedQty: 0,
            saleStart: new Date(startTime.getTime() - 60 * DAY),
            saleEnd: startTime,
            status: ttStatus,
          }),
        );
        lts.push({ entity, sold: 0 });
      }

      if (de.sellable) {
        liveEvents.push({
          entity: event,
          ticketTypes: lts,
          ended:
            de.status === EventStatusEnum.ENDED ||
            de.status === EventStatusEnum.ONGOING,
        });
      }
    }

    // Also let bookings target the pre-existing published events (owned by the
    // same organizer) so their analytics pages aren't empty.
    const existingEvents = await this.eventRepo.find({
      where: {
        organizerId: String(organizer.id),
        status: EventStatusEnum.PUBLISHED,
      },
    });
    for (const ev of existingEvents) {
      if (liveEvents.some((le) => le.entity.id === ev.id)) continue;
      const tts = await this.ticketTypeRepo.find({
        where: { eventId: ev.id },
      });
      if (tts.length === 0) continue;
      liveEvents.push({
        entity: ev,
        ticketTypes: tts.map((t) => ({ entity: t, sold: 0 })),
        ended: false,
      });
    }

    if (liveEvents.length === 0) return;

    // Reserve one sold-out ticket type for the waitlist demo.
    const soldOutTarget = liveEvents
      .flatMap((le) => le.ticketTypes)
      .find((lt) => lt.entity.price > 0);

    // --- Bookings ---------------------------------------------------------
    // Status mix: mostly PAID, a slice REFUNDED, plus a few unsuccessful ones
    // so the admin dashboard shows every booking status.
    const PAID_COUNT = 150;
    const REFUNDED_COUNT = 22;
    const EXPIRED_COUNT = 9;
    const PENDING_COUNT = 6;
    const FAILED_COUNT = 4;

    const plan: BookingStatusEnum[] = [
      ...Array<BookingStatusEnum>(PAID_COUNT).fill(BookingStatusEnum.PAID),
      ...Array<BookingStatusEnum>(REFUNDED_COUNT).fill(
        BookingStatusEnum.REFUNDED,
      ),
      ...Array<BookingStatusEnum>(EXPIRED_COUNT).fill(
        BookingStatusEnum.EXPIRED,
      ),
      ...Array<BookingStatusEnum>(PENDING_COUNT).fill(
        BookingStatusEnum.PENDING_PAYMENT,
      ),
      ...Array<BookingStatusEnum>(FAILED_COUNT).fill(BookingStatusEnum.FAILED),
    ];

    const createdAtUpdates: Array<{ id: string; date: Date }> = [];

    for (const status of plan) {
      const le = pick(liveEvents);
      const start = le.entity.startTime.getTime();

      // Booking created before the event happened, within the last 90 days.
      let earliest: number;
      let latest: number;
      if (start <= now) {
        latest = Math.min(start, now) - 1 * HOUR;
        earliest = Math.max(now - 90 * DAY, start - 45 * DAY);
      } else {
        latest = now - 1 * HOUR;
        earliest = now - 90 * DAY;
      }
      if (earliest >= latest) earliest = latest - 1 * DAY;
      const createdAt = new Date(earliest + rng() * (latest - earliest));

      // 1–2 ticket types from THIS event only.
      const tts = le.ticketTypes;
      const itemCount = tts.length > 1 && chance(0.35) ? 2 : 1;
      const chosen: LiveTicketType[] = [];
      const pool = [...tts];
      for (let i = 0; i < itemCount && pool.length > 0; i++) {
        const idx = Math.floor(rng() * pool.length);
        chosen.push(pool.splice(idx, 1)[0]);
      }

      let subtotal = 0;
      const itemSpecs: Array<{ lt: LiveTicketType; qty: number }> = [];
      let remaining = 6; // event.maxTicketsPerOrder default
      for (const lt of chosen) {
        const qty = Math.min(randInt(1, 3), remaining);
        if (qty <= 0) continue;
        remaining -= qty;
        subtotal += qty * lt.entity.price;
        itemSpecs.push({ lt, qty });
      }
      if (itemSpecs.length === 0) continue;

      // Promo on ~30% of paid/refunded bookings (skip if it would be free).
      let discount = 0;
      let promoId: string | null = null;
      if (
        subtotal > 0 &&
        (status === BookingStatusEnum.PAID ||
          status === BookingStatusEnum.REFUNDED) &&
        chance(0.3)
      ) {
        const promo = pick(promos);
        discount =
          promo.discountType === PromoCodeDiscountTypeEnum.PERCENT
            ? Math.round((subtotal * promo.discountValue) / 100)
            : Math.min(promo.discountValue, subtotal);
        promoId = promo.id;
        promo.usedCount += 1;
      }
      const total = Math.max(subtotal - discount, 0);

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: pick(customerIds),
          status,
          expiresAt: new Date(createdAt.getTime() + 15 * MIN),
          promoCodeId: promoId ?? undefined,
          subtotalAmount: subtotal,
          discountAmount: discount,
          totalAmount: total,
        }),
      );
      createdAtUpdates.push({ id: booking.id, date: createdAt });

      const savedItems: Array<{ item: BookingItemEntity; lt: LiveTicketType }> =
        [];
      for (const spec of itemSpecs) {
        const item = await this.bookingItemRepo.save(
          this.bookingItemRepo.create({
            bookingId: booking.id,
            ticketTypeId: spec.lt.entity.id,
            quantity: spec.qty,
            unitPrice: spec.lt.entity.price,
          }),
        );
        savedItems.push({ item, lt: spec.lt });
      }

      // Payment row.
      if (status === BookingStatusEnum.PAID) {
        await this.paymentRepo.save(
          this.paymentRepo.create({
            bookingId: booking.id,
            stripePaymentIntentId: `pi_demo_${booking.id.slice(0, 18)}`,
            amount: total,
            currency: 'vnd',
            status: PaymentStatusEnum.SUCCEEDED,
          }),
        );
      } else if (status === BookingStatusEnum.REFUNDED) {
        await this.paymentRepo.save(
          this.paymentRepo.create({
            bookingId: booking.id,
            stripePaymentIntentId: `pi_demo_${booking.id.slice(0, 18)}`,
            amount: total,
            currency: 'vnd',
            status: PaymentStatusEnum.REFUNDED,
            refundedAt: new Date(createdAt.getTime() + 2 * DAY),
          }),
        );
      } else if (status === BookingStatusEnum.FAILED) {
        await this.paymentRepo.save(
          this.paymentRepo.create({
            bookingId: booking.id,
            stripePaymentIntentId: `pi_demo_${booking.id.slice(0, 18)}`,
            amount: total,
            currency: 'vnd',
            status: PaymentStatusEnum.FAILED,
          }),
        );
      }
      // EXPIRED / PENDING_PAYMENT: no payment row.

      // Tickets: PAID -> issued/used; REFUNDED -> cancelled. Others -> none.
      if (
        status === BookingStatusEnum.PAID ||
        status === BookingStatusEnum.REFUNDED
      ) {
        for (const { item, lt } of savedItems) {
          if (status === BookingStatusEnum.PAID) {
            lt.sold += item.quantity; // count toward soldQty
          }
          for (let t = 0; t < item.quantity; t++) {
            const code = randomUUID();
            let ticketStatus: TicketStatusEnum;
            if (status === BookingStatusEnum.REFUNDED) {
              ticketStatus = TicketStatusEnum.CANCELLED;
            } else if (le.ended && chance(0.82)) {
              ticketStatus = TicketStatusEnum.USED;
            } else {
              ticketStatus = TicketStatusEnum.ISSUED;
            }
            const ticket = await this.ticketRepo.save(
              this.ticketRepo.create({
                bookingItemId: item.id,
                eventId: le.entity.id,
                customerId: booking.customerId,
                code,
                qrSecret: this.computeQrSecret(code, le.entity.id),
                status: ticketStatus,
              }),
            );
            if (ticketStatus === TicketStatusEnum.USED) {
              await this.checkInRepo.save(
                this.checkInRepo.create({
                  ticketId: ticket.id,
                  eventId: le.entity.id,
                  staffId: String(pick(staff).id),
                  method: chance(0.85)
                    ? CheckInMethodEnum.QR
                    : CheckInMethodEnum.MANUAL,
                }),
              );
            }
          }
        }
      }
    }

    // --- Past-date booking.createdAt (raw UPDATE; @CreateDateColumn default
    // is unreliable to override via save()). This is what the daily-revenue
    // chart reads.
    for (const u of createdAtUpdates) {
      await this.bookingRepo.query(
        `UPDATE booking SET "createdAt" = $1, "updatedAt" = $1 WHERE id = $2`,
        [u.date, u.id],
      );
    }

    // --- Apply soldQty + sold_out status ---------------------------------
    for (const le of liveEvents) {
      for (const lt of le.ticketTypes) {
        if (lt.sold <= 0) continue;
        const sold = Math.min(lt.sold, lt.entity.totalQty);
        const soldOut = sold >= lt.entity.totalQty;
        await this.ticketTypeRepo.update(lt.entity.id, {
          soldQty: sold,
          ...(soldOut ? { status: TicketTypeStatusEnum.SOLD_OUT } : {}),
        });
      }
    }

    // --- Waitlist demo: force one ticket type sold out + add entries ------
    if (soldOutTarget) {
      await this.ticketTypeRepo.update(soldOutTarget.entity.id, {
        soldQty: soldOutTarget.entity.totalQty,
        status: TicketTypeStatusEnum.SOLD_OUT,
      });
      const waitCustomers = customerIds.slice(0, 5);
      for (let i = 0; i < waitCustomers.length; i++) {
        await this.waitlistRepo.save(
          this.waitlistRepo.create({
            userId: waitCustomers[i],
            ticketTypeId: soldOutTarget.entity.id,
            eventId: soldOutTarget.entity.eventId,
            status:
              i < 2 ? WaitlistStatusEnum.NOTIFIED : WaitlistStatusEnum.WAITING,
          }),
        );
      }
    }

    // --- Persist promo usedCount -----------------------------------------
    for (const promo of promos) {
      if (promo.usedCount > 0) {
        await this.promoRepo.update(promo.id, { usedCount: promo.usedCount });
      }
    }
  }
}
