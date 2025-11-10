import { IsOptional, IsString } from 'class-validator';

export class GetCatalogDto {
  @IsString()
  @IsOptional()
  category?: string;
  difficulty?: string;

  duration?: string;
}
