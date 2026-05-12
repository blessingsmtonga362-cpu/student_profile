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
import { SponsorModule } from './sponsor/sponsor.module';

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
    throw new Error(`Invalid DB_PORT value "${config.DB_PORT}". Expected a positive integer.`);
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
        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.getOrThrow<string>('DB_PORT')),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.getOrThrow<string>('DB_PASSWORD'),
        database: configService.getOrThrow<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
      }),
 
    }),
    UserModule,
    AuthModule,
    ApplicationModule,
    ReviewModule,
    AdminModule,
    NotificationModule,
    SponsorModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private userService: UserService) {}

  async onModuleInit() {
    // apapa i was just trying to auto-seed admin user if it doesn't exist
    try {
      await this.userService.createAdmin();
    } catch (error) {
      console.error('Failed to seed admin user:', error instanceof Error ? error.message : error);
    }
  }
}
