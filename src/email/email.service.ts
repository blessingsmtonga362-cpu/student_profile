import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    console.log('🚀🚀🚀 EMAIL SERVICE CONSTRUCTOR CALLED! 🚀🚀🚀');
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    
    // Debug: Log all config values
    this.logger.log('📧 ===== EMAIL CONFIGURATION DEBUG =====');
    this.logger.log(`SMTP_HOST: ${smtpHost || 'NOT SET'}`);
    this.logger.log(`SMTP_PORT: ${smtpPort || 'NOT SET'}`);
    this.logger.log(`SMTP_USER: ${smtpUser || 'NOT SET'}`);
    this.logger.log(`SMTP_PASSWORD: ${smtpPassword ? '✅ SET (length: ' + smtpPassword.length + ')' : '❌ NOT SET'}`);
    
    if (!smtpUser || !smtpPassword) {
      this.logger.warn('⚠️ Email credentials not configured. Email sending will be disabled.');
      return;
    }
    
    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost || 'smtp.gmail.com',
        port: parseInt(smtpPort as string) || 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
      
      // Verify connection
      this.verifyConnection();
      this.logger.log('✅ Email service initialized successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize email service: ${error.message}`);
    }
  }

  private async verifyConnection() {
    try {
      if (this.transporter) {
        await this.transporter.verify();
        this.logger.log('✅ SMTP connection verified successfully');
      }
    } catch (error) {
      this.logger.error(`❌ SMTP connection verification failed: ${error.message}`);
    }
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    this.logger.log(`📧 Attempting to send email to: ${options.to}`);
    this.logger.log(`📧 Subject: ${options.subject}`);
    
    if (!this.transporter) {
      this.logger.warn(`⚠️ No transporter - logging email to console: ${options.subject} -> ${options.to}`);
      this.logEmailToConsole(options);
      return { success: true };
    }

    try {
      const mailOptions = {
        from: `"Mthandizi Support" <${this.configService.get('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      this.logger.log(`📧 Sending email via SMTP to ${options.to}...`);
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully to ${options.to}`);
      this.logger.log(`📧 Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${options.to}: ${error.message}`);
      this.logger.error(`❌ Error details: ${JSON.stringify(error)}`);
      this.logEmailToConsole(options);
      throw error;
    }
  }

  async sendOtpEmail(to: string, name: string, otp: string) {
    this.logger.log(`🔐 Generating OTP email for: ${to}`);
    this.logger.log(`🔐 OTP Code: ${otp}`);
    
    const safeName = this.escapeHtml(name);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2>Welcome, ${safeName}!</h2>
          <p>Use the following verification code to complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 10px; background: #f3f4f6; padding: 15px; border-radius: 10px; border: 2px dashed #1e3a5f;">
              ${otp}
            </div>
          </div>
          <p><strong>⏰ This code will expire in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    const result = await this.sendEmail({ 
      to, 
      subject: '🔐 Your Verification Code - Mthandizi Student Portal', 
      html 
    });
    
    if (result.success) {
      this.logger.log(`✅ OTP email sent successfully to ${to}`);
    } else {
      this.logger.warn(`⚠️ OTP email may not have been sent to ${to}, check logs above`);
    }
    
    return result;
  }

  // Send application submission confirmation to student
  async sendApplicationSubmittedEmail(to: string, studentName: string, applicationReference: string): Promise<void> {
    const safeStudentName = this.escapeHtml(studentName);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #4caf50; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">✓</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">Application Submitted Successfully!</h2>
          <p>Dear <strong>${safeStudentName}</strong>,</p>
          <p>Your application has been successfully submitted to Mthandizi Student Support Portal.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Application Reference:</strong> ${applicationReference}</p>
            <p style="margin: 10px 0 0;"><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p>Our team will review your application and get back to you within 5-7 business days.</p>
          <p>You can track your application status by logging into your dashboard.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    await this.sendEmail({ 
      to, 
      subject: '✅ Application Submitted Successfully - Mthandizi', 
      html 
    });
  }

  // Send notification to admin about new application
  async sendNewApplicationAlertToAdmin(to: string, adminName: string, studentName: string, applicationReference: string): Promise<void> {
    const safeAdminName = this.escapeHtml(adminName);
    const safeStudentName = this.escapeHtml(studentName);
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Mthandizi Admin Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #ff9800; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">📝</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">New Application Submitted</h2>
          <p>Dear <strong>${safeAdminName}</strong>,</p>
          <p>A new application has been submitted and requires your review.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Student Name:</strong> ${safeStudentName}</p>
            <p style="margin: 10px 0 0;"><strong>Application Reference:</strong> ${applicationReference}</p>
            <p style="margin: 10px 0 0;"><strong>Submission Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/admin/applicants" 
               style="background-color: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review Application
            </a>
          </div>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    await this.sendEmail({ 
      to, 
      subject: '📝 New Application Submitted - Action Required', 
      html 
    });
  }

  // Send application status update email
  async sendApplicationStatusUpdateEmail(
    to: string, 
    studentName: string, 
    applicationReference: string, 
    status: string, 
    comments?: string
  ): Promise<void> {
    const statusColors: Record<string, string> = {
      approved: '#4caf50',
      rejected: '#f44336',
      under_review: '#ff9800',
      submitted: '#2196f3',
    };

    const statusMessages: Record<string, string> = {
      approved: 'Congratulations! Your application has been approved.',
      rejected: 'We regret to inform you that your application has not been approved.',
      under_review: 'Your application is currently under review by our team.',
      submitted: 'Your application has been received and is pending review.',
    };
    const safeStudentName = this.escapeHtml(studentName);
    const safeStatus = this.escapeHtml(status);
    const safeStatusLabel = this.escapeHtml(status.toUpperCase());
    const safeComments = comments ? this.escapeHtml(comments) : '';
    const statusMessage =
      statusMessages[status] ||
      `Your application status has been updated to ${safeStatus}.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: ${statusColors[status] || '#6b7280'}; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">${status === 'approved' ? '✓' : status === 'rejected' ? '✗' : '⏳'}</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">Application ${safeStatusLabel}</h2>
          <p>Dear <strong>${safeStudentName}</strong>,</p>
          <p>${statusMessage}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Application Reference:</strong> ${applicationReference}</p>
            <p style="margin: 10px 0 0;"><strong>Status:</strong> ${safeStatusLabel}</p>
            ${comments ? `<p style="margin: 10px 0 0;"><strong>Comments:</strong> ${safeComments}</p>` : ''}
          </div>
          <p>Log in to your dashboard for more details.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      </div>
    `;

    await this.sendEmail({ 
      to, 
      subject: `Application ${status.toUpperCase()} - Mthandizi`, 
      html 
    });
  }

  private logEmailToConsole(options: EmailOptions): void {
    // Extract OTP from HTML if present
    const otpMatch = options.html.match(/>(\d{6})<\/div>/);
    const otp = otpMatch ? otpMatch[1] : 'NO_OTP_FOUND';
    
    this.logger.warn(`📝 Email suppressed (SMTP not configured): ${options.subject} -> ${options.to}`);
    this.logger.log(`🔐 🔐 🔐 OTP CODE FOR ${options.to}: ${otp} 🔐 🔐 🔐`);
    this.logger.log(`📝 Email content would have been sent to: ${options.to}`);
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] as string,
    );
  }
}