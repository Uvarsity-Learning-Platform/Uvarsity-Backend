import { IsOptional, IsString } from 'class-validator';

export class GetCatalogDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  difficulty?: string;

  @IsString()
  @IsOptional()
  duration?: string;
}
