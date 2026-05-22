import { Body, Controller, Get, Post, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from '../auth/metadata';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/role.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  
  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.userService.register(createUserDto);
  }

  @Public()
  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    if (!body.email || !body.otp) {
      throw new BadRequestException('Email and OTP are required');
    }
    return await this.userService.verifyOtp(body.email, body.otp);
  }

  @Public()
  @Post('resend-otp')
  async resendOtp(@Body() body: { email: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return await this.userService.resendOtp(body.email);
  }
  
  @Roles(Role.Admin)
  @Get('profile')
  findAll() {
    return this.userService.findAll();
  }
}