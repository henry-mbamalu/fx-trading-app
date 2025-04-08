import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InternalServerErrorException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  let userRepo: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('findOneBy', () => {
    it('should return a user successfully', async () => {
      const mockUser = { id: 1, name: 'John Doe' };
      const findOneByMock = jest.spyOn(userRepo, 'findOneBy').mockResolvedValue(mockUser as any);

      const result = await service.findOneBy({ id: 1 });
      
      expect(findOneByMock).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockUser);
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      const errorMessage = 'Database error';
      jest.spyOn(userRepo, 'findOneBy').mockRejectedValue(new Error(errorMessage));

      try {
        await service.findOneBy({ id: 1 });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toBe('Internal Server Error');
      }
    });
  });

  describe('create', () => {
    it('should create and return a user successfully', async () => {
      const userData = { name: 'John Doe', email: 'john.doe@example.com' };
      const mockUser = { ...userData, id: 1 };

      jest.spyOn(userRepo, 'create').mockReturnValue(mockUser as any);
      jest.spyOn(userRepo, 'save').mockResolvedValue(mockUser as any);

      const result = await service.create(userData);

      expect(result).toEqual(mockUser);
      expect(userRepo.create).toHaveBeenCalledWith(userData);
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw InternalServerErrorException if an error occurs', async () => {
      const errorMessage = 'Database error';
      jest.spyOn(userRepo, 'create').mockReturnValue({} as any);
      jest.spyOn(userRepo, 'save').mockRejectedValue(new Error(errorMessage));

      try {
        await service.create({ name: 'John Doe', email: 'john.doe@example.com' });
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error.message).toBe('Internal Server Error');
      }
    });
  });
});
