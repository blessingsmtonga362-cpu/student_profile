// src/auth/auth.controller.ts
import { Controller, Get, Post, Body, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Public } from './metadata';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}