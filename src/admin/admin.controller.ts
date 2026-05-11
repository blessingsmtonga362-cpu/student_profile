import { Controller, Get, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/role.decorator';
import { ReviewService } from 'src/application/services/reviewService';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService,
    private readonly reviewService: ReviewService

  ) {}

  @Roles(Role.Admin)
  @Get()
  getProfile() {
    return this.adminService.getProfiles();
  }

  @Roles(Role.Admin)
  @Get('users/:userId')
  getUserApplication(@Param('userId') userId: string) {
    return this.adminService.viewmore(userId);
  }

 
}
