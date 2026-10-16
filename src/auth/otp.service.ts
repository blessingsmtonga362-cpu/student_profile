import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import { OtpEntity } from './entities/otp.entity';
import { SendOtpDto, VerifyOtpDto, OtpResponseDto } from './dto/otp.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    private readonly emailService: EmailService,
  ) {}

  /** Generate, persist, and email an OTP to the given address. */
  async sendOtp(dto: SendOtpDto): Promise<OtpResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const purpose = dto.purpose ?? 'application_submission';

    const recentOtp = await this.otpRepository.findOne({
      where: { email, purpose, verified: false },
      order: { createdAt: 'DESC' },
    });

    if (
      recentOtp &&
      new Date(recentOtp.expiresAt) > new Date() &&
      Date.now() - new Date(recentOtp.createdAt).getTime() < 60_000
    ) {
      throw new BadRequestException(
        'A code was recently sent to this email address. Please wait before requesting another.',
      );
    }

    await this.otpRepository.update(
      { email, purpose, verified: false },
      { expiresAt: new Date() },
    );

    const code = this.generateOtpCode();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const otp = this.otpRepository.create({
      email,
      code,
      expiresAt,
      purpose,
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    try {
      await this.emailService.sendEmailOtp(email, code, this.OTP_EXPIRY_MINUTES);
    } catch (error) {
      // Invalidate the code so an undelivered OTP can never be used.
      otp.expiresAt = new Date();
      await this.otpRepository.save(otp);
      throw error;
    }

    this.logger.log(`OTP sent to ${email} for purpose="${purpose}"`);

    return {
      success: true,
      message: `Verification code sent to ${email}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /** Verify the OTP code submitted by the user. */
  async verifyOtp(dto: VerifyOtpDto): Promise<OtpResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const { code } = dto;
    const purpose = dto.purpose ?? 'application_submission';

    const otp = await this.otpRepository.findOne({
      where: { email, purpose },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new UnauthorizedException('No OTP found for this email address.');
    }

    if (new Date(otp.expiresAt) < new Date()) {
      throw new UnauthorizedException('OTP has expired. Request a new one.');
    }

    if (otp.verified) {
      throw new BadRequestException('OTP already verified.');
    }

    if (otp.attempts >= this.MAX_ATTEMPTS) {
      otp.expiresAt = new Date();
      await this.otpRepository.save(otp);
      throw new UnauthorizedException(
        'Maximum verification attempts exceeded. Request a new OTP.',
      );
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await this.otpRepository.save(otp);
      throw new UnauthorizedException(
        `Invalid code. ${this.MAX_ATTEMPTS - otp.attempts} attempts remaining.`,
      );
    }

    otp.verified = true;
    await this.otpRepository.save(otp);

    this.logger.log(`OTP verified for ${email} (${purpose})`);

    return {
      success: true,
      message: 'OTP verified successfully.',
      verified: true,
    };
  }

  /** Returns true if the email has a verified OTP for the given purpose. */
  async isEmailVerified(
    email: string,
    purpose = 'application_submission',
  ): Promise<boolean> {
    const record = await this.otpRepository.findOne({
      where: { email: email.trim().toLowerCase(), purpose, verified: true },
      order: { createdAt: 'DESC' },
    });
    return !!record;
  }

  /** Remove expired OTP rows — hook into a scheduler if desired. */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.otpRepository.delete({ expiresAt: new Date() });
    return result.affected ?? 0;
  }

  private generateOtpCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(this.OTP_LENGTH, '0');
  }
}
