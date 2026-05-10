// src/user/user.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(createUser: CreateUserDto): Promise<{ message: string; email: string }> {
    const existingUser = await this.userRepository.findOneBy({
      email: createUser.email,
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(createUser.password, 10);
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ✅ Set expiry to EXACTLY 10 minutes from now
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    otpExpiry.setSeconds(0);
    otpExpiry.setMilliseconds(0);

    const user = this.userRepository.create({ 
      ...createUser, 
      password: hashedPassword,
      role: Role.User,
      otp: otp,
      otpExpiry: otpExpiry,
      isEmailVerified: false,
    });
    
    await this.userRepository.save(user);
    
    // Send OTP email
    await this.emailService.sendOtpEmail(user.email, user.firstName || 'User', otp);
    
    return {
      message: 'Registration successful! Please check your email for verification code. The code expires in 10 minutes.',
      email: user.email,
    };
  }

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string; access_token?: string; user?: any }> {
    const user = await this.userRepository.findOneBy({ email });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    
    if (user.otp !== otp) {
      throw new BadRequestException('Invalid verification code');
    }
    
    // ✅ Check if OTP has expired (exactly 10 minutes)
    const now = new Date();
    if (user.otpExpiry && user.otpExpiry < now) {
      const expiredMinutes = Math.floor((now.getTime() - user.otpExpiry.getTime()) / 60000);
      throw new BadRequestException(`Verification code has expired. Please request a new code. (Expired ${expiredMinutes} minutes ago)`);
    }
    
    // Mark email as verified and clear OTP
    user.isEmailVerified = true;
    user.otp = null as any;
    user.otpExpiry = null as any;
    await this.userRepository.save(user);
    
    // Generate JWT token
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };
    const token = this.jwtService.sign(payload);
    
    return {
      success: true,
      message: 'Email verified successfully',
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        registrationNumber: user.registrationNumber,
      },
    };
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOneBy({ email });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ✅ Reset expiry to 10 minutes from now
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);
    otpExpiry.setSeconds(0);
    otpExpiry.setMilliseconds(0);
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await this.userRepository.save(user);
    
    // Send new OTP email
    await this.emailService.sendOtpEmail(user.email, user.firstName || 'User', otp);
    
    return {
      message: 'New verification code sent to your email. The code expires in 10 minutes.',
    };
  }

  async createAdmin() {
    const hashedPassword = await bcrypt.hash(
      this.configService.get<string>('ADMIN_PASSWORD', 'bimto27'),
      10,
    );
    const user = this.userRepository.create({
      university: this.configService.get<string>('ADMIN_UNIVERSITY', 'chanco'),
      firstName: this.configService.get<string>('ADMIN_FIRST_NAME', 'blessings'),
      lastName: this.configService.get<string>('ADMIN_LAST_NAME', 'network'),
      email: this.configService.get<string>('ADMIN_EMAIL', 'blessings@network.com'),
      password: hashedPassword,
      role: Role.Admin,
    });
    return this.userRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findByRegistrationNumber(registrationNumber: string) {
    return await this.userRepository.findOne({ 
      where: { registrationNumber: registrationNumber }
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async profileDetails(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...profileDetails } = user;
    return profileDetails;
  }
}