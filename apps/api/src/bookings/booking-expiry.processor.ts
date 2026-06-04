import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { BOOKING_EXPIRY_QUEUE, BookingsService } from './bookings.service';

interface ExpireJobData {
  bookingId: string;
}

/**
 * Fires at expiresAt for every booking (SPEC US-3.4). The service-level
 * expire() is idempotent — only PENDING_PAYMENT bookings transition —
 * so a job racing a successful payment is a safe no-op. BullMQ retries
 * with exponential backoff (3 attempts) on failure.
 */
@Processor(BOOKING_EXPIRY_QUEUE)
export class BookingExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(BookingExpiryProcessor.name);

  constructor(private readonly bookingsService: BookingsService) {
    super();
  }

  async process(job: Job<ExpireJobData>): Promise<void> {
    this.logger.log(`expiring booking ${job.data.bookingId}`);
    await this.bookingsService.expire(job.data.bookingId);
  }
}
