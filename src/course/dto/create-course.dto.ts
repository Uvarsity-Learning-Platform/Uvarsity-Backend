import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsBoolean, Min, Max, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'Introduction to Web Development', description: 'Course title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Learn the fundamentals of web development...', description: 'Course description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'A comprehensive introduction to web development', description: 'Course summary', required: false })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({ example: 'https://example.com/thumbnail.jpg', description: 'Course thumbnail URL', required: false })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiProperty({ example: 'Programming', description: 'Course category' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({ example: ['web', 'development', 'javascript'], description: 'Course tags', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ example: 'beginner', description: 'Course difficulty level' })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ example: 40.5, description: 'Estimated course duration in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiProperty({ example: 'en', description: 'Course language (ISO 639-1 code)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  language?: string;

  @ApiProperty({ example: ['Basic computer skills', 'Internet access'], description: 'Course prerequisites', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ example: ['Build a complete website', 'Understand HTML/CSS/JS'], description: 'Learning objectives', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ 
    example: { type: 'free', price: 0, currency: 'USD' }, 
    description: 'Course pricing information', 
    required: false 
  })
  @IsOptional()
  pricing?: {
    type: 'free' | 'paid' | 'premium';
    price: number;
    currency: string;
  };

  @ApiProperty({ 
    example: { isOpen: true, maxEnrollments: 100 }, 
    description: 'Enrollment settings', 
    required: false 
  })
  @IsOptional()
  enrollmentSettings?: {
    isOpen: boolean;
    maxEnrollments?: number;
    enrollmentDeadline?: Date;
  };
}