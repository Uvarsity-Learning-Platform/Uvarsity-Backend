import { Controller, Get, Post, Put } from '@nestjs/common';

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

  @Get('user/profile')
  getUserProfile() {
    // Get user profile logic
  }

  @Put('user/profile')
  updateUserProfile() {
    // Update user profile logic
  }
}
