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

  // Generic method to send any email
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
    if (!this.transporter) {
      // Fallback to console logging if email not configured
      this.logEmailToConsole(options);
      return { success: true }; // Consider as success for development
    }

    try {
      const mailOptions = {
        from: `"Mthandizi Support" <${this.configService.get('SMTP_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${options.to}, Subject: ${options.subject}, Message ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      // Fallback to console logging
      this.logEmailToConsole(options);
      throw error;
    }
  }

  // Send OTP verification email
  async sendOtpEmail(to: string, name: string, otp: string) {
    const html = `
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
    `;

    return this.sendEmail({ to, subject: 'Your Verification Code - Mthandizi Student Portal', html });
  }

  // Send application submission confirmation to student
  async sendApplicationSubmittedEmail(to: string, studentName: string, applicationReference: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #4caf50; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">✓</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">Application Submitted Successfully!</h2>
          <p>Dear <strong>${studentName}</strong>,</p>
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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Mthandizi Admin Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: #ff9800; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">📝</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">New Application Submitted</h2>
          <p>Dear <strong>${adminName}</strong>,</p>
          <p>A new application has been submitted and requires your review.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Student Name:</strong> ${studentName}</p>
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

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Mthandizi Student Portal</h2>
        </div>
        <div style="padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background-color: ${statusColors[status] || '#6b7280'}; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 30px;">${status === 'approved' ? '✓' : status === 'rejected' ? '✗' : '⏳'}</span>
            </div>
          </div>
          <h2 style="color: #1e3a5f; text-align: center;">Application ${status.toUpperCase()}</h2>
          <p>Dear <strong>${studentName}</strong>,</p>
          <p>${statusMessages[status] || `Your application status has been updated to ${status}.`}</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Application Reference:</strong> ${applicationReference}</p>
            <p style="margin: 10px 0 0;"><strong>Status:</strong> ${status.toUpperCase()}</p>
            ${comments ? `<p style="margin: 10px 0 0;"><strong>Comments:</strong> ${comments}</p>` : ''}
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

  // Helper method to log email to console (for development when email is not configured)
  private logEmailToConsole(options: EmailOptions): void {
    console.log('\n' + '='.repeat(60));
    console.log(`📧 EMAIL (Development Mode)`);
    console.log('='.repeat(60));
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Content:`);
    console.log('-'.repeat(40));
    console.log(this.stripHtml(options.html));
    console.log('-'.repeat(40));
    console.log('='.repeat(60) + '\n');
  }

  // Helper method to strip HTML tags for plain text version
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}