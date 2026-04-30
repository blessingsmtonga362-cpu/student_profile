import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { jwtConstants } from './auth.constant';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [UserModule, JwtModule.register({
    secret: jwtConstants.secret,
    signOptions: { expiresIn: '1h' },
  global: true })],
  controllers: [AuthController],
  providers: [AuthService,{
    provide:APP_GUARD,
    useClass:AuthGuard
  },{
    provide:APP_GUARD,
    useClass:RolesGuard
  }
],

})
export class AuthModule {}
