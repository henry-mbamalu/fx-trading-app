import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { MailerService } from '@nestjs-modules/mailer';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify.dto';
import * as bcrypt from 'bcryptjs';
import { verifyEmail } from 'src/templates/verifyEmail';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly userService: UserService,
        private readonly mailerService: MailerService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        try {
            const email = dto.email.trim()
            const existing = await this.userService.findOneBy({ email });
            if (existing) throw new BadRequestException('Email already exists');

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const salt = await bcrypt.genSalt();
            const password = await bcrypt.hash(dto.password, salt);
            const user = this.userRepo.create({ ...dto, otp, password, email });
            await this.userRepo.save(user);

            await this.mailerService.sendMail({
                to: email,
                subject: 'Verify your FX App email',
                html: verifyEmail(otp),
            });

            return { message: 'Verification OTP sent to email' };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    async verifyOtp(dto: VerifyOtpDto) {
        try {
            const user = await this.userService.findOneBy({ email: dto.email });
            if (!user || user.otp !== dto.otp) {
                throw new BadRequestException('Invalid OTP');
            }

            user.isVerified = true;
            user.otp = '';
            await this.userRepo.save(user);

            return { message: 'Email verified successfully' };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    async signIn(email: string, password: string) {
        try {
            const user = await this.userService.findOneBy({ email });
            if (!user) {
                throw new BadRequestException('Invalid credentials');
            }

            // Compare password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new BadRequestException('Invalid credentials');
            }

            // Create JWT token
            const payload = { email: user.email, sub: user.id };
            const accessToken = this.jwtService.sign(payload);

            // Return token and user profile
            return {
                accessToken,
                userProfile: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                },
            };
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }
}
