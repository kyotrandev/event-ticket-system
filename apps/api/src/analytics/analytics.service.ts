import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { BookingStatusEnum } from '../bookings/booking-status.enum';
import { EventStatusEnum } from '../events/event-status.enum';
import { TicketStatusEnum } from '../tickets/ticket-status.enum';
import { RoleEnum } from '../roles/roles.enum';
import { EventAnalyticsDto } from './dto/event-analytics.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';

@Injectable()
export class AnalyticsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getEventAnalytics(
    eventId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<EventAnalyticsDto> {
    const event = await this.dataSource
      .getRepository(EventEntity)
      .findOne({ where: { id: eventId } });

    if (!event) throw new NotFoundException('Event not found');
    if (!isAdmin && event.organizerId !== requesterId) {
      throw new ForbiddenException();
    }

    const [ticketTypeStats, checkInStats, dailyBookings, topPromoCodes] =
      await Promise.all([
        this.getTicketTypeStats(eventId),
        this.getCheckInStats(eventId),
        this.getDailyBookings(eventId),
        this.getTopPromoCodes(eventId),
      ]);

    const totalRevenue = ticketTypeStats.reduce((sum, t) => sum + t.revenue, 0);
    const checkInRate =
      checkInStats.total > 0
        ? Math.round((checkInStats.used / checkInStats.total) * 10000) / 100
        : 0;

    return {
      ticketTypeStats,
      totalRevenue,
      checkInRate,
      dailyBookings,
      topPromoCodes,
    };
  }

  private async getTicketTypeStats(eventId: string) {
    const rows: Array<{
      ticketTypeId: string;
      name: string;
      sold: string;
      revenue: string;
    }> = await this.dataSource.query(
      `SELECT bi."ticketTypeId",
              tt.name,
              SUM(bi.quantity) as sold,
              COALESCE(SUM(
                CASE WHEN b.status = $2 THEN bi.quantity * bi."unitPrice"
                     WHEN b.status = $3 THEN -(bi.quantity * bi."unitPrice")
                     ELSE 0 END
              ), 0) as revenue
       FROM booking_item bi
       JOIN ticket_type tt ON tt.id = bi."ticketTypeId"
       JOIN booking b ON b.id = bi."bookingId"
       WHERE tt."eventId" = $1
         AND b.status IN ($2, $3)
       GROUP BY bi."ticketTypeId", tt.name`,
      [eventId, BookingStatusEnum.PAID, BookingStatusEnum.REFUNDED],
    );
    return rows.map((r) => ({
      ticketTypeId: r.ticketTypeId,
      name: r.name,
      sold: Number(r.sold),
      revenue: Number(r.revenue),
    }));
  }

  private async getCheckInStats(
    eventId: string,
  ): Promise<{ used: number; total: number }> {
    const rows: Array<{ used: string; total: string }> =
      await this.dataSource.query(
        `SELECT
           COUNT(CASE WHEN status = $2 THEN 1 END) as used,
           COUNT(CASE WHEN status IN ($2, $3) THEN 1 END) as total
         FROM ticket
         WHERE "eventId" = $1`,
        [eventId, TicketStatusEnum.USED, TicketStatusEnum.ISSUED],
      );
    const row = rows[0] ?? { used: '0', total: '0' };
    return { used: Number(row.used), total: Number(row.total) };
  }

  private async getDailyBookings(eventId: string) {
    // Revenue computed at item level to avoid cross-event booking inflation.
    const rows: Array<{ date: string; bookings: string; revenue: string }> =
      await this.dataSource.query(
        `SELECT DATE(b."createdAt")::text as date,
                COUNT(DISTINCT b.id) as bookings,
                COALESCE(SUM(
                  CASE WHEN b.status = $2 THEN bi.quantity * bi."unitPrice"
                       WHEN b.status = $3 THEN -(bi.quantity * bi."unitPrice")
                       ELSE 0 END
                ), 0) as revenue
         FROM booking b
         JOIN booking_item bi ON bi."bookingId" = b.id
         JOIN ticket_type tt ON tt.id = bi."ticketTypeId"
         WHERE tt."eventId" = $1
           AND b.status IN ($2, $3)
         GROUP BY DATE(b."createdAt")
         ORDER BY DATE(b."createdAt")`,
        [eventId, BookingStatusEnum.PAID, BookingStatusEnum.REFUNDED],
      );
    return rows.map((r) => ({
      date: r.date,
      bookings: Number(r.bookings),
      revenue: Number(r.revenue),
    }));
  }

  private async getTopPromoCodes(eventId: string) {
    const rows: Array<{
      code: string;
      usage_count: string;
      total_discount: string;
    }> = await this.dataSource.query(
      `SELECT pc.code,
              COUNT(sub.id) as usage_count,
              COALESCE(SUM(sub."discountAmount"), 0) as total_discount
       FROM (
         SELECT DISTINCT b.id, b."promoCodeId", b."discountAmount"
         FROM booking b
         JOIN booking_item bi ON bi."bookingId" = b.id
         JOIN ticket_type tt ON tt.id = bi."ticketTypeId"
         WHERE tt."eventId" = $1
           AND b.status IN ($2, $3)
           AND b."promoCodeId" IS NOT NULL
       ) sub
       JOIN promo_code pc ON pc.id = sub."promoCodeId"
       GROUP BY pc.id, pc.code
       ORDER BY usage_count DESC
       LIMIT 5`,
      [eventId, BookingStatusEnum.PAID, BookingStatusEnum.REFUNDED],
    );
    return rows.map((r) => ({
      code: r.code,
      usageCount: Number(r.usage_count),
      totalDiscount: Number(r.total_discount),
    }));
  }

  async getAdminStats(): Promise<AdminStatsDto> {
    const [
      usersByRole,
      eventsByStatus,
      bookingsByStatus,
      [revenueRow],
      [refundsRow],
    ] = await Promise.all([
      this.dataSource.query(
        `SELECT "roleId", COUNT(*) as count
           FROM "user"
           WHERE "deletedAt" IS NULL
           GROUP BY "roleId"`,
      ) as Promise<Array<{ roleId: number; count: string }>>,

      this.dataSource.query(
        `SELECT status, COUNT(*) as count
           FROM event
           WHERE "deletedAt" IS NULL
           GROUP BY status`,
      ) as Promise<Array<{ status: string; count: string }>>,

      this.dataSource.query(
        `SELECT status, COUNT(*) as count
           FROM booking
           GROUP BY status`,
      ) as Promise<Array<{ status: string; count: string }>>,

      this.dataSource.query(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total
           FROM booking WHERE status = $1`,
        [BookingStatusEnum.PAID],
      ) as Promise<Array<{ total: string }>>,

      this.dataSource.query(
        `SELECT COALESCE(SUM("totalAmount"), 0) as total
           FROM booking WHERE status = $1`,
        [BookingStatusEnum.REFUNDED],
      ) as Promise<Array<{ total: string }>>,
    ]);

    const userMap = Object.fromEntries(
      usersByRole.map((r) => [r.roleId, Number(r.count)]),
    );
    const eventMap = Object.fromEntries(
      eventsByStatus.map((r) => [r.status, Number(r.count)]),
    );
    const bookingMap = Object.fromEntries(
      bookingsByStatus.map((r) => [r.status, Number(r.count)]),
    );

    return {
      users: {
        admin: userMap[RoleEnum.admin] ?? 0,
        customer: userMap[RoleEnum.customer] ?? 0,
        organizer: userMap[RoleEnum.organizer] ?? 0,
        staff: userMap[RoleEnum.staff] ?? 0,
        total: Object.values(userMap).reduce((s, c) => s + c, 0),
      },
      events: {
        draft: eventMap[EventStatusEnum.DRAFT] ?? 0,
        published: eventMap[EventStatusEnum.PUBLISHED] ?? 0,
        ongoing: eventMap[EventStatusEnum.ONGOING] ?? 0,
        ended: eventMap[EventStatusEnum.ENDED] ?? 0,
        cancelled: eventMap[EventStatusEnum.CANCELLED] ?? 0,
      },
      bookings: {
        pendingPayment: bookingMap[BookingStatusEnum.PENDING_PAYMENT] ?? 0,
        paid: bookingMap[BookingStatusEnum.PAID] ?? 0,
        expired: bookingMap[BookingStatusEnum.EXPIRED] ?? 0,
        failed: bookingMap[BookingStatusEnum.FAILED] ?? 0,
        refunded: bookingMap[BookingStatusEnum.REFUNDED] ?? 0,
      },
      totalGrossRevenue: Number(revenueRow.total),
      totalRefunds: Number(refundsRow.total),
    };
  }
}
