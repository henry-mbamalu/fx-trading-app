import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { UserRole } from 'src/user/entities/user.entity';
import { User } from 'src/user/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeederService {
  constructor(private readonly userService: UserService) {}

  async seedAdmin() {
    const adminExists = await this.userService.findOneBy({email: 'admin@gmail.com'});
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('adminpassword', 10);
      const adminUser = new User();
      adminUser.email = 'admin@gmail.com';
      adminUser.firstName = 'Admin';
      adminUser.lastName = 'Admin';
      adminUser.isVerified = true;
      adminUser.password = hashedPassword;
      adminUser.role = UserRole.ADMIN;

      await this.userService.create(adminUser);
      console.log('Admin user seeded');
    } else {
      console.log('Admin user already exists');
    }
  }
}
