import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CourseCatalogQueryDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsNumber({, {message: ''})
  @IsOptional()
  duration?: number;
}
