// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';

const UNIMA_EMAIL_DOMAIN = '@unima.ac.mw';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<any> {
    const normalizedEmail = email.trim().toLowerCase();

    // Validate email domain
    if (!normalizedEmail.endsWith(UNIMA_EMAIL_DOMAIN)) {
      throw new UnauthorizedException(
        'Only University of Malawi email addresses are allowed'
      );
    }

    // Find user by email
    const user = await this.userService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the OTP code.');
    }

    // Generate and return token
    return this.generateToken(user);
  }

  private generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role === 'admin' ? 'admin' : 'student',
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
