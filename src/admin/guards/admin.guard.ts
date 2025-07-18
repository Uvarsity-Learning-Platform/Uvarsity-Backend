import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../user/entities/user.entity';

/**
 * Admin Guard for protecting admin-only routes
 * 
 * This guard ensures that only users with admin role can access admin endpoints.
 * It extends the JWT auth guard to provide authentication and authorization.
 */
@Injectable()
export class AdminGuard extends JwtAuthGuard implements CanActivate {
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

    // Check if user has admin role
    if (!user || !user.isAdmin()) {
      throw new ForbiddenException('Access denied. Admin privileges required.');
    }

    return true;
  }
}