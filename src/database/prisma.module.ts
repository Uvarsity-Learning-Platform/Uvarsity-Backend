import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma Module for Uvarsity Backend
 * 
 * This module provides a centralized interface for database operations using Prisma.
 * It's marked as Global to make PrismaService available throughout the application
 * without needing to import the module in every feature module.
 * 
 * Features:
 * - Global availability of PrismaService
 * - Centralized database configuration
 * - Connection pool management
 * - Query optimization and caching
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}