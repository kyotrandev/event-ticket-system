import { Injectable } from '@nestjs/common';
import fs from 'node:fs/promises';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import { AllConfigType } from '../config/config.type';

interface SendMailOptions {
  from?: string;
  to: string | string[];
  subject: string;
  html?: string;
  templatePath?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

@Injectable()
export class MailerService {
  private readonly apiKey: string;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    // MAIL_PASSWORD holds the Resend API key (re_xxx)
    this.apiKey = configService.get('mail.password', { infer: true }) ?? '';
    const name =
      configService.get('mail.defaultName', { infer: true }) ?? 'App';
    const email = configService.get('mail.defaultEmail', { infer: true }) ?? '';
    this.defaultFrom = `"${name}" <${email}>`;
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: SendMailOptions): Promise<void> {
    let html = mailOptions.html as string | undefined;
    if (!html && templatePath) {
      const template = await fs.readFile(templatePath as string, 'utf-8');
      html = Handlebars.compile(template, { strict: true })(context ?? {});
    }

    const to = Array.isArray(mailOptions.to)
      ? (mailOptions.to as string[])
      : [mailOptions.to as string];

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: mailOptions.from ?? this.defaultFrom,
        to,
        subject: mailOptions.subject as string,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }
  }
}
