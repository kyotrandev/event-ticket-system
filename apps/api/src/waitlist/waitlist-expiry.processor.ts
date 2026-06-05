import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WAITLIST_EXPIRY_QUEUE, WaitlistService } from './waitlist.service';

interface WaitlistExpiryJobData {
  entryId: string;
}

@Processor(WAITLIST_EXPIRY_QUEUE)
export class WaitlistExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistExpiryProcessor.name);

  constructor(private readonly waitlistService: WaitlistService) {
    super();
  }

  async process(job: Job<WaitlistExpiryJobData>): Promise<void> {
    const { entryId } = job.data;
    this.logger.debug(`expiring waitlist entry ${entryId}`);
    await this.waitlistService.expireEntry(entryId);
  }
}
