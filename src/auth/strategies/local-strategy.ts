import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserLoginDto } from '../dto/user-login.dto';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }
  async validate({ email, password }: UserLoginDto) {
    const user = await this.authService.ValidateUser({ email, password });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
