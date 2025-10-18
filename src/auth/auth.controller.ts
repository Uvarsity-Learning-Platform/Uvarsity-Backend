import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Put,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserLoginDto } from './dto/user-login.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RegisterUserDto } from './dto/user-regsiter.dto';
import { updateUserProfileDto } from './dto/user-profileUpdate.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/register')
  async registerUser(
    @Body() registerDto: RegisterUserDto,
    @Res() response: Response,
  ) {
    // Registration logic
    try {
      const { userId, token } = await this.authService.register(registerDto);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          userId,
          token,
          message: 'User registered successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorCode =
        error.status === 400 ? 400 : HttpStatus.INTERNAL_SERVER_ERROR;

      return response.status(errorCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode,
          message: error.message || 'Server error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
  @Post('user/login')
  // @UseGuards(LocalGuard)
  async loginUser(@Body() userLoginDto: UserLoginDto, @Res() res: Response) {
    try {
      // 1. Call AuthService to validate credentials and get JWT
      const result = await this.authService.ValidateUser(userLoginDto);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          userId: result.userId,
          token: result.token,
          message: 'Login successful',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error instanceof HttpException) {
        return res.status(error.getStatus()).json({
          status: 'error',
          data: null,
          error: {
            errorCode: error.getStatus(),
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }
      // Fallback for unknown errors
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: 'Unexpected error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('user/profile')
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@Req() request: Request, @Res() response: Response) {
    // Get user profile logic
    try {
      const userId = (request.user as { userId: string }).userId;

      if (!userId) {
        throw new HttpException(
          'User not authenticated',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const user = await this.authService.getUserProfile(userId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: user,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      if (error.status === HttpStatus.NOT_FOUND) {
        return response.status(HttpStatus.NOT_FOUND).json({
          status: 'error',
          data: null,
          error: {
            errorCode: 404,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      data: null,
      error: {
        errorCode: 500,
        message: 'Unexpected error occurred',
      },
      timestamp: new Date().toISOString(),
    });
  }

  @Put('user/profile')
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(
    @Res() response: Response,
    @Req() request: Request,
    @Body() updateUserProfile: updateUserProfileDto,
  ) {
    // Update user profile logic

    try {
      const userId = (request.user as { userId: string }).userId;

      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const result = await this.authService.updateUserProfile(
        userId,
        updateUserProfile,
      );

      // support both shapes: { message, user } or direct user object
      const updatedUser = result && (result as any).user ? (result as any).user : (result as any);
      const returnedUserId = updatedUser?.id ?? updatedUser?.userId ?? userId;

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          userId: returnedUserId,
          message: 'Profile updated successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          status: 'error',
          data: null,
          error: {
            errorCode: 400,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      data: null,
      error: {
        errorCode: 500,
        message: 'Something went wrong',
      },
      timestamp: new Date().toISOString(),
    });
  }
}
