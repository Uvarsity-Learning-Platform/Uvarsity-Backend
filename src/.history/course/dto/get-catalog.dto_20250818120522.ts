import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CourseCatalogQueryDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsNumber({}, { message: 'Duration must be a number' })
  @IsOptional()
  duration?: number;
}
