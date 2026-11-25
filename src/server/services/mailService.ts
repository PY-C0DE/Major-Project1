import nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendMailResult {
  provider: string;
  messageId?: string;
}

export interface MailProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  sendMail(input: SendMailInput): Promise<SendMailResult>;
}

export class MailProviderUnavailableError extends Error {
  readonly statusCode = 503;

  constructor(
    message = 'Email delivery provider is not configured on this server. Configure SMTP_* or RESEND_API_KEY and MAIL_FROM.'
  ) {
    super(message);
    this.name = 'MailProviderUnavailableError';
  }
}

class SmtpMailProvider implements MailProvider {
  readonly providerName = 'smtp';

  private getConfig() {
    const host = process.env.SMTP_HOST?.trim() || '';
    const port = Number(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER?.trim() || '';
    const pass = process.env.SMTP_PASS?.trim() || '';
    const from = process.env.MAIL_FROM?.trim() || user;
    const secure =
      process.env.SMTP_SECURE?.trim().toLowerCase() === 'true' || port === 465;

    return { host, port, user, pass, from, secure };
  }

  isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.host && cfg.from && Number.isFinite(cfg.port) && cfg.port > 0);
  }

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    if (!this.isConfigured()) {
      throw new MailProviderUnavailableError();
    }
    const cfg = this.getConfig();
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined
    });

    const info = await transporter.sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html
    });

    return {
      provider: this.providerName,
      messageId: info.messageId
    };
  }
}

class ResendMailProvider implements MailProvider {
  readonly providerName = 'resend';

  private getConfig() {
    const apiKey = process.env.RESEND_API_KEY?.trim() || '';
    const from = process.env.MAIL_FROM?.trim() || '';
    return { apiKey, from };
  }

  isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.apiKey && cfg.from);
  }

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    const cfg = this.getConfig();
    if (!cfg.apiKey || !cfg.from) {
      throw new MailProviderUnavailableError();
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: cfg.from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Resend API error (${res.status}): ${errBody || res.statusText}`);
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return {
      provider: this.providerName,
      messageId: data.id
    };
  }
}

class UnconfiguredMailProvider implements MailProvider {
  readonly providerName = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async sendMail(): Promise<SendMailResult> {
    throw new MailProviderUnavailableError();
  }
}

let customMailProviderOverride: MailProvider | null = null;

export function setMailProviderOverride(provider: MailProvider | null): void {
  customMailProviderOverride = provider;
}

export function resetMailProvider(): void {
  customMailProviderOverride = null;
}

export function getMailProvider(): MailProvider {
  if (customMailProviderOverride) {
    return customMailProviderOverride;
  }

  const smtp = new SmtpMailProvider();
  if (smtp.isConfigured()) {
    return smtp;
  }

  const resend = new ResendMailProvider();
  if (resend.isConfigured()) {
    return resend;
  }

  return new UnconfiguredMailProvider();
}

export function buildAppBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    process.env.BACKEND_URL?.trim() ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
