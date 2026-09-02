import { Controller, Get, Post, Body, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthGuard } from './auth.guard';
import { Public } from './metadata';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { EmailService } from '../email/email.service'; // Add this import

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly userService: UserService,
    private readonly emailService: EmailService, // Add this
  ) {
    console.log('✅ AuthController initialized with EmailService');
    // Force EmailService initialization
    this.emailService;
  }

  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.userService.verifyOtp(body.email, body.otp);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() body: { email: string }) {
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
   * OTP Endpoints for Phone Verification (Application Submission)
   */

  @Public()
  @Post('send-phone-otp')
  @HttpCode(HttpStatus.OK)
  async sendPhoneOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  @Public()
  @Post('verify-phone-otp')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }

  @Public()
  @Post('check-phone-verified')
  @HttpCode(HttpStatus.OK)
  async checkPhoneVerified(@Body() body: { phoneNumber: string }) {
    const verified = await this.otpService.isPhoneVerified(body.phoneNumber, 'application_submission');
    return {
      success: true,
      verified,
    };
  }

  // Add test endpoint
  @Public()
  @Get('email-status')
  async emailStatus() {
    return { 
      status: 'Email service is available',
      timestamp: new Date().toISOString()
    };
  }
}