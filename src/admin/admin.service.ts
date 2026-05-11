import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileData } from 'src/application/entities/profile_data';
import { PersonalDetails } from 'src/application/entities/personal_details.entity';
import { ReviewService } from 'src/application/services/reviewService';
import { CreateAdminDto } from './dto/create-admin.dto';

@Injectable()
export class AdminService {
constructor(
  @InjectRepository(ProfileData)
  private readonly profileRepo: Repository<ProfileData>,
  @Inject(forwardRef(() => ReviewService))
  private readonly reviewRepo: ReviewService
){}

async syncProfile(personal: PersonalDetails) {
  if (!personal) return;

  const { userId } = personal;

  let profile = await this.profileRepo.findOne({
    where: { userId }
  });

  // CREATE NEW PROFILE IF NOT EXISTS.....upapangenso check apapa ...this logic ndimayiyikila kuti can add awiri on one user
  if (!profile) {
    profile = this.profileRepo.create({
      userId
    });
  }

  // ndupanga copy data from ma filds
  profile.firstName = personal.firstName;
  profile.lastName = personal.lastName;
  profile.registrationNumber = personal.registrationNumber;

  await this.profileRepo.save(profile);
}

async getProfiles(){
  return await this.profileRepo.find()
}
viewmore(userId: string){
  return this.reviewRepo.getCompleteApplication(userId);
}

async reviewApplication(userId: string, createAdminDto: CreateAdminDto) {
  const { status, reviewComments } = createAdminDto;

  const profile = await this.profileRepo.findOne({
    where: { userId }
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  profile.status = status;
  profile.reviewComments = reviewComments;

  await this.profileRepo.save(profile);

  return { message: 'Application reviewed successfully' };

}



}
