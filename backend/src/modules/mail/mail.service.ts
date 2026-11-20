import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Environment } from '../../config/environment.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport:
    ReturnType<typeof nodemailer.createTransport> | undefined;
  private readonly from: string;

  constructor(config: ConfigService<Environment, true>) {
    const enabled = config.getOrThrow('AUTH_EMAIL_ENABLED') === 'true';
    this.from = config.getOrThrow('SMTP_FROM');

    if (enabled) {
      this.transport = nodemailer.createTransport({
        host: config.getOrThrow('SMTP_HOST'),
        port: config.getOrThrow('SMTP_PORT'),
        secure: config.getOrThrow('SMTP_SECURE') === 'true',
        auth: config.getOrThrow('SMTP_USER')
          ? {
              user: config.getOrThrow('SMTP_USER'),
              pass: config.getOrThrow('SMTP_PASS'),
            }
          : undefined,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
    }
  }

  async sendCode(
    email: string,
    code: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ): Promise<void> {
    if (!this.transport) {
      return;
    }
    const subject =
      purpose === 'VERIFY_EMAIL' ? 'Подтвердите почту' : 'Сброс пароля';
    await this.transport.sendMail({
      from: this.from,
      to: email,
      subject,
      text: `${subject}\n\nВаш код: ${code}\n\nКод действует 15 минут. Никому его не сообщайте.\nЕсли вы не запрашивали код — проигнорируйте это письмо.`,
    });
  }

  sendCodeFireAndForget(
    email: string,
    code: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
  ): void {
    void this.sendCode(email, code, purpose).catch(() => {
      this.logger.error('Не удалось отправить письмо. Проверьте SMTP.');
    });
  }
}
