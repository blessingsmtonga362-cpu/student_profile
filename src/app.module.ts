import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ApplicationModule } from './application/application.module';

@Module({
  imports: [
<<<<<<< HEAD
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '2001',
      database: 'student-db',
      autoLoadEntities: true,
      synchronize: true,
=======
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'student_profile'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
      }),
>>>>>>> 1183dac4a6d13c9d822320ac53227cca0eae1c52
    }),
    UserModule,
    AuthModule,
    ApplicationModule,
  ],
})
export class AppModule {}
