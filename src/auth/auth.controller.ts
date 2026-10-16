import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthGuard } from './auth.guard';
import { Public } from './metadata';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    if (!body?.email || !body?.otp) {
      throw new BadRequestException('Email and OTP are required');
    }
    return this.userService.verifyOtp(body.email, body.otp);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required');
    }
    return this.userService.resendOtp(body.email);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  /**
   * OTP endpoints for email verification during application submission.
   */

  @Public()
  @Post('send-email-otp')
  @HttpCode(HttpStatus.OK)
  async sendEmailOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  @Public()
  @Post('verify-email-otp')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }

  @Public()
  @Post('check-email-verified')
  @HttpCode(HttpStatus.OK)
  async checkEmailVerified(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException('Email is required');
    }
    const verified = await this.otpService.isEmailVerified(body.email, 'application_submission');
    return {
      success: true,
      verified,
    };
  }
}
