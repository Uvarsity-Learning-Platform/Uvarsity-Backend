import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Database configuration module for Stellr Academy
 * 
 * This module handles the PostgreSQL database connection configuration
 * using TypeORM. It provides:
 * 
 * - Async configuration loading from environment variables
 * - Database connection pooling
 * - Entity auto-loading
 * - Migration support
 * - Environment-specific configurations (dev/staging/prod)
 */
@Module({
  imports: [
    // Configure TypeORM with async configuration loading
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          // Database type - PostgreSQL for robust data handling
          type: 'postgres',
          
          // Connection details from environment variables
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'stellr_user'),
          password: configService.get<string>('DB_PASSWORD', 'stellr_password'),
          database: configService.get<string>('DB_NAME', 'stellr_academy'),
          
          // Entity configuration - auto-load all entities
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          
          // Migration configuration
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: false, // Run migrations manually for safety
          
          // Synchronization settings - only auto-sync in development
          synchronize: !isProduction, // Never auto-sync in production
          
          // Connection pool settings for performance
          extra: {
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
          },
          
          // Logging configuration
          logging: !isProduction ? ['query', 'error', 'warn'] : ['error'],
          
          // SSL configuration for production
          ssl: isProduction ? { rejectUnauthorized: false } : false,
          
          // Retry configuration
          retryAttempts: 3,
          retryDelay: 3000,
          
          // Auto-load entities for development convenience
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  /**
   * Database module constructor
   * Logs the database configuration initialization
   */
  constructor(private configService: ConfigService) {
    const dbHost = this.configService.get<string>('DB_HOST', 'localhost');
    const dbName = this.configService.get<string>('DB_NAME', 'stellr_academy');
    console.log(`💾 Database configured - PostgreSQL at ${dbHost}/${dbName}`);
  }
}