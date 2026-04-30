import { Injectable, OnModuleInit } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/auth/role.enum';

@Injectable()
export class UserService implements OnModuleInit {
 constructor(@InjectRepository(User)
  private userRepository: Repository<User>,
  ){}

 async onModuleInit() {
    const adminExists = await this.userRepository.findOneBy({ role: Role.Admin });
    if (!adminExists) {
      await this.createAdmin();
      console.log('✅ Admin account created successfully');
    }
  }

  async create(createUser: CreateUserDto):Promise<User> {
    const hashedPassword = await bcrypt.hash(createUser.password, 10);
    const user = this.userRepository.create({ ...createUser, password: hashedPassword ,role: Role.User});
    return this.userRepository.save(user);
  }

  async createAdmin(){
    const hashedPassword = await bcrypt.hash('bimto27', 10);
    const user = this.userRepository.create({university:'chanco',firstName:'blessings',lastName:'network',email:'blessings@network.com',password: hashedPassword ,role: Role.Admin});
    return this.userRepository.save(user);
  }

  findAll():Promise<User[]> {
    return this.userRepository.find();
  }

  findOne(email: string):Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }
}
