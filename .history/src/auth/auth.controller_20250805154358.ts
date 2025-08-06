import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { UserLoginDto } from './dto/user-login.dto';

@Controller('auth')
export class AuthController {
  @Post('user/register')
  registerUser() {
    // Registration logic
  }

  @Post('user/login')
  loginUser(@Body() body: UserLoginDto) {
    // Login logic
  }

  @Get('user/profile')
  getUserProfile() {
    // Get user profile logic
  }

  @Put('user/profile')
  updateUserProfile() {
    // Update user profile logic
  }
}
