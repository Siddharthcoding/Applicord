import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface SendPasswordResetParams {
  to: string;
  name?: string;
  resetUrl: string;
  expiresMinutes?: number;
}

interface SendReminderParams {
  to: string;
  name?: string;
  reminderTitle: string;
  dueAt: Date;
  companyName?: string;
  jobTitle?: string;
  viewUrl?: string;
  reminderType?: string;
}

class MailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const isTest = config.nodeEnv === 'test' || process.env.VITEST === 'true';

    if (config.smtpHost && config.smtpUser && !isTest) {
      this.transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
      logger.info('[MailService] Configured with live SMTP transport', {
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        user: config.smtpUser,
      });
    } else {
      // In development or when SMTP is not configured, create a fallback stream transport
      // that avoids crashing and safely logs the email contents for inspection.
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      logger.info('[MailService] SMTP not fully configured in env; running in mock/log mode.');
    }
  }

  /**
   * Send a raw email using the configured transporter.
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      const mailOptions: SendMailOptions = {
        from: options.from || config.smtpFrom,
        ...options,
      };

      const info = await this.transporter!.sendMail(mailOptions);

      if (info.message) {
        // jsonTransport returns message object
        logger.info('[MailService] Email simulated (mock transport)', {
          to: options.to,
          subject: options.subject,
        });
      } else {
        logger.info('[MailService] Email sent successfully via SMTP', {
          to: options.to,
          subject: options.subject,
          messageId: info.messageId,
        });
      }

      return true;
    } catch (err: any) {
      logger.error('[MailService] Failed to send email', err, {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }
  }

  /**
   * Sends a styled password reset email with action link and token expiration.
   */
  async sendPasswordResetEmail({
    to,
    name,
    resetUrl,
    expiresMinutes = 60,
  }: SendPasswordResetParams): Promise<boolean> {
    const greeting = name ? `Hi ${name},` : 'Hello,';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090A0C;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }
    .wrapper {
      width: 100%;
      background-color: #090A0C;
      padding: 40px 0;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #121418;
      border: 1px solid #242830;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 24px 32px;
      background-color: #16181E;
      border-bottom: 1px solid #242830;
      display: flex;
      align-items: center;
    }
    .logo {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      background-color: #4F65F6;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      border-radius: 8px;
      margin-right: 12px;
    }
    .brand-name {
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: -0.02em;
    }
    .content {
      padding: 32px;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #94A3B8;
    }
    .btn-container {
      margin: 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #4F65F6;
      color: #FFFFFF !important;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
    }
    .secondary-box {
      background-color: #181B20;
      border: 1px solid #242830;
      border-radius: 8px;
      padding: 14px;
      margin-top: 24px;
      word-break: break-all;
    }
    .secondary-text {
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }
    .url-link {
      color: #60A5FA;
      text-decoration: none;
    }
    .footer {
      padding: 20px 32px;
      background-color: #0E1013;
      border-top: 1px solid #1E2127;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">AL</div>
        <div class="brand-name">Applicord</div>
      </div>
      <div class="content">
        <h1>Password Reset Request</h1>
        <p>${greeting}</p>
        <p>We received a request to reset your password for your Applicord account. Click the button below to choose a new password:</p>
        
        <div class="btn-container">
          <a href="${resetUrl}" target="_blank" class="btn">Reset Password</a>
        </div>
        
        <p>This password reset link will expire in <strong>${expiresMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email — your account remains secure.</p>
        
        <div class="secondary-box">
          <p class="secondary-text" style="margin-bottom: 6px;">Button not working? Copy and paste this URL into your browser:</p>
          <a href="${resetUrl}" class="url-link secondary-text">${resetUrl}</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Applicord. Professional Job Application Tracker.
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Applicord - Password Reset Request

${greeting}

We received a request to reset your password for your Applicord account. Please use the following link to choose a new password:

${resetUrl}

This link will expire in ${expiresMinutes} minutes. If you did not request this, please ignore this email.

— The Applicord Team
    `.trim();

    return this.sendMail({
      to,
      subject: 'Reset your Applicord password',
      html,
      text,
    });
  }

  /**
   * Sends an email reminder for follow-ups, interviews, or deadlines.
   */
  async sendReminderEmail({
    to,
    name,
    reminderTitle,
    dueAt,
    companyName,
    jobTitle,
    viewUrl,
    reminderType = 'FOLLOW_UP',
  }: SendReminderParams): Promise<boolean> {
    const greeting = name ? `Hi ${name},` : 'Hello,';
    const formattedDate = new Date(dueAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const fallbackUrl = viewUrl
      ? `${config.frontendUrl}${viewUrl}`
      : `${config.frontendUrl}/calendar`;

    const typeBadge = reminderType.replace('_', ' ');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Applicord Reminder</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090A0C;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
    }
    .wrapper {
      width: 100%;
      background-color: #090A0C;
      padding: 40px 0;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background-color: #121418;
      border: 1px solid #242830;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 24px 32px;
      background-color: #16181E;
      border-bottom: 1px solid #242830;
    }
    .logo {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      background-color: #4F65F6;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      text-align: center;
      border-radius: 8px;
      margin-right: 12px;
      vertical-align: middle;
    }
    .brand-name {
      display: inline-block;
      font-size: 16px;
      font-weight: 700;
      color: #F8FAFC;
      letter-spacing: -0.02em;
      vertical-align: middle;
    }
    .content {
      padding: 32px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: #1E293B;
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      border: 1px solid #334155;
    }
    h1 {
      margin: 0 0 16px;
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    p {
      margin: 0 0 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #94A3B8;
    }
    .reminder-card {
      background-color: #181B20;
      border: 1px solid #282C34;
      border-radius: 8px;
      padding: 18px;
      margin: 20px 0;
    }
    .reminder-title {
      font-size: 15px;
      font-weight: 600;
      color: #F1F5F9;
      margin-bottom: 8px;
    }
    .reminder-meta {
      font-size: 13px;
      color: #94A3B8;
      margin-bottom: 4px;
    }
    .btn-container {
      margin: 28px 0;
      text-align: center;
    }
    .btn {
      display: inline-block;
      background-color: #4F65F6;
      color: #FFFFFF !important;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
    }
    .footer {
      padding: 20px 32px;
      background-color: #0E1013;
      border-top: 1px solid #1E2127;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <span class="logo">AL</span>
        <span class="brand-name">Applicord</span>
      </div>
      <div class="content">
        <span class="badge">${typeBadge} Reminder</span>
        <h1>Upcoming Activity Due</h1>
        <p>${greeting}</p>
        <p>This is a scheduled reminder for your job search activity:</p>
        
        <div class="reminder-card">
          <div class="reminder-title">${reminderTitle}</div>
          ${companyName ? `<div class="reminder-meta"><strong>Company:</strong> ${companyName}</div>` : ''}
          ${jobTitle ? `<div class="reminder-meta"><strong>Role:</strong> ${jobTitle}</div>` : ''}
          <div class="reminder-meta"><strong>Due Date:</strong> ${formattedDate}</div>
        </div>
        
        <div class="btn-container">
          <a href="${fallbackUrl}" target="_blank" class="btn">Open Application in Applicord</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Applicord. You are receiving this because you enabled reminders.
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const text = `
Applicord - Reminder: ${reminderTitle}

${greeting}

This is a scheduled reminder for your job search:

Activity: ${reminderTitle}
${companyName ? `Company: ${companyName}\n` : ''}${jobTitle ? `Role: ${jobTitle}\n` : ''}Due Date: ${formattedDate}

View details here:
${fallbackUrl}

— The Applicord Team
    `.trim();

    return this.sendMail({
      to,
      subject: `Reminder: ${reminderTitle}`,
      html,
      text,
    });
  }
}

export const mailService = new MailService();
