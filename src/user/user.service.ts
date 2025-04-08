import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) { }

    async findOneBy(user: object): Promise<User | null> {
        try {
            return await this.userRepo.findOneBy(user);
        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }

    async create(data: object): Promise<User> {
        try {
            const user = this.userRepo.create(data);
            return await this.userRepo.save(user);
        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }
}
