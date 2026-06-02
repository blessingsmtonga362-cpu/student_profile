import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import { OtpEntity } from './entities/otp.entity';
import { SendOtpDto, VerifyOtpDto, OtpResponseDto } from './dto/otp.dto';

/** * OTP Service — SMS delivery via Africa's Talking official Node.js SDK. ...apapa lets hope itheka maguy
* * Sandbox:  username = "sandbox"  (set in .env)
* Live:     username = your app name in the AT dashboard */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OtpEntity)
    private readonly otpRepository: Repository<OtpEntity>,
    private readonly configService: ConfigService,
  ) {}

  // Public API yomwe titenge ikhala iyiyi apa

  /** Generate, persist, and send an OTP to the given phone number via SMS. */
  async sendOtp(dto: SendOtpDto): Promise<OtpResponseDto> {
    const { phoneNumber, purpose = 'phone_verification' } = dto;

    // Rate-limit: one OTP per phone per 60 seconds
    const recentOtp = await this.otpRepository.findOne({
      where: { phoneNumber, verified: false },
      order: { createdAt: 'DESC' },
    });

    if (
      recentOtp &&
      new Date(recentOtp.expiresAt) > new Date() &&
      Date.now() - new Date(recentOtp.createdAt).getTime() < 60_000
    ) {
      throw new BadRequestException(
        'A code was recently sent to this number. Please wait before requesting another.',
      );
    }

    // Expire all previous unverified OTPs for this phone + purpose
    await this.otpRepository.update(
      { phoneNumber, purpose, verified: false },
      { expiresAt: new Date() },
    );

    // Generate and persist the new OTP
    const code = this.generateOtpCode();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const otp = this.otpRepository.create({
      phoneNumber,
      code,
      expiresAt,
      purpose,
      attempts: 0,
    });
    await this.otpRepository.save(otp);

    // Deliver via SMS
    const normalised = this.normalizePhone(phoneNumber);
    await this.sendViaSms(phoneNumber, code);

    this.logger.log(`OTP sent to ${normalised} for purpose="${purpose}"`);

    return {
      success: true,
      message: `Verification code sent to ${phoneNumber}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
      expiresIn: this.OTP_EXPIRY_MINUTES * 60,
    };
  }

  /** Verify the OTP code submitted by the user. */
  async verifyOtp(dto: VerifyOtpDto): Promise<OtpResponseDto> {
    const { phoneNumber, code, purpose = 'phone_verification' } = dto;

    const otp = await this.otpRepository.findOne({
      where: { phoneNumber, purpose },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new UnauthorizedException('No OTP found for this phone number.');
    }

    if (new Date(otp.expiresAt) < new Date()) {
      throw new UnauthorizedException('OTP has expired. Request a new one.');
    }

    if (otp.verified) {
      throw new BadRequestException('OTP already verified.');
    }

    if (otp.attempts >= this.MAX_ATTEMPTS) {
      otp.expiresAt = new Date(); // expire immediately
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

    this.logger.log(`OTP verified for ${phoneNumber} (${purpose})`);

    return {
      success: true,
      message: 'OTP verified successfully.',
      verified: true,
    };
  }

  /** Returns true if the phone has a verified OTP for the given purpose. */
  async isPhoneVerified(
    phoneNumber: string,
    purpose = 'phone_verification',
  ): Promise<boolean> {
    const record = await this.otpRepository.findOne({
      where: { phoneNumber, purpose, verified: true },
      order: { createdAt: 'DESC' },
    });
    return !!record;
  }

  /** Remove expired OTP rows — hook into a scheduler if desired. */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.otpRepository.delete({ expiresAt: new Date() });
    return result.affected ?? 0;
  }

  //  Private helpers mmene analongosolera mu documentetion ija simnasithe kwambiri just follow 

  private generateOtpCode(): string {
    return Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(this.OTP_LENGTH, '0');
  }

  /** ndakuyikila the following instructions kuti ku froentend titha kutumiza phone number mu different formats, and this function idzakonza kuti ikhale mu format yomwe Africa's Talking imafuna.
  * Normalise any Malawi phone number to international format (+265XXXXXXXXX).
  * Africa's Talking requires the + prefix.
  * Numbers are stored as +265XXXXXXXXX so this is mostly a safety net.
  *   "+265991234567"  → "+265991234567"
  *   "265991234567"   → "+265991234567"
  *   "0991234567"     → "+265991234567"
  *   "991234567"      → "+265991234567"
  */
  private normalizePhone(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('265') && digits.length === 12) return `+${digits}`;
    if (digits.startsWith('0') && digits.length === 10) return `+265${digits.slice(1)}`;
    if ((digits.startsWith('8') || digits.startsWith('9')) && digits.length === 9) return `+265${digits}`;
    // Already correct or unknown — return as-is
    return phoneNumber.startsWith('+') ? phoneNumber : `+265${digits}`;
  }

  //  SMS delivery via Africa's Talking (Node https — preserves header casing) 

  /** ma instructin ali mmusiwa ndawalemba mwa straightforward kuti ife titha kutumiza SMS using Africa's Talking, ndipo ndagwiritsa ntchito Node's built-in https module chifukwa Africa's Talking imafuna header key kuti ikhale exactly `apiKey` (camelCase), ndipo axios imasinthe header keys kukhala lowercase, zomwe zimayambitsa mavuto. Node's https.request imasunga header casing monga momwe zilili.
  * Send the OTP via Africa's Talking SMS REST API.
  *
  * We use Node's built-in `https` module instead of axios because axios
  * normalises header keys to lowercase before sending, but Africa's Talking
  * requires the header to be exactly `apiKey` (camelCase).
  * Node's https.request preserves the header casing as written.
  *
  * Sandbox : https://api.sandbox.africastalking.com/version1/messaging
  * Live    : https://api.africastalking.com/version1/messaging
  *
  * Required .env:
  *   AFRICAS_TALKING_API_KEY   — sandbox app API key from AT dashboard
  *   AFRICAS_TALKING_USERNAME  — "sandbox" for test, your app name for live
  */
  private sendViaSms(phoneNumber: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('AFRICAS_TALKING_API_KEY');
    const username = this.configService.get<string>(
      'AFRICAS_TALKING_USERNAME',
      'sandbox',
    );

    if (!apiKey) {
      return Promise.reject(
        new BadRequestException(
          'AFRICAS_TALKING_API_KEY is not configured in .env.',
        ),
      );
    }

    const recipient = this.normalizePhone(phoneNumber);
    const isSandbox = username === 'sandbox';
    const hostname = isSandbox
      ? 'api.sandbox.africastalking.com'
      : 'api.africastalking.com';

    const message =
      `Your Mthandizi verification code is: ${code}. ` +
      `Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share it.`;

    const body = new URLSearchParams({ username, to: recipient, message }).toString();

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname,
          path: '/version1/messaging',
          method: 'POST',
          headers: {
            // Africa's Talking requires exact camelCase — do NOT rename this
            apiKey,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk: string) => (raw += chunk));
          res.on('end', () => {
            // AT returns 201 on success
            if (res.statusCode === 201 || res.statusCode === 200) {
              try {
                const parsed = JSON.parse(raw) as {
                  SMSMessageData: {
                    Message: string;
                    Recipients: Array<{
                      number: string;
                      status: string;
                      statusCode: number;
                      cost: string;
                    }>;
                  };
                };
                for (const r of parsed.SMSMessageData?.Recipients ?? []) {
                  if (r.statusCode === 101) {
                    this.logger.log(
                      `[AT SMS] Sent to ${r.number} — ${r.status}, cost: ${r.cost}`,
                    );
                  } else {
                    this.logger.warn(
                      `[AT SMS] Delivery issue for ${r.number} — ${r.status} (${r.statusCode})`,
                    );
                  }
                }
              } catch {
                this.logger.log(`[AT SMS] Response: ${raw}`);
              }
              resolve();
            } else {
              const err = `HTTP ${res.statusCode}: ${raw}`;
              this.logger.error(`[AT SMS] Failed — ${err}`);
              reject(new BadRequestException(`Failed to send verification SMS: ${err}`));
            }
          });
        },
      );

      req.on('error', (err: Error) => {
        this.logger.error(`[AT SMS] Request error: ${err.message}`);
        reject(new BadRequestException(`Failed to send verification SMS: ${err.message}`));
      });

      req.write(body);
      req.end();
    });
  }
}
