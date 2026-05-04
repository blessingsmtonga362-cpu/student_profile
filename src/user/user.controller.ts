import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Public } from '../auth/metadata';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/role.decorator';


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

  @Get('profile_details')
  profileDetails(@Request() req: { user: { sub: number } }) {
    return this.userService.profileDetails(req.user.sub);
  }
}
