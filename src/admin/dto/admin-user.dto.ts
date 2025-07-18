import { IsOptional, IsString, IsEmail, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for filtering and searching users in admin panel
 */
export class AdminUserFilterDto {
  @ApiProperty({ description: 'Search by name or email', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by user role', enum: ['user', 'admin', 'instructor'], required: false })
  @IsOptional()
  @IsEnum(['user', 'admin', 'instructor'])
  role?: 'user' | 'admin' | 'instructor';

  @ApiProperty({ description: 'Filter by user status', enum: ['active', 'suspended', 'deleted'], required: false })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';

  @ApiProperty({ description: 'Filter by email verification status', required: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  isEmailVerified?: boolean;

  @ApiProperty({ description: 'Page number for pagination', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiProperty({ description: 'Number of items per page', required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @ApiProperty({ description: 'Sort field', required: false, default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({ description: 'Sort order', enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * DTO for updating user information by admin
 */
export class AdminUpdateUserDto {
  @ApiProperty({ description: 'User full name', required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ description: 'User email', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User role', enum: ['user', 'admin', 'instructor'], required: false })
  @IsOptional()
  @IsEnum(['user', 'admin', 'instructor'])
  role?: 'user' | 'admin' | 'instructor';

  @ApiProperty({ description: 'User status', enum: ['active', 'suspended', 'deleted'], required: false })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  status?: 'active' | 'suspended' | 'deleted';

  @ApiProperty({ description: 'Email verification status', required: false })
  @IsOptional()
  isEmailVerified?: boolean;

  @ApiProperty({ description: 'Phone verification status', required: false })
  @IsOptional()
  isPhoneVerified?: boolean;
}

/**
 * DTO for admin user creation
 */
export class AdminCreateUserDto {
  @ApiProperty({ description: 'User full name' })
  @IsString()
  fullName: string;

  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'User role', enum: ['user', 'admin', 'instructor'], default: 'user' })
  @IsOptional()
  @IsEnum(['user', 'admin', 'instructor'])
  role?: 'user' | 'admin' | 'instructor' = 'user';

  @ApiProperty({ description: 'Temporary password for the user' })
  @IsString()
  temporaryPassword: string;

  @ApiProperty({ description: 'Auto-verify email', required: false, default: false })
  @IsOptional()
  autoVerifyEmail?: boolean = false;
}