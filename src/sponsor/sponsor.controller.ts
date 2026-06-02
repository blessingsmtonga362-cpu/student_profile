import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/role.decorator';
import { Role } from 'src/auth/role.enum';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { SponsorService } from './sponsor.service';

@Controller('sponsors')
export class SponsorController {
  constructor(private readonly sponsorService: SponsorService) {}

  @Roles(Role.Admin)
  @Get()
  getSponsors() {
    return this.sponsorService.getSponsors();
  }

  @Roles(Role.Admin)
  @Get(':id')
  getSponsor(@Param('id') id: string) {
    return this.sponsorService.getSponsorById(id);
  }

  @Roles(Role.Admin)
  @Delete(':id')
  deleteSponsor(@Param('id') id: string) {
    return this.sponsorService.deleteSponsor(id);
  }

  @Roles(Role.Admin)
  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  createSponsor(
    @Body() createSponsorDto: CreateSponsorDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.sponsorService.createSponsor(createSponsorDto, logo);
  }
}