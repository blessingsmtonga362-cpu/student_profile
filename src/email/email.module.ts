import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule implements OnModuleInit {
  constructor(private emailService: EmailService) {
    console.log('📧 EmailModule constructor called');
  }

  async onModuleInit() {
    console.log('📧 EmailModule onModuleInit - forcing EmailService initialization');
    // This will force EmailService to initialize
    await this.emailService;
    console.log('✅ EmailService initialization complete');
  }
}