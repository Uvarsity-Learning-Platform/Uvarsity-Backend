import { IsOptional, IsString, IsEnum, IsNumber, IsArray, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CourseQueryDto {
  @ApiProperty({ example: 'web development', description: 'Search query for course title and description', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'Programming', description: 'Filter by course category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 'beginner', description: 'Filter by difficulty level', required: false })
  @IsOptional()
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level?: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ example: 'javascript,web', description: 'Filter by tags (comma-separated)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ example: 'free', description: 'Filter by pricing type', required: false })
  @IsOptional()
  @IsEnum(['free', 'paid', 'premium'])
  pricing?: 'free' | 'paid' | 'premium';

  @ApiProperty({ example: 'published', description: 'Filter by course status', required: false })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @ApiProperty({ example: 'rating', description: 'Sort by field', required: false })
  @IsOptional()
  @IsEnum(['title', 'createdAt', 'updatedAt', 'rating', 'enrollmentCount'])
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'rating' | 'enrollmentCount';

  @ApiProperty({ example: 'desc', description: 'Sort order', required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ example: 10, description: 'Number of items per page', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ example: 'en', description: 'Filter by language', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: '4.0', description: 'Minimum rating filter', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @ApiProperty({ example: '50', description: 'Maximum duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDuration?: number;

  @ApiProperty({ example: 'true', description: 'Show only courses with open enrollment', required: false })
  @IsOptional()
  openEnrollment?: boolean;
}

export class EnrollmentQueryDto {
  @ApiProperty({ example: 'active', description: 'Filter by enrollment status', required: false })
  @IsOptional()
  @IsEnum(['active', 'completed', 'dropped', 'suspended'])
  status?: 'active' | 'completed' | 'dropped' | 'suspended';

  @ApiProperty({ example: 'progressPercentage', description: 'Sort by field', required: false })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'progressPercentage', 'lastActivityAt'])
  sortBy?: 'createdAt' | 'updatedAt' | 'progressPercentage' | 'lastActivityAt';

  @ApiProperty({ example: 'desc', description: 'Sort order', required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ example: 1, description: 'Page number', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ example: 10, description: 'Number of items per page', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}