import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class updateUserProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsUrl({}, { message: 'Avatar Url must be a valid url' })
  @IsOptional()
  avatarUrl: string;
}
