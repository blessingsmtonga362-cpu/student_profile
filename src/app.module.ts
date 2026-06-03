import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'fs';
import { join } from 'path';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationModule } from './application/application.module';
import { ReviewModule } from './application/modules/review.module';
import { AdminModule } from './admin/admin.module';
import { UserService } from './user/user.service';
import { NotificationModule } from './notification/module/notification.module';
import { EmailModule } from './email/email.module';
import { SponsorModule } from './sponsor/sponsor.module';
import { RankingModule } from './ranking/ranking.module';
import { PaychanguModule } from './paychangu/paychangu.module';
import { TransferModule } from './transfer/transfer.module';

const envFilePath = join(process.cwd(), '.env');

if (!existsSync(envFilePath)) {
  throw new Error(
    `Missing .env file at ${envFilePath}. Create it from .env.example before starting the application.`,
  );
}

function validateEnv(config: Record<string, string | undefined>) {
  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
  ] as const;

  const missingVars = requiredVars.filter((key) => {
    const value = config[key];
    return typeof value !== 'string' || value.trim() === '';
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. Check your .env file.`,
    );
  }

  const dbPort = Number(config.DB_PORT);
  if (!Number.isInteger(dbPort) || dbPort <= 0) {
    throw new Error(
      `Invalid DB_PORT value "${config.DB_PORT}". Expected a positive integer.`,
    );
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'blessings'),
        password: configService.get<string>('DB_PASSWORD', '2745'),
        database: configService.get<string>('DB_NAME', 'student_profile'), //
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNC', 'true') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    UserModule,
    AuthModule,
    ApplicationModule,
    ReviewModule,
    AdminModule,
    NotificationModule,
    EmailModule,
    SponsorModule,
    RankingModule,
    PaychanguModule,
    TransferModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private userService: UserService) {}

  async onModuleInit() {
    try {
      await this.userService.createAdmin();
    } catch (error) {
      console.error(
        'Failed to seed admin user:',
        error instanceof Error ? error.message : error,
      );
    }
  }
}
