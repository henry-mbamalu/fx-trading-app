import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: Repository<User>;
  let userService: UserService;
  let mailerService: MailerService;
  let jwtService: JwtService;

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserService = {
    findOneBy: jest.fn(),
  };

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: UserService, useValue: mockUserService },
        { provide: MailerService, useValue: mockMailerService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    userService = module.get<UserService>(UserService);
    mailerService = module.get<MailerService>(MailerService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and send OTP', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserService.findOneBy.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue({ id: 1, ...dto, otp: '123456' });
      mockUserRepo.save.mockResolvedValue({});
      mockMailerService.sendMail.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result).toEqual({ message: 'Verification OTP sent to email' });
      expect(mockUserService.findOneBy).toHaveBeenCalledWith({ email: dto.email });
      expect(mockMailerService.sendMail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email exists', async () => {
      mockUserService.findOneBy.mockResolvedValue({ id: 1 });

      await expect(
        service.register({ email: 'existing@example.com', password: '123456', firstName: 'x', lastName: 'y' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and update user', async () => {
      const dto = { email: 'test@example.com', otp: '123456' };
      const mockUser = { email: dto.email, otp: dto.otp, isVerified: false };

      mockUserService.findOneBy.mockResolvedValue(mockUser);
      mockUserRepo.save.mockResolvedValue({});

      const result = await service.verifyOtp(dto);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(mockUserRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isVerified: true, otp: '' }));
    });

    it('should throw BadRequestException if OTP is invalid', async () => {
      const dto = { email: 'test@example.com', otp: 'wrongotp' };
      mockUserService.findOneBy.mockResolvedValue({ email: dto.email, otp: '123456' });

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('signIn', () => {
    it('should sign in user and return token and profile', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = {
        id: 1,
        email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserService.findOneBy.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.signIn(email, password);

      expect(result).toEqual({
        accessToken: 'token',
        userProfile: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      });
    });

    it('should throw BadRequestException if credentials are invalid', async () => {
      mockUserService.findOneBy.mockResolvedValue(null);
      await expect(service.signIn('a@b.com', '123456')).rejects.toThrow(BadRequestException);
    });
  });
});
