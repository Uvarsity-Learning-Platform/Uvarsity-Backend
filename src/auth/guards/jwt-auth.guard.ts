import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 * 
 * This guard protects routes by requiring a valid JWT token.
 * It uses the JwtStrategy to validate tokens and extract user data.
 * 
 * Usage:
 * - Apply to controllers or individual routes that require authentication
 * - User data will be available in req.user after successful authentication
 * - Automatically returns 401 Unauthorized for invalid/missing tokens
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Custom error handling for JWT authentication failures
   * 
   * @param err - Authentication error
   * @param user - User data (if authentication succeeded)
   * @param info - Additional authentication info
   * @returns User data or throws UnauthorizedException
   */
  handleRequest(err: any, user: any, info: any) {
    // In a full implementation, this could:
    // 1. Log authentication attempts for security monitoring
    // 2. Provide custom error messages based on failure type
    // 3. Implement additional security checks
    // 4. Track failed authentication attempts
    
    if (err || !user) {
      // Custom error handling can be added here
      throw err || new Error('Unauthorized access');
    }
    
    return user;
  }
}