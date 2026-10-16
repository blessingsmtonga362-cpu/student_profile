import {
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { PersonalDetails } from '../application/entities/personal_details.entity';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

describe('UserService registration', () => {
  let service: UserService;
  let userRepository: jest.Mocked<
    Pick<Repository<User>, 'findOneBy' | 'create' | 'save'>
  >;
  let emailService: jest.Mocked<Pick<EmailService, 'sendOtpEmail'>>;
  const userConfig: Record<string, string> = {};

  beforeEach(async () => {
    Object.keys(userConfig).forEach((key) => delete userConfig[key]);
    userRepository = {
      findOneBy: jest.fn(),
      create: jest.fn((user) => user as User),
      save: jest.fn(),
    };
    emailService = {
      sendOtpEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(PersonalDetails),
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => userConfig[key]) },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resends a code when registration is retried for an unverified account', async () => {
    const pendingUser = {
      email: 'student@example.com',
      firstName: 'Student',
      isEmailVerified: false,
      otp: '123456',
      otpExpiry: new Date(Date.now() + 60_000),
    } as User;
    userRepository.findOneBy.mockResolvedValue(pendingUser);
    userRepository.save.mockResolvedValue(pendingUser);
    emailService.sendOtpEmail.mockResolvedValue({});

    const result = await service.register({
      firstName: 'Student',
      lastName: 'Example',
      email: ' STUDENT@Example.com ',
      password: 'Password1!',
    });

    expect(result.email).toBe('student@example.com');
    expect(result.message).toContain('already in progress');
    const sentOtp = emailService.sendOtpEmail.mock.calls[0][2];
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith(
      'student@example.com',
      'Student',
      sentOtp,
    );
    expect(sentOtp).toMatch(/^\d{6}$/);
    expect(userRepository.save).toHaveBeenCalledTimes(1);
    expect(userRepository.save.mock.calls[0][0]).toMatchObject({
      email: 'student@example.com',
      otp: sentOtp,
    });
  });

  it('keeps verified accounts unavailable for duplicate registration', async () => {
    userRepository.findOneBy.mockResolvedValue({
      email: 'student@example.com',
      isEmailVerified: true,
    } as User);

    await expect(
      service.register({
        firstName: 'Student',
        lastName: 'Example',
        email: 'STUDENT@example.com',
        password: 'Password1!',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('does not replace the current code when sending a replacement fails', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const oldExpiry = new Date(Date.now() + 60_000);
    const pendingUser = {
      email: 'student@example.com',
      firstName: 'Student',
      isEmailVerified: false,
      otp: '123456',
      otpExpiry: oldExpiry,
    } as User;
    userRepository.findOneBy.mockResolvedValue(pendingUser);
    emailService.sendOtpEmail.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(
      service.resendOtp(' STUDENT@Example.com '),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(userRepository.findOneBy).toHaveBeenCalledWith({
      email: 'student@example.com',
    });
    expect(pendingUser.otp).toBe('123456');
    expect(pendingUser.otpExpiry).toBe(oldExpiry);
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('creates the configured sample user with a normalized email and hashed password', async () => {
    Object.assign(userConfig, {
      USER_FIRST_NAME: 'Sample',
      USER_LAST_NAME: 'User',
      USER_EMAIL: ' SAMPLE@Example.com ',
      USER_PASSWORD: 'Password1!',
      USER_UNIVERSITY: 'unima',
    });
    userRepository.findOneBy.mockResolvedValue(null);
    userRepository.save.mockImplementation((user) =>
      Promise.resolve(user as User),
    );

    const createdUser = await service.createUser();

    expect(createdUser).toMatchObject({
      firstName: 'Sample',
      lastName: 'User',
      email: 'sample@example.com',
      university: 'unima',
      isEmailVerified: true,
    });
    expect(createdUser?.password).not.toBe('Password1!');
  });
});
