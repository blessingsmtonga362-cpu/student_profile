import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';


const UNIMA_EMAIL_DOMAIN = '@unima.ac.mw';

@Injectable()
export class AuthService {

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  // VALIDATE USER
  async validateUser(email: string, password: string) {

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.endsWith(UNIMA_EMAIL_DOMAIN)) {
      throw new UnauthorizedException(
        'Only University of Malawi email addresses are allowed'
      );
    }

    const user = await this.userService.findOne(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatched =
      await bcrypt.compare(password, user.password);

    if (!passwordMatched) {
      throw new UnauthorizedException('Invalid credentials');
    }
//ndapanga kut after upanga verify izibweresa user yemweno will user pa login in paja
    return this.login(user);
  }

  // LOGIN
  async login(user: any) {

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
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        registrationNumber: user.registrationNumber,
      },
    };
  }
}