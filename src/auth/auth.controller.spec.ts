import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify.dto';
import { SignInDto } from './dto/signin.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    verifyOtp: jest.fn(),
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should register user', async () => {
    const dto: RegisterDto = { email: 'test@example.com', password: 'pass123', firstName: 'test', lastName: 'test' };
    mockAuthService.register.mockResolvedValue('registered');

    expect(await controller.register(dto)).toBe('registered');
    expect(mockAuthService.register).toHaveBeenCalledWith(dto);
  });

  it('should verify OTP', async () => {
    const dto: VerifyOtpDto = { email: 'test@example.com', otp: '123456' };
    mockAuthService.verifyOtp.mockResolvedValue('verified');

    expect(await controller.verifyOtp(dto)).toBe('verified');
    expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(dto);
  });

  it('should sign in user', async () => {
    const dto: SignInDto = { email: 'test@example.com', password: 'pass123' };
    mockAuthService.signIn.mockResolvedValue('signedin');

    expect(await controller.signIn(dto)).toBe('signedin');
    expect(mockAuthService.signIn).toHaveBeenCalledWith(dto.email, dto.password);
  });
});
