import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  courseId: string;

  @IsNumber()
  @Min(0)
  amount: number; // major units, e.g. 49.99

  @IsString()
  @IsOptional()
  currency?: string; // e.g. 'usd'

  @IsString()
  @IsOptional()
  couponCode?: string;
}