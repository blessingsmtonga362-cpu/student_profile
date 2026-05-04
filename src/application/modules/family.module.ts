import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FamilyController } from '../controllers/family.controller';
import { FamilyService } from '../services/family.service';
import { Family } from '../entities/family.entity';
import { FileModule } from '../../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Family]), // Register the entity
    FileModule,
  ],
  controllers: [FamilyController],
  providers: [FamilyService],
  exports: [FamilyService, TypeOrmModule.forFeature([Family])],
})
export class FamilyModule {}