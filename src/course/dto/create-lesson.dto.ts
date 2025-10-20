import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsUrl, 
  IsEnum, 
  Min,
  MaxLength 
} from 'class-validator';
import { pbkdf2 } from 'crypto';

export enum LessonType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  DOCUMENT = 'DOCUMENT',
  CODE_SANDBOX = 'CODE_SANDBOX',
  LIVE_SESSION = 'LIVE_SESSION',
  PDF = 'PDF'

}

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Lesson title is required' })
  @MaxLength(100, { message: 'Title must be less than 100 characters' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Short description must be less than 500 characters' })
  shortDescription?: string;


  @IsString()
  @IsOptional()
  content?: string; // Rich text content

  @IsUrl({}, { message: 'Video URL must be valid' })
  @IsOptional()
  videoUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'Duration must be a positive number' })
  duration?: number; // Duration in seconds

  @IsNumber()
  @Min(1, { message: 'Order must be a positive number' })
  order: number;

  @IsEnum(LessonType, { 
    message: 'Type must be VIDEO, TEXT, QUIZ, ASSIGNMENT, DOCUMENT, CODE_SANDBOX, LIVE_SESSION, or PDF' 
  })
  type: LessonType;
}