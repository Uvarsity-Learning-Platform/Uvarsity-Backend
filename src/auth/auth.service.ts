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
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
// You'll need to install nodemailer: npm install nodemailer @types/nodemailer
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Initialize email transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async register(registerDto: RegisterUserDto) {
    const { email, password, phone, name, avatarUrl } = registerDto;

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
      const newUser = await this.databaseService.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          phone: phone,
          name: name,
          avatarUrl: avatarUrl,
          username: email.split('@')[0],
          emailVerified: false, // User needs to verify email
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(newUser.id, newUser.email, newUser.role);
      
      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailTokenExpiry = new Date();
      emailTokenExpiry.setHours(emailTokenExpiry.getHours() + 24); // 24 hours expiry

      // Store verification token in database
      await this.databaseService.user.update({
        where: { id: newUser.id },
        data: {
          emailVerificationToken,
          emailTokenExpiry,
        },
      });

      // Send verification email
      await this.sendVerificationEmail(newUser.email, newUser.name, emailVerificationToken);

      return {
        userId: newUser.id,
        ...tokens,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
        }
      };
    } catch (error) {
      this.logger.error('Registration error:', error);
      throw new InternalServerErrorException('Server error occurred');
    }
  }

  async ValidateUser(userLoginDto: UserLoginDto) {
    this.logger.debug(`Login attempt for email: ${userLoginDto.email}`);

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

    // Generate tokens
    const tokens = await this.generateTokens(findUser.id, findUser.email, findUser.role);

    return {
      userId: findUser.id,
      ...tokens,
      user: {
        id: findUser.id,
        email: findUser.email,
        name: findUser.name,
        role: findUser.role,
        emailVerified: findUser.emailVerified,
      }
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
        phone: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }

  async updateUserProfile(userId: string, dto: updateUserProfileDto) {
    try {
      const updatedUser = await this.databaseService.user.update({
        where: { id: userId },
        data: {
          name: dto.name,
          avatarUrl: dto.avatarUrl,
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

  // NEW: Refresh Token Implementation
  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Verify user still exists
      const user = await this.databaseService.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return tokens;
    } catch (error) {
      this.logger.error('Refresh token error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // NEW: Logout Implementation
  async logout(userId: string) {
    try {
      // Invalidate refresh tokens by updating a field (optional)
      await this.databaseService.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 }, // This would require adding tokenVersion to schema
        },
      });

      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout error:', error);
      throw new InternalServerErrorException('Logout failed');
    }
  }

  // NEW: Forgot Password Implementation
  async forgotPassword(email: string) {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'Password reset email sent if email exists' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1 hour expiry

    // Store reset token
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      },
    });

    // Send reset email
    await this.sendPasswordResetEmail(user.email, user.name, resetToken);

    return { message: 'Password reset email sent' };
  }

  // NEW: Reset Password Implementation
  async resetPassword(token: string, newPassword: string) {
    const user = await this.databaseService.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        tokenVersion: { increment: 1 }, // Invalidate existing tokens
      },
    });

    return { message: 'Password reset successfully' };
  }

  // NEW: Email Verification Implementation
  async verifyEmail(token: string) {
    const user = await this.databaseService.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailTokenExpiry: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  // NEW: Resend Verification Email
  async resendVerificationEmail(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailTokenExpiry = new Date();
    emailTokenExpiry.setHours(emailTokenExpiry.getHours() + 24); // 24 hours expiry

    await this.databaseService.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken,
        emailTokenExpiry,
      },
    });

    await this.sendVerificationEmail(user.email, user.name, emailVerificationToken);

    return { message: 'Verification email sent' };
  }

  // HELPER: Generate Access and Refresh Tokens
  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET') || this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRY') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      token: accessToken, // For backward compatibility
    };
  }

  // HELPER: Send Verification Email
  private async sendVerificationEmail(email: string, name: string, token: string) {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Verify Your Email Address - Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333;">Welcome to Our Learning Platform!</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name}! 👋</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for joining our learning platform! To get started, please verify your email address.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-weight: bold;">
              Verify Email Address
            </a>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Can't click the button?</strong> Copy and paste this link in your browser:
            </p>
            <p style="margin: 10px 0 0 0; word-break: break-all; color: #007bff;">
              ${verificationUrl}
            </p>
          </div>

          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              ⚠️ This verification link will expire in 24 hours for security reasons.
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
              If you didn't create an account, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send verification email:', error);
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }

  // HELPER: Send Password Reset Email
  private async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Reset Your Password - Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc3545;">Password Reset Request</h1>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password. Click the button below to set a new password:
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;
                      font-weight: bold;">
              Reset Password
            </a>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>Can't click the button?</strong> Copy and paste this link in your browser:
            </p>
            <p style="margin: 10px 0 0 0; word-break: break-all; color: #dc3545;">
              ${resetUrl}
            </p>
          </div>

          <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6c757d; font-size: 14px; margin: 0;">
              ⚠️ This reset link will expire in 1 hour for security reasons.
            </p>
            <p style="color: #6c757d; font-size: 14px; margin: 10px 0 0 0;">
              If you didn't request this reset, please ignore this email and your password will remain unchanged.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
      throw new InternalServerErrorException('Failed to send password reset email');
    }
  }
}
