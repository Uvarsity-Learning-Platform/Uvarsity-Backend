import { IsString } from 'class-validator';

export class GetCatalogDto {
  @IsString()
  category?: string;
  difficulty?: string;

  duration?: string;
}
