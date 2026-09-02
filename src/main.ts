import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EmailService } from './email/email.service'; // ← MUST HAVE THIS

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // FORCE EmailService to initialize
  console.log('🚀 Forcing EmailService initialization...');
  try {
    const emailService = app.get(EmailService);
    console.log('✅ EmailService initialized successfully');
    
    // Verify config
    const configService = app.get(ConfigService);
    const smtpUser = configService.get('SMTP_USER');
    const smtpPassword = configService.get('SMTP_PASSWORD');
    console.log('📧 SMTP_USER:', smtpUser || 'NOT SET');
    console.log('📧 SMTP_PASSWORD:', smtpPassword ? '✅ SET' : '❌ NOT SET');
    
    // Force the service to initialize by accessing it
    await emailService;
  } catch (error) {
    console.error('❌ Failed to initialize EmailService:', error.message);
  }
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions:{
        enableImplicitConversion:true,
      },
    }),
  );
  const configService = app.get(ConfigService);
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  app.enableCors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  });
  
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`NestJS backend running on http://localhost:${port}`);
}
bootstrap();