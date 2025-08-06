import { Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('user/register')
  registerUser() {
    // Registration logic
  }

  @Post('user/login')
  loginUser() {
    // Login logic
    }
    
    @Get('user/pr')
}
