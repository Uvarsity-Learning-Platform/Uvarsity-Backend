import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Strategy for Passport Authentication
 * 
 * This strategy validates JWT tokens and extracts user information
 * for protected routes. It integrates with the JwtAuthGuard to
 * provide seamless authentication across the application.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Extract JWT from Authorization header as Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      // Don't ignore token expiration
      ignoreExpiration: false,
      
      // Use the same secret as token generation
      secretOrKey: configService.get<string>('JWT_SECRET'),
      
      // Verify issuer and audience for additional security
      issuer: 'stellr-academy',
      audience: 'stellr-users',
    });
  }

  /**
   * Validate JWT payload and return user data
   * This method is called after JWT signature validation
   * 
   * @param payload - Decoded JWT payload
   * @returns User data to attach to request object
   */
  async validate(payload: any) {
    // In a full implementation, this would:
    // 1. Validate the user still exists
    // 2. Check if the user account is active
    // 3. Verify any additional security requirements
    // 4. Return user data to be attached to req.user
    
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles || ['learner'],
    };
  }
}