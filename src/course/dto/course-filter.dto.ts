import { Type } from 'class-transformer';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class CourseFilterDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumberString()
  duration?: number;
}
