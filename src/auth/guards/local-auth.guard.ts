import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 * 
 * This guard handles email/password authentication for login endpoints.
 * It uses the LocalStrategy to validate user credentials.
 * 
 * Usage:
 * - Apply to login endpoints to validate credentials
 * - Works with POST requests containing email and password
 * - Returns user data on successful authentication
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  /**
   * Custom error handling for local authentication failures
   * 
   * @param err - Authentication error
   * @param user - User data (if authentication succeeded)
   * @param info - Additional authentication info
   * @returns User data or throws UnauthorizedException
   */
  handleRequest(err: any, user: any, info: any) {
    // In a full implementation, this could:
    // 1. Log login attempts for security monitoring
    // 2. Implement account lockout after failed attempts
    // 3. Rate limiting for login endpoints
    // 4. Custom error messages for different failure types
    
    if (err || !user) {
      // Custom error handling can be added here
      throw err || new Error('Invalid credentials');
    }
    
    return user;
  }
}