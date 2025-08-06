import { Injectable } from '@nestjs/common';
import { UserLoginDto } from './dto/user-login.dto';

@Injectable()
export class AuthService {
  ValidateUser(userLoginDto: UserLoginDto) {
      // Validate user logic
      
  }
}
