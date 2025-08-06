import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserLoginDto } from './dto/user-login.dto';
import { DatabaseService } from 'src/database/database.service';
import { comparePassword, hashPassword } from 'src/utils/hash.utils';
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

    const findExistingUser = await this.databaseService.user.findFirst({
      where: { OR: [{ email: email }, { phone: phone }] },
    });

    if (findExistingUser) {
      throw new BadRequestException('Email or phone already exits');
    }

    const hashedPassword = await hashPassword(password);

    try {
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
      const payload = { sub: newUser.id, role: newUser.id };
      const token = await this.jwtService.signAsync(payload);

      return {
        userId: newUser.id,
        token,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new InternalServerErrorException('Server error occurred');
    }
  }

  async ValidateUser(userLoginDto: UserLoginDto) {
    // Validate user logic

    console.log(userLoginDto);

    const findUser = await this.databaseService.user.findFirst({
      where: { email: userLoginDto.email },
    });

    if (!findUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // TODO: Add password validation using bcrypt or similar
    const isPasswordValid = await comparePassword(
      userLoginDto.password,
      findUser.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: findUser.id,
      email: findUser.email,
    });

    return {
      userId: findUser.id,
      token,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }
    // Map to match the required response shape
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }

  async updateUserProfile(userId: string, dto: updateUserProfileDto) {
    const update = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
      },
    });
    return update;
  }
}
