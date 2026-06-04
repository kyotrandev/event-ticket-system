import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { DataSource, In } from 'typeorm';
import { toBuffer } from 'qrcode';
import { TICKET_DELIVERY_QUEUE } from './payments.service';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BookingEntity } from '../bookings/infrastructure/persistence/relational/entities/booking.entity';
import { TicketEntity } from '../tickets/infrastructure/persistence/relational/entities/ticket.entity';
import { EventEntity } from '../events/infrastructure/persistence/relational/entities/event.entity';
import { UserEntity } from '../users/infrastructure/persistence/relational/entities/user.entity';

interface DeliveryJobData {
  bookingId: string;
}

/**
 * Emails QR tickets for a PAID booking (SPEC US-3.5). One PNG attachment
 * per ticket. BullMQ retries 3× with backoff; terminal failure is written
 * to the audit log. (PDF rendering is deferred — tracked for the phase.)
 */
@Processor(TICKET_DELIVERY_QUEUE)
export class TicketDeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketDeliveryProcessor.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    super();
  }

  async process(job: Job<DeliveryJobData>): Promise<void> {
    const { bookingId } = job.data;

    const booking = await this.dataSource
      .getRepository(BookingEntity)
      .findOne({ where: { id: bookingId }, loadEagerRelations: false });
    if (!booking) {
      this.logger.warn(`booking ${bookingId} vanished; skipping delivery`);
      return;
    }

    const customer = await this.dataSource
      .getRepository(UserEntity)
      .findOne({ where: { id: Number(booking.customerId) } });
    if (!customer?.email) {
      this.logger.warn(`customer ${booking.customerId} has no email`);
      return;
    }

    const tickets = await this.dataSource.getRepository(TicketEntity).find({
      where: { bookingItem: { bookingId } },
      relations: { bookingItem: { ticketType: true } },
    });
    if (tickets.length === 0) {
      this.logger.warn(`no tickets for booking ${bookingId}`);
      return;
    }

    const eventIds = [...new Set(tickets.map((t) => t.eventId))];
    const events = await this.dataSource
      .getRepository(EventEntity)
      .find({ where: { id: In(eventIds) } });
    const eventById = new Map(events.map((e) => [e.id, e]));

    const attachments = await Promise.all(
      tickets.map(async (ticket, i) => ({
        filename: `ticket-${i + 1}-${ticket.code.slice(0, 8)}.png`,
        content: await toBuffer(
          JSON.stringify({ c: ticket.code, s: ticket.qrSecret }),
          { type: 'png', width: 320, margin: 2 },
        ),
      })),
    );

    const firstEvent = eventById.get(tickets[0].eventId);

    try {
      await this.mailService.ticketsDelivered({
        to: customer.email,
        data: {
          firstName: customer.firstName ?? 'there',
          eventName: firstEvent?.name ?? 'your event',
          eventLocation: firstEvent?.location ?? '',
          eventStart: firstEvent?.startTime?.toLocaleString() ?? '',
          tickets: tickets.map((t) => ({
            code: t.code,
            typeName: t.bookingItem?.ticketType?.name ?? 'Ticket',
          })),
        },
        attachments,
      });
    } catch (error) {
      if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
        await this.auditLogsService.log({
          action: 'ticket_email.delivery_failed',
          entity: 'Booking',
          entityId: bookingId,
          payload: { error: String(error) },
        });
      }
      throw error;
    }
  }
}
