import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  ValidateUser(userLoginDto: UserLoginDto) {
    // Validate user logic
  }
}
