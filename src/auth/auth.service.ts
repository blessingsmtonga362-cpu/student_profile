import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; 

const UNIMA_EMAIL_DOMAIN = '@unima.ac.mw';

@Injectable()
export class AuthService {
   constructor(
       private readonly userService: UserService,
       private readonly jwtService: JwtService,

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
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
        throw new UnauthorizedException();
    }
    const payload = { email: user.email, sub: user.id ,role: user.role};
    return { access_token: this.jwtService.sign(payload) };
}}
