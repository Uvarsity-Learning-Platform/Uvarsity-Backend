import { IsString, IsOptional, IsArray, IsEnum, IsNumber, IsUUID, Min, MaxLength, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLessonDto {
  @ApiProperty({ example: 'Introduction to HTML', description: 'Lesson title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Learn the basics of HTML structure...', description: 'Lesson description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '<h1>HTML Basics</h1><p>HTML is...</p>', description: 'Lesson content', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'video', description: 'Lesson content type' })
  @IsEnum(['video', 'text', 'interactive', 'quiz', 'assignment'])
  contentType: 'video' | 'text' | 'interactive' | 'quiz' | 'assignment';

  @ApiProperty({ example: 1, description: 'Lesson order within the course' })
  @IsNumber()
  @Min(1)
  order: number;

  @ApiProperty({ example: 45, description: 'Estimated lesson duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMinutes?: number;

  @ApiProperty({ example: 'beginner', description: 'Lesson difficulty level' })
  @IsEnum(['beginner', 'intermediate', 'advanced'])
  level: 'beginner' | 'intermediate' | 'advanced';

  @ApiProperty({ example: 'https://example.com/lesson-video.mp4', description: 'Video URL', required: false })
  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @ApiProperty({ example: 2700, description: 'Video duration in seconds', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  videoDuration?: number;

  @ApiProperty({ 
    example: [{ type: 'pdf', title: 'HTML Cheat Sheet', url: 'https://example.com/cheat-sheet.pdf' }], 
    description: 'Lesson resources', 
    required: false 
  })
  @IsOptional()
  @IsArray()
  resources?: {
    type: 'pdf' | 'link' | 'document' | 'exercise';
    title: string;
    url: string;
    description?: string;
  }[];

  @ApiProperty({ example: ['Understand HTML structure', 'Create basic HTML elements'], description: 'Learning objectives', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningObjectives?: string[];

  @ApiProperty({ example: ['HTML tags', 'Document structure', 'Semantic elements'], description: 'Key concepts', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyConcepts?: string[];

  @ApiProperty({ example: ['Basic computer skills'], description: 'Lesson prerequisites', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiProperty({ 
    example: { isPreview: true, requiresEnrollment: true }, 
    description: 'Lesson access settings', 
    required: false 
  })
  @IsOptional()
  accessSettings?: {
    isPreview: boolean;
    requiresEnrollment: boolean;
    prerequisiteCompleted: boolean;
  };
}