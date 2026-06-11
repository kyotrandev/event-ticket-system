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
import { StatusEnum } from '../statuses/statuses.enum';
import { EventAnalyticsDto } from './dto/event-analytics.dto';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { OrganizerStatsDto } from './dto/organizer-stats.dto';
import { OrganizerEventSummaryDto } from '../events/dto/organizer-event-summary.dto';
import { QueryEventDto } from '../events/dto/query-event.dto';
import { InfinityPaginationResponseDto } from '../utils/dto/infinity-pagination-response.dto';

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
              SUM(
                CASE WHEN b.status = $2 THEN bi.quantity
                     ELSE 0 END
              ) as sold,
              COALESCE(SUM(
                CASE WHEN b.status = $2 THEN ${this.allocatedItemRevenueSql()}
                     WHEN b.status = $3 THEN -(${this.allocatedItemRevenueSql()})
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
                  CASE WHEN b.status = $2 THEN ${this.allocatedItemRevenueSql()}
                       WHEN b.status = $3 THEN -(${this.allocatedItemRevenueSql()})
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

  private allocatedItemRevenueSql(): string {
    return `CASE
      WHEN b."subtotalAmount" > 0 THEN ROUND(
        (b."totalAmount"::numeric * (bi.quantity * bi."unitPrice")::numeric)
        / b."subtotalAmount"::numeric
      )
      ELSE 0
    END`;
  }

  async getAdminStats(): Promise<AdminStatsDto> {
    const [
      usersByRole,
      eventsByStatus,
      bookingsByStatus,
      [revenueRow],
      [refundsRow],
      [pendingRow],
      [ticketsSoldRow],
      dailyRows,
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

      this.dataSource.query(
        `SELECT COUNT(*)::int as count
           FROM "user"
           WHERE "deletedAt" IS NULL
             AND "roleId" = $1
             AND "statusId" = $2`,
        [RoleEnum.organizer, StatusEnum.pending_approval],
      ) as Promise<Array<{ count: number }>>,

      this.dataSource.query(
        `SELECT COALESCE(SUM(tt."soldQty"), 0)::int as sold
           FROM ticket_type tt
           JOIN event e ON e.id = tt."eventId"
           WHERE e."deletedAt" IS NULL`,
      ) as Promise<Array<{ sold: number }>>,

      this.dataSource.query(
        `SELECT DATE(b."createdAt")::text as date,
                COUNT(DISTINCT b.id)::int as bookings,
                COALESCE(SUM(
                  CASE WHEN b.status = $1 THEN b."totalAmount"
                       WHEN b.status = $2 THEN -b."totalAmount"
                       ELSE 0 END
                ), 0)::bigint as revenue
         FROM booking b
         WHERE b."createdAt" >= NOW() - INTERVAL '30 days'
           AND b.status IN ($1, $2)
         GROUP BY DATE(b."createdAt")
         ORDER BY DATE(b."createdAt")`,
        [BookingStatusEnum.PAID, BookingStatusEnum.REFUNDED],
      ) as Promise<Array<{ date: string; bookings: number; revenue: string }>>,
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

    const totalGrossRevenue = Number(revenueRow.total);
    const totalRefunds = Number(refundsRow.total);

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
      totalGrossRevenue,
      totalRefunds,
      netRevenue: totalGrossRevenue - totalRefunds,
      pendingOrganizers: Number(pendingRow?.count ?? 0),
      totalTicketsSold: Number(ticketsSoldRow?.sold ?? 0),
      liveEvents: eventMap[EventStatusEnum.ONGOING] ?? 0,
      dailyStats: dailyRows.map((r) => ({
        date: r.date,
        bookings: Number(r.bookings),
        revenue: Number(r.revenue),
      })),
    };
  }

  async getOrganizerStats(organizerId: string): Promise<OrganizerStatsDto> {
    const [eventRows, revenueRow, soldRow] = await Promise.all([
      this.dataSource.query(
        `SELECT status, COUNT(*)::int as count
         FROM event
         WHERE "organizerId" = $1 AND "deletedAt" IS NULL
         GROUP BY status`,
        [organizerId],
      ) as Promise<Array<{ status: string; count: number }>>,
      this.dataSource.query(
        `SELECT COALESCE(SUM(
           CASE WHEN b.status = $2 THEN ${this.allocatedItemRevenueSql()}
                WHEN b.status = $3 THEN -(${this.allocatedItemRevenueSql()})
                ELSE 0 END
         ), 0) as revenue
         FROM booking b
         JOIN booking_item bi ON bi."bookingId" = b.id
         JOIN ticket_type tt ON tt.id = bi."ticketTypeId"
         JOIN event e ON e.id = tt."eventId"
         WHERE e."organizerId" = $1
           AND b.status IN ($2, $3)`,
        [organizerId, BookingStatusEnum.PAID, BookingStatusEnum.REFUNDED],
      ) as Promise<Array<{ revenue: string }>>,
      this.dataSource.query(
        `SELECT COALESCE(SUM(tt."soldQty"), 0)::int as sold
         FROM ticket_type tt
         JOIN event e ON e.id = tt."eventId"
         WHERE e."organizerId" = $1 AND e."deletedAt" IS NULL`,
        [organizerId],
      ) as Promise<Array<{ sold: number }>>,
    ]);

    const statusMap = Object.fromEntries(
      eventRows.map((r) => [r.status, Number(r.count)]),
    );
    const totalEvents = Object.values(statusMap).reduce((s, c) => s + c, 0);

    return {
      totalEvents,
      liveNow: statusMap[EventStatusEnum.ONGOING] ?? 0,
      totalRevenue: Number(revenueRow[0]?.revenue ?? 0),
      totalTicketsSold: Number(soldRow[0]?.sold ?? 0),
      draftCount: statusMap[EventStatusEnum.DRAFT] ?? 0,
      upcomingCount: statusMap[EventStatusEnum.PUBLISHED] ?? 0,
    };
  }

  async getOrganizerEvents(
    organizerId: string,
    query: QueryEventDto,
  ): Promise<InfinityPaginationResponseDto<OrganizerEventSummaryDto>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const offset = (page - 1) * limit;
    const sort = query.sort ?? 'createdAt';

    const params: unknown[] = [organizerId];
    let paramIdx = 2;
    const conditions = [`e."organizerId" = $1`, `e."deletedAt" IS NULL`];

    if (query.keyword) {
      conditions.push(
        `(e.name ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx})`,
      );
      params.push(`%${query.keyword}%`);
      paramIdx++;
    }
    if (query.status) {
      conditions.push(`e.status = $${paramIdx}`);
      params.push(query.status);
      paramIdx++;
    }
    if (query.category) {
      conditions.push(`e.category ILIKE $${paramIdx}`);
      params.push(`%${query.category}%`);
      paramIdx++;
    }
    if (query.dateFrom) {
      conditions.push(`e."startTime" >= $${paramIdx}`);
      params.push(new Date(query.dateFrom));
      paramIdx++;
    }
    if (query.dateTo) {
      conditions.push(`e."endTime" <= $${paramIdx}`);
      params.push(new Date(query.dateTo));
      paramIdx++;
    }

    const orderMap: Record<string, string> = {
      createdAt: 'e."createdAt" DESC',
      startTime: 'e."startTime" ASC',
      revenue: 'revenue DESC',
      sold: 'tickets_sold DESC',
      name: 'e.name ASC',
    };
    const orderBy = orderMap[sort] ?? orderMap.createdAt;

    const whereClause = conditions.join(' AND ');

    params.push(limit + 1, offset);
    const limitParam = paramIdx;
    const offsetParam = paramIdx + 1;

    const rows: Array<Record<string, unknown>> = await this.dataSource.query(
      `SELECT e.id, e."organizerId", e.name, e.description, e.location, e.category,
              e.tags, e."startTime", e."endTime", e."bannerUrl",
              e."cancellationWindowHours", e."maxTicketsPerOrder", e.status,
              e."createdAt", e."updatedAt", e."deletedAt",
              COALESCE(tts.tickets_sold, 0)::int as tickets_sold,
              COALESCE(tts.total_capacity, 0)::int as total_capacity,
              COALESCE(tts.ticket_type_count, 0)::int as ticket_type_count,
              COALESCE(rev.revenue, 0)::bigint as revenue,
              COALESCE(st.staff_count, 0)::int as staff_count,
              CASE
                WHEN COALESCE(ci.checkin_total, 0) = 0 THEN 0
                ELSE ROUND((ci.checkin_used::numeric / ci.checkin_total) * 10000) / 100
              END as check_in_rate
       FROM event e
       LEFT JOIN (
         SELECT "eventId",
                SUM("soldQty") as tickets_sold,
                SUM("totalQty") as total_capacity,
                COUNT(*)::int as ticket_type_count
         FROM ticket_type
         GROUP BY "eventId"
       ) tts ON tts."eventId" = e.id
       LEFT JOIN (
         SELECT tt."eventId",
                COALESCE(SUM(
                  CASE WHEN b.status = '${BookingStatusEnum.PAID}' THEN ${this.allocatedItemRevenueSql()}
                       WHEN b.status = '${BookingStatusEnum.REFUNDED}' THEN -(${this.allocatedItemRevenueSql()})
                       ELSE 0 END
                ), 0) as revenue
         FROM booking b
         JOIN booking_item bi ON bi."bookingId" = b.id
         JOIN ticket_type tt ON tt.id = bi."ticketTypeId"
         WHERE b.status IN ('${BookingStatusEnum.PAID}', '${BookingStatusEnum.REFUNDED}')
         GROUP BY tt."eventId"
       ) rev ON rev."eventId" = e.id
       LEFT JOIN (
         SELECT "eventId", COUNT(*)::int as staff_count
         FROM event_staff_assignment
         GROUP BY "eventId"
       ) st ON st."eventId" = e.id
       LEFT JOIN (
         SELECT "eventId",
                COUNT(CASE WHEN status = '${TicketStatusEnum.USED}' THEN 1 END)::int as checkin_used,
                COUNT(CASE WHEN status IN ('${TicketStatusEnum.USED}', '${TicketStatusEnum.ISSUED}') THEN 1 END)::int as checkin_total
         FROM ticket
         GROUP BY "eventId"
       ) ci ON ci."eventId" = e.id
       WHERE ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params,
    );

    const hasNextPage = rows.length > limit;
    const pageRows = hasNextPage ? rows.slice(0, limit) : rows;

    const data: OrganizerEventSummaryDto[] = pageRows.map((r) => ({
      id: r.id as string,
      organizerId: r.organizerId as string,
      name: r.name as string,
      description: r.description as string | null,
      location: r.location as string,
      category: r.category as string,
      tags: r.tags as string[] | null,
      startTime: r.startTime as Date,
      endTime: r.endTime as Date,
      bannerUrl: r.bannerUrl as string | null,
      cancellationWindowHours: r.cancellationWindowHours as number,
      maxTicketsPerOrder: r.maxTicketsPerOrder as number,
      status: r.status as OrganizerEventSummaryDto['status'],
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
      deletedAt: r.deletedAt as Date | null,
      ticketsSold: Number(r.tickets_sold),
      totalCapacity: Number(r.total_capacity),
      revenue: Number(r.revenue),
      checkInRate: Number(r.check_in_rate),
      ticketTypeCount: Number(r.ticket_type_count),
      staffCount: Number(r.staff_count),
    }));

    return { data, hasNextPage };
  }
}
