import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sponsor } from './entities/sponsor.entity';
import { SponsorAllocation } from './entities/sponsor-allocation.entity';
import { SponsorService } from './sponsor.service';
import { SponsorController } from './sponsor.controller';
import { ProfileData } from 'src/application/entities/profile_data';
import { FileModule } from 'src/file/file.module';
import { ReviewModule } from 'src/application/modules/review.module';
import { UserModule } from 'src/user/user.module';
import { RankingModule } from 'src/ranking/ranking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sponsor, SponsorAllocation, ProfileData]),
    FileModule,
    forwardRef(() => ReviewModule),
    UserModule,
    RankingModule,
  ],
  controllers: [SponsorController],
  providers: [SponsorService],
  exports: [SponsorService],
})
export class SponsorModule {}