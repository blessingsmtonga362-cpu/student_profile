import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

import { Public } from 'src/auth/metadata';
import { Role } from 'src/auth/role.enum';
import { Roles } from 'src/auth/role.decorator';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Public()
  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  @Roles(Role.Admin)
  @Get('profile')
  findAll() {
    return this.userService.findAll();
  }

  
}