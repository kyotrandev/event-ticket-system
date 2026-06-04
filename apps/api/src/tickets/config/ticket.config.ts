import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { TicketConfig } from './ticket-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  TICKET_QR_SECRET: string;
}

export default registerAs<TicketConfig>('ticket', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    // Falls back to the JWT secret in dev; set a dedicated secret in prod.
    qrSecret:
      process.env.TICKET_QR_SECRET ??
      process.env.AUTH_JWT_SECRET ??
      'dev_ticket_qr_secret',
  };
});
