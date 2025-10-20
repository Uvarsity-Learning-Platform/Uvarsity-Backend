import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateModuleDto {
  @IsString()
  @IsNotEmpty({ message: 'Module title is required' })
  @MaxLength(100, { message: 'Title must be less than 100 characters' })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Description must be less than 1000 characters' })
  description?: string;

  @IsNumber()
  @Min(1, { message: 'Order must be a positive number' })
  order: number;
}