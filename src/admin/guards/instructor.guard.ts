import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../user/entities/user.entity';

/**
 * Instructor Guard for protecting instructor-only routes
 * 
 * This guard ensures that only users with instructor or admin role can access instructor endpoints.
 * It extends the JWT auth guard to provide authentication and authorization.
 */
@Injectable()
export class InstructorGuard extends JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      return false;
    }

    // Get the request object with user attached by JWT guard
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    // Check if user has instructor or admin role
    if (!user || !user.canManageContent()) {
      throw new ForbiddenException('Access denied. Instructor or admin privileges required.');
    }

    return true;
  }
}