import { IsEmail } from "class-validator";

export class UserLoginDto {

    @IsEmail
  email: string;
  password: string;
}
