import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtExpiresIn = configService.get<string>('JWT_EXPIRES_IN', '1h');
        const expiresInAsNumber = Number(jwtExpiresIn);

        return {
          secret: configService.get<string>('JWT_SECRET', 'change-this-secret'),
          signOptions: {
            expiresIn: Number.isNaN(expiresInAsNumber)
              ? (jwtExpiresIn as unknown as number)
              : expiresInAsNumber,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthModule {}
