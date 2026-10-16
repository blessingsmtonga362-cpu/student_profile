import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { randomInt } from 'crypto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PersonalDetails)
    private personalDetailsRepository: Repository<PersonalDetails>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // ========== CREATE USER (DIRECT CREATION - NO OTP) ==========
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const email = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOneBy({
      email,
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      email,
      university: 'unima',
      password: hashedPassword,
      role: Role.User,
      isEmailVerified: true, // Direct creation - already verified
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }

  // ========== CREATE PENDING USER (WITH OTP) ==========
  async createPendingUser(
    createUserDto: CreateUserDto,
    otp: string,
    otpExpiry: Date,
  ): Promise<User> {
    const email = createUserDto.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOneBy({
      email,
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      email,
      university: 'unima',
      password: hashedPassword,
      role: Role.User,
      otp: otp,
      otpExpiry: otpExpiry,
      isEmailVerified: false,
    });

    return await this.userRepository.save(user);
  }

  // ========== REGISTER WITH OTP VERIFICATION ==========
  async register(
    createUser: CreateUserDto,
  ): Promise<{ message: string; email: string }> {
    const email = createUser.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOneBy({
      email,
    });

    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new ConflictException('Email is already registered');
      }

      await this.resendOtp(email);
      return {
        message:
          'Registration is already in progress. A new verification code has been sent to your email.',
        email,
      };
    }

    const hashedPassword = await bcrypt.hash(createUser.password, 10);

    // Generate 6-digit OTP
    const otp = this.generateOtp();

    // Set expiry to EXACTLY 10 minutes from now
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    otpExpiry.setSeconds(0);
    otpExpiry.setMilliseconds(0);

    const user = this.userRepository.create({
      ...createUser,
      email,
      university: 'unima',
      password: hashedPassword,
      role: Role.User,
      otp: otp,
      otpExpiry: otpExpiry,
      isEmailVerified: false,
    });

    await this.userRepository.save(user);

    await this.sendRegistrationOtp(user, otp);

    return {
      message:
        'Registration successful! Please check your email for verification code. The code expires in 10 minutes.',
      email: user.email,
    };
  }

  // ========== VERIFY OTP ==========
  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{
    success: boolean;
    message: string;
    access_token?: string;
    user?: any;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.otp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }

    // Check if OTP has expired
    const now = new Date();
    if (user.otpExpiry && user.otpExpiry < now) {
      const expiredMinutes = Math.floor(
        (now.getTime() - user.otpExpiry.getTime()) / 60000,
      );
      throw new BadRequestException(
        `Verification code has expired. Please request a new code. (Expired ${expiredMinutes} minutes ago)`,
      );
    }

    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await this.userRepository.save(user);

    // Generate JWT token
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Email verified successfully',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role === 'admin' ? 'admin' : 'student',
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // ========== VERIFY EMAIL (by userId) ==========
  async verifyEmail(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isEmailVerified: true,
      otp: null,
      otpExpiry: null,
    });
  }

  // ========== RESEND OTP ==========
  async resendOtp(email: string): Promise<{ message: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findOneBy({
      email: normalizedEmail,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP
    const otp = this.generateOtp();

    await this.sendRegistrationOtp(user, otp);

    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    otpExpiry.setSeconds(0);
    otpExpiry.setMilliseconds(0);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await this.userRepository.save(user);

    return {
      message:
        'New verification code sent to your email. The code expires in 10 minutes.',
    };
  }

  // ========== UPDATE OTP ==========
  async updateOtp(userId: string, otp: string, otpExpiry: Date): Promise<void> {
    await this.userRepository.update(userId, {
      otp: otp,
      otpExpiry: otpExpiry,
    });
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async sendRegistrationOtp(user: User, otp: string): Promise<void> {
    try {
      await this.emailService.sendOtpEmail(
        user.email,
        user.firstName || 'User',
        otp,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send registration OTP email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'The verification email could not be sent. Please try again shortly or contact support.',
      );
    }
  }

  // ========== FIND USER BY EMAIL ==========
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });
  }

  // ========== FIND USER BY ID ==========
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  // ========== FIND USERS BY IDS ==========
  async findByIds(ids: string[]): Promise<User[]> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];

    if (!uniqueIds.length) {
      return [];
    }

    return this.userRepository.find({
      where: { id: In(uniqueIds) },
    });
  }

  // ========== FIND ALL ADMINS ==========
  async findAllAdmins(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: Role.Admin },
    });
  }

  // ========== FIND ALL USERS ==========
  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  // ========== FIND USER BY EMAIL (alias for consistency) ==========
  findOne(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  // ========== FIND USER BY REGISTRATION NUMBER ==========
  async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<User | null> {
    if (!registrationNumber) return null;
    const personalDetails = await this.personalDetailsRepository.findOne({
      where: { registrationNumber },
    });
    if (!personalDetails) return null;

    return this.userRepository.findOne({
      where: { id: personalDetails.userId },
    });
  }

  // ========== CREATE ADMIN USER (FOR SEEDING) ==========

  ///////////////////////////////
  async createuser() {
    const existingAdmin = await this.userRepository.findOneBy({
      email: this.configService.get<string>(
        'ADMIN_EMAIL',
        'blessings@unima.ac.mw',
      ),
    });

    if (existingAdmin) {
      this.logger.debug('Admin user already exists');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(
      this.configService.get<string>('ADMIN_PASSWORD', 'bimto27'),
      10,
    );

    const user = this.userRepository.create({
      firstName: this.configService.get<string>('USER_FIRST_NAME', 'blessings'),
      lastName: this.configService.get<string>('USER_LAST_NAME', 'network'),
      email: this.configService.get<string>(
        'FIRST_EMAIL',
        'blessingsmtonga362@gmail.com',
      ),
      password: hashedPassword,
      university: this.configService.get<string>('USERZ_UNIVERSITY', 'chanco'),
      role: Role.User,
      isEmailVerified: true,
    });

    const savedAdmin = await this.userRepository.save(user);
    this.logger.debug('Admin user created successfully');
    return savedAdmin;
  }

  // ========== GET USER PROFILE (EXCLUDING PASSWORD) ==========
  async profileDetails(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...profileDetails } = user;
    return profileDetails;
  }
}
