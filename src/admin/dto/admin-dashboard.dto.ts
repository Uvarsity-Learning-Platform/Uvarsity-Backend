import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for admin dashboard statistics
 */
export class AdminDashboardStatsDto {
  @ApiProperty({ description: 'Date range for statistics', required: false })
  @IsOptional()
  @IsEnum(['7d', '30d', '90d', '1y', 'all'])
  range?: '7d' | '30d' | '90d' | '1y' | 'all' = '30d';

  @ApiProperty({ description: 'Start date for custom range', required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiProperty({ description: 'End date for custom range', required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;
}

/**
 * DTO for bulk user operations
 */
export class AdminBulkUserOperationDto {
  @ApiProperty({ description: 'List of user IDs to operate on', type: [String] })
  @IsString({ each: true })
  userIds: string[];

  @ApiProperty({ description: 'Operation to perform', enum: ['activate', 'suspend', 'delete', 'promote_to_instructor', 'demote_to_user'] })
  @IsEnum(['activate', 'suspend', 'delete', 'promote_to_instructor', 'demote_to_user'])
  operation: 'activate' | 'suspend' | 'delete' | 'promote_to_instructor' | 'demote_to_user';

  @ApiProperty({ description: 'Optional reason for the operation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for bulk course operations
 */
export class AdminBulkCourseOperationDto {
  @ApiProperty({ description: 'List of course IDs to operate on', type: [String] })
  @IsString({ each: true })
  courseIds: string[];

  @ApiProperty({ description: 'Operation to perform', enum: ['publish', 'unpublish', 'archive', 'delete'] })
  @IsEnum(['publish', 'unpublish', 'archive', 'delete'])
  operation: 'publish' | 'unpublish' | 'archive' | 'delete';

  @ApiProperty({ description: 'Optional reason for the operation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for analytics query
 */
export class AdminAnalyticsQueryDto {
  @ApiProperty({ description: 'Metric type', enum: ['users', 'courses', 'enrollments', 'certificates', 'engagement'] })
  @IsEnum(['users', 'courses', 'enrollments', 'certificates', 'engagement'])
  metric: 'users' | 'courses' | 'enrollments' | 'certificates' | 'engagement';

  @ApiProperty({ description: 'Time period', enum: ['hour', 'day', 'week', 'month'], default: 'day' })
  @IsOptional()
  @IsEnum(['hour', 'day', 'week', 'month'])
  period?: 'hour' | 'day' | 'week' | 'month' = 'day';

  @ApiProperty({ description: 'Number of periods to look back', default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  lookback?: number = 30;

  @ApiProperty({ description: 'Start date for custom range', required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @ApiProperty({ description: 'End date for custom range', required: false })
  @IsOptional()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate?: Date;
}