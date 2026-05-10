// src/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');
    
    if (!smtpUser || !smtpPassword) {
      this.logger.warn('Email credentials not configured. Email sending will be disabled.');
      return;
    }
    
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
    
    this.logger.log('Email service initialized');
  }

  async sendOtpEmail(to: string, name: string, otp: string) {
    if (!this.transporter) {
      // Fallback to console logging if email not configured
      console.log('\n' + '='.repeat(60));
      console.log(`📧 EMAIL VERIFICATION (Fallback Mode - Email not configured)`);
      console.log('='.repeat(60));
      console.log(`To: ${to}`);
      console.log(`Name: ${name}`);
      console.log(`🔑 VERIFICATION CODE: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('='.repeat(60) + '\n');
      return;
    }

    try {
      const mailOptions = {
        from: `"Mthandizi Support" <${this.configService.get('SMTP_USER')}>`,
        to: to,
        subject: 'Your Verification Code - Mthandizi Student Portal',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
            </div>
            <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
              <h2>Welcome, ${name}!</h2>
              <p>Use the following verification code to complete your registration:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; background: #f3f4f6; padding: 15px; border-radius: 10px;">
                  ${otp}
                </div>
              </div>
              <p><strong>⏰ This code will expire in 10 minutes.</strong></p>
              <hr style="margin: 20px 0;">
              <p style="color: #6b7280; font-size: 12px;">This is an automated message, please do not reply.</p>
            </div>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP email sent to ${to}, Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      // Fallback to console logging
      console.log('\n' + '='.repeat(60));
      console.log(`📧 EMAIL VERIFICATION (Fallback Mode - Send failed)`);
      console.log('='.repeat(60));
      console.log(`To: ${to}`);
      console.log(`🔑 VERIFICATION CODE: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);
      console.log('='.repeat(60) + '\n');
      throw error;
    }
  }
}