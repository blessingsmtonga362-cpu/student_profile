import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; 

@Injectable()
export class AuthService {
   constructor(
       private readonly userService: UserService,
       private readonly jwtService: JwtService,

   ){}
async validateUser(email: string, pass: string): Promise<{access_token: string}> {
    const user = await this.userService.findOne(email);
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
