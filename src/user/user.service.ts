
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/role.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async create(createUser: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.userRepository.findOneBy({
      email: createUser.email,
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(createUser.password, 10);
    const user = this.userRepository.create({
      ...createUser,
      password: hashedPassword,
      role: Role.User,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...result } = savedUser;
    return result;
  }
//because ndinapanga zoti ma user onse amene akupanga register azikhala ndi role ya user by default not giving them chance to choose so im just seeding the admin
  async createAdmin() {
    const existingAdmin = await this.userRepository.findOneBy({
      email: this.configService.get<string>('ADMIN_EMAIL', 'blessings@unima.ac.mw'),
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(
      this.configService.get<string>('ADMIN_PASSWORD', 'bimto27'),
      10,
    );
    const user = this.userRepository.create({
      firstName: this.configService.get<string>('ADMIN_FIRST_NAME', 'blessings'),
      lastName: this.configService.get<string>('ADMIN_LAST_NAME', 'network'),
      email: this.configService.get<string>('ADMIN_EMAIL', 'blessings@unima.ac.mw'),
      password: hashedPassword,
      university: this.configService.get<string>('ADMIN_UNIVERSITY', 'chanco'),
      registrationNumber: this.configService.get<string>('ADMIN_REGISTRATION_NUMBER'), // Admins do not have registration numbers
      role: Role.Admin,
    });
    const savedAdmin = await this.userRepository.save(user);
    console.log('Admin user created successfully');
    return savedAdmin;
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }


async findByRegistrationNumber(registrationNumber: string) {
    if (!registrationNumber) return null;
    return await this.userRepository.findOne({
      where: { registrationNumber },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async profileDetails(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...profileDetails } = user;
    return profileDetails;
  }}