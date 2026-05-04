import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';

@Injectable()
export class UserService implements OnModuleInit {
 constructor(
  @InjectRepository(User)
  private userRepository: Repository<User>,
  private readonly configService: ConfigService,
  ){}

 async onModuleInit() {
    const adminExists = await this.userRepository.findOneBy({ role: Role.Admin });
    if (!adminExists) {
      await this.createAdmin();
      console.log('Admin account created successfully');
    }
  }

  async create(createUser: CreateUserDto):Promise<User> {
    const existingUser = await this.userRepository.findOneBy({
      email: createUser.email,
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(createUser.password, 10);
    const user = this.userRepository.create({ ...createUser, password: hashedPassword ,role: Role.User});
    return this.userRepository.save(user);
  }

  async createAdmin(){
    const hashedPassword = await bcrypt.hash(
      this.configService.get<string>('ADMIN_PASSWORD', 'bimto27'),
      10,
    );
    const user = this.userRepository.create({
      university: this.configService.get<string>('ADMIN_UNIVERSITY', 'chanco'),
      firstName: this.configService.get<string>('ADMIN_FIRST_NAME', 'blessings'),
      lastName: this.configService.get<string>('ADMIN_LAST_NAME', 'network'),
      email: this.configService.get<string>(
        'ADMIN_EMAIL',
        'blessings@network.com',
      ),
      password: hashedPassword,
      role: Role.Admin,
    });
    return this.userRepository.save(user);
  }

  findAll():Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(email: string):Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }
<<<<<<< HEAD
  // In user.service.ts
async findByRegistrationNumber(registrationNumber: string) {
  return await this.userRepository.findOne({ 
    where: { registrationNumber: registrationNumber }
  });
}
=======

  async profileDetails(userId: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...profileDetails } = user;
    return profileDetails;
  }
>>>>>>> 1183dac4a6d13c9d822320ac53227cca0eae1c52
}
