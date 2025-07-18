import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsArray, IsNumber, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for filtering and searching courses in admin panel
 */
export class AdminCourseFilterDto {
  @ApiProperty({ description: 'Search by title or description', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Filter by course level', enum: ['beginner', 'intermediate', 'advanced'], required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level?: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: 'Filter by course status', enum: ['draft', 'published', 'archived'], required: false })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: 'Filter by instructor ID', required: false })
  @IsOptional()
  @IsString()
  instructorId?: string;

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
 * DTO for creating a new course by admin
 */
export class AdminCreateCourseDto {
  @ApiProperty({ description: 'Course title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Course description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Course summary', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: 'Course category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Course tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Course level', enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level?: 'beginner' | 'intermediate' | 'advanced' = 'beginner';

  @ApiProperty({ description: 'Estimated duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Course language', required: false, default: 'en' })
  @IsOptional()
  @IsString()
  language?: string = 'en';

  @ApiProperty({ description: 'Course prerequisites', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ description: 'Learning objectives', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ description: 'Instructor ID' })
  @IsString()
  instructorId: string;

  @ApiProperty({ description: 'Course pricing type', enum: ['free', 'paid', 'premium'], default: 'free' })
  @IsOptional()
  @IsEnum(['free', 'paid', 'premium'])
  pricingType?: 'free' | 'paid' | 'premium' = 'free';

  @ApiProperty({ description: 'Course price', required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number = 0;

  @ApiProperty({ description: 'Course currency', required: false, default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @ApiProperty({ description: 'Auto-publish course', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean = false;
}

/**
 * DTO for updating course information by admin
 */
export class AdminUpdateCourseDto {
  @ApiProperty({ description: 'Course title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Course description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Course summary', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ description: 'Course category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Course tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Course level', enum: ['beginner', 'intermediate', 'advanced'], required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level?: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ description: 'Estimated duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ description: 'Course language', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Course prerequisites', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ description: 'Learning objectives', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ description: 'Course status', enum: ['draft', 'published', 'archived'], required: false })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiProperty({ description: 'Instructor ID', required: false })
  @IsOptional()
  @IsString()
  instructorId?: string;

  @ApiProperty({ description: 'Course pricing type', enum: ['free', 'paid', 'premium'], required: false })
  @IsOptional()
  @IsEnum(['free', 'paid', 'premium'])
  pricingType?: 'free' | 'paid' | 'premium';

  @ApiProperty({ description: 'Course price', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Course currency', required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}