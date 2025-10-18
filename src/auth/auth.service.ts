import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from './dto/user-login.dto';
import { DatabaseService } from '../database/database.service';
import { comparePassword, hashPassword } from '../utils/hash.utils';
import { JwtService } from '@nestjs/jwt';
import { RegisterUserDto } from './dto/user-regsiter.dto';
import { updateUserProfileDto } from './dto/user-profileUpdate.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterUserDto) {
    const { email, password, phone, name, avatarUrl } = registerDto;

    // Fix: Remove (as any) casting
    const findExistingUser = await this.databaseService.user.findFirst({
      where: { 
        OR: [
          { email: email }, 
          { phone: phone }
        ] 
      },
    });

    if (findExistingUser) {
      throw new BadRequestException('Email or phone already exists');
    }

    const hashedPassword = await hashPassword(password);

    try {
      // Fix: Remove (as any) casting
      const newUser = await this.databaseService.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          phone: phone,
          name: name,
          avatarUrl: avatarUrl,
          username: email.split('@')[0], // Using part of email as default username
        },
      });

      // Fix: Correct payload (was using newUser.id for role)
      const payload = { 
        sub: newUser.id, 
        email: newUser.email,
        role: newUser.role 
      };
      
      const token = await this.jwtService.signAsync(payload);

      return {
        userId: newUser.id,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        }
      };
    } catch (error) {
      this.logger.error('Registration error:', error);
      throw new InternalServerErrorException('Server error occurred');
    }
  }

  async ValidateUser(userLoginDto: UserLoginDto) {
    this.logger.debug(`Login attempt for email: ${userLoginDto.email}`);

    // Fix: Remove (as any) casting
    const findUser = await this.databaseService.user.findFirst({
      where: { email: userLoginDto.email },
    });

    if (!findUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await comparePassword(
      userLoginDto.password,
      findUser.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Create JWT payload
    const payload = {
      sub: findUser.id,
      email: findUser.email,
      role: findUser.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      userId: findUser.id,
      token,
      user: {
        id: findUser.id,
        email: findUser.email,
        name: findUser.name,
        role: findUser.role,
      }
    };
  }

  async getUserProfile(userId: string) {
    // Fix: Remove (as any) casting
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        phone: true,
        createdAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    // Return consistent response format
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async updateUserProfile(userId: string, dto: updateUserProfileDto) {
    try {
      // Fix: Remove (as any) casting
      const updatedUser = await this.databaseService.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          avatarUrl: dto.avatarUrl,
          // Add other fields from DTO if needed
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Profile updated successfully',
        user: updatedUser,
      };
    } catch (error) {
      this.logger.error('Profile update error:', error);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }
}
