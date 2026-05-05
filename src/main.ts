import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: ['http://localhost:3001'], // Frontend URLs
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Optional: Add global prefix if your routes have /api prefix
  // app.setGlobalPrefix('api');
  
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  console.log(`🚀 NestJS backend running on http://localhost:${port}`);
}
bootstrap();