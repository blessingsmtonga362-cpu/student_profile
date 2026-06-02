import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OtpEntity } from './entities/otp.entity';
import { SendOtpDto, VerifyOtpDto, OtpResponseDto } from './dto/otp.dto';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OtpEntity)
    private otpRepository: Repository<OtpEntity>,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random OTP code
   */
  private generateOtpCode(): string {
    return Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(this.OTP_LENGTH, '0');
  }

  /**
   * Send OTP to phone number
   */
  async sendOtp(dto: SendOtpDto): Promise<OtpResponseDto> {
    const { phoneNumber, purpose = 'phone_verification' } = dto;

    // Check if there's a valid OTP already sent in the last minute
    const recentOtp = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        verified: false,
        createdAt: new Date(Date.now() - 60000), // Last 1 minute
      },
      order: { createdAt: 'DESC' },
    });

    if (recentOtp && new Date(recentOtp.expiresAt) > new Date()) {
      throw new BadRequestException(
        'An OTP was recently sent to this number. Please wait before requesting another.',
      );
    }

    // Invalidate previous unverified OTPs for this phone/purpose
    await this.otpRepository.update(
      { phoneNumber, purpose, verified: false },
      { expiresAt: new Date() }, // Expire immediately
    );

    // Generate new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Save to database
    const otp = this.otpRepository.create({
      phoneNumber,
      code,
      expiresAt,
      purpose,
      attempts: 0,
    });

    await this.otpRepository.save(otp);

    // Send OTP via SMS
    await this.sendViaSms(phoneNumber, code);

    this.logger.log(`OTP sent to ${phoneNumber} for ${purpose}`);

    return {
      success: true,
      message: `OTP sent to ${phoneNumber}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<OtpResponseDto> {
    const { phoneNumber, code, purpose = 'phone_verification' } = dto;

    // Find the most recent OTP for this phone
    const otp = await this.otpRepository.findOne({
      where: { phoneNumber, purpose },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new UnauthorizedException('No OTP found for this phone number.');
    }

    // Check if expired
    if (new Date(otp.expiresAt) < new Date()) {
      throw new UnauthorizedException('OTP has expired. Request a new one.');
    }

    // Check if already verified
    if (otp.verified) {
      throw new BadRequestException('OTP already verified.');
    }

    // Check attempts
    if (otp.attempts >= this.MAX_ATTEMPTS) {
      // Expire the OTP
      otp.expiresAt = new Date();
      await this.otpRepository.save(otp);
      throw new UnauthorizedException(
        `Maximum verification attempts exceeded. Request a new OTP.`,
      );
    }

    // Verify code
    if (otp.code !== code) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new UnauthorizedException(
        `Invalid OTP code. ${this.MAX_ATTEMPTS - otp.attempts} attempts remaining.`,
      );
    }

    // Mark as verified
    otp.verified = true;
    await this.otpRepository.save(otp);

    this.logger.log(`OTP verified for ${phoneNumber} (${purpose})`);

    return {
      success: true,
      message: 'OTP verified successfully.',
      verified: true,
    };
  }

  /**
   * Check if phone has a verified OTP
   */
  async isPhoneVerified(
    phoneNumber: string,
    purpose = 'phone_verification',
  ): Promise<boolean> {
    const verified = await this.otpRepository.findOne({
      where: {
        phoneNumber,
        purpose,
        verified: true,
      },
      order: { createdAt: 'DESC' },
    });

    return !!verified;
  }

  /**
   * Send OTP via SMS using Twilio or Africa's Talking
   */
  private async sendViaSms(phoneNumber: string, code: string) {
    const provider = this.configService.get<string>(
      'OTP_PROVIDER',
      'console',
    );

    if (provider === 'twilio') {
      await this.sendViaTwilioSms(phoneNumber, code);
    } else if (provider === 'africastalking') {
      await this.sendViaAfricasTalking(phoneNumber, code);
    } else if (provider === 'console') {
      // Development mode - log to console
      this.logger.log(`[DEV MODE] OTP Code: ${code} sent to ${phoneNumber}`);
    } else {
      throw new BadRequestException(
        'OTP provider not configured correctly. Set OTP_PROVIDER in .env.',
      );
    }
  }

  /**
   * Send via Twilio SMS API
   * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM
   */
  private async sendViaTwilioSms(phoneNumber: string, code: string) {
    try {
      const accountSid = this.configService.get<string>(
        'TWILIO_ACCOUNT_SID',
      );
      const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
      const fromNumber = this.configService.get<string>(
        'TWILIO_SMS_FROM',
      );

      if (!accountSid || !authToken || !fromNumber) {
        this.logger.warn('Twilio credentials not configured');
        throw new BadRequestException('Twilio SMS credentials are not configured.');
      }

      const recipient = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+${phoneNumber.replace(/\D/g, '')}`;

      const payload = new URLSearchParams();
      payload.append('From', fromNumber);
      payload.append('To', recipient);
      payload.append('Body', `Your verification code is: ${code}`);

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        payload.toString(),
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log(
        `[TWILIO SMS] Sent OTP ${code} to ${recipient} from ${fromNumber}`,
      );
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message ||
        'Failed to send OTP via Twilio SMS';
      this.logger.error(`Failed to send OTP via Twilio SMS: ${errorMessage}`);
      throw new BadRequestException(`Failed to send OTP: ${errorMessage}`);
    }
  }

  /**
   * Send via Africa's Talking SMS API
   * Requires: AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME
   */

  private async sendViaAfricasTalking(phoneNumber: string, code: string) {
    try {
      const apiKey = this.configService.get<string>(
        'AFRICAS_TALKING_API_KEY',
      );
      const username = this.configService.get<string>(
        'AFRICAS_TALKING_USERNAME',
      );

      if (!apiKey || !username) {
        this.logger.warn("Africa's Talking credentials not configured");
        throw new BadRequestException("Africa's Talking credentials are not configured.");
      }

      // For now, log the intent
      this.logger.log(
        `[AFRICAS_TALKING] Sending OTP ${code} to ${phoneNumber}`,
      );

      // TODO: Implement actual Africa's Talking integration
      // const axios = require('axios');
      // await axios.post('https://api.sandbox.africastalking.com/version1/messaging', {
      //   username,
      //   recipients: [phoneNumber],
      //   message: `Your verification code is: ${code}`,
      // }, {
      //   headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      //   auth: { username, password: apiKey }
      // });
    } catch (error) {
      this.logger.error(
        `Failed to send OTP via Africa's Talking: ${error.message}`,
      );
      throw new BadRequestException('Failed to send OTP');
    }
  }

  /**
   * Cleanup expired OTPs (run periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.otpRepository.delete({
      expiresAt: new Date(),
    });
    return result.affected || 0;
  }
}
