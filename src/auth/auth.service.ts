// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';

const UNIMA_EMAIL_DOMAIN = '@unima.ac.mw';

@Injectable()
export class AuthService {  // Make sure 'export' is here
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}


   ){}
async validateUser(email: string, pass: string): Promise<{access_token: string}> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(UNIMA_EMAIL_DOMAIN)) {
        throw new UnauthorizedException('Only University of Malawi email addresses are allowed');
    }
    const user = await this.userService.findOne(normalizedEmail);
    if (!user ) {
        throw new UnauthorizedException();

    }
    
    const payload = { email: user.email, sub: user.id, role: user.role };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        registrationNumber: user.registrationNumber,
      }
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.findOne(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }
}