import { IsEmail } from 'class-validator';

export class UserLoginDto {
  @IsEmail()
    email: string;
    
    @Ispass
  password: string;
}
