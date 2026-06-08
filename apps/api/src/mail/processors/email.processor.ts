import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailService } from '../mail.service';
import { Logger } from '@nestjs/common';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    try {
      switch (job.name) {
        case 'user-sign-up':
          await this.mailService.userSignUp(job.data);
          break;
        // other email jobs can be handled here
        default:
          this.logger.warn(`Unknown job name: ${job.name}`);
      }
      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  }
}
