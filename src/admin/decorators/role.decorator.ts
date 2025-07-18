import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to mark routes that require admin role
 * Usage: @AdminOnly()
 */
export const AdminOnly = () => SetMetadata('admin-only', true);

/**
 * Decorator to mark routes that require instructor or admin role
 * Usage: @InstructorOrAdmin()
 */
export const InstructorOrAdmin = () => SetMetadata('instructor-or-admin', true);

/**
 * Decorator to specify required roles for a route
 * Usage: @RequireRoles('admin', 'instructor')
 */
export const RequireRoles = (...roles: string[]) => SetMetadata('roles', roles);