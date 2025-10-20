import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsNumber, 
  IsUrl, 
  IsEnum, 
  IsArray, 
  Min,
  MaxLength,
  IsBoolean
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CourseLevel } from '../../../generated/prisma';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Course title is required' })
  @MaxLength(100, { message: 'Title must be less than 100 characters' })
  title: string;
 

  @IsString()
  @IsNotEmpty({ message: 'Course description is required' })
  @MaxLength(2000, { message: 'Description must be less than 2000 characters' })
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(300, { message: 'Short description must be less than 300 characters' })
  shortDescription?: string;

  @IsNumber()
  @Min(0, { message: 'Price must be a positive number' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsEnum(CourseLevel, { message: 'Level must be a valid course level from schema' })
  level: CourseLevel;

  @IsUrl({}, { message: 'Thumbnail must be a valid URL' })
  @IsOptional()
  thumbnail?: string;

  @IsUrl({}, { message: 'Preview video must be a valid URL' })
  @IsOptional()
  previewVideo?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  learningObjectives?: string[];

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
