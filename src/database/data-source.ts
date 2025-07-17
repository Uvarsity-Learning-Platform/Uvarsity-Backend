import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * TypeORM configuration for migrations
 * This configuration is used by the TypeORM CLI for running migrations
 */
export const createDataSource = (configService: ConfigService) => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const useSqlite = configService.get('USE_SQLITE') === 'true' || 
                   (configService.get('NODE_ENV') === 'development' && 
                    !configService.get('DB_HOST'));

  if (useSqlite) {
    return new DataSource({
      type: 'sqlite',
      database: './dev-database.sqlite',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: ['error'],
    });
  }

  return new DataSource({
    type: 'postgres',
    host: configService.get<string>('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 5432),
    username: configService.get<string>('DB_USERNAME', 'stellr_user'),
    password: configService.get<string>('DB_PASSWORD', 'stellr_password'),
    database: configService.get<string>('DB_NAME', 'stellr_academy'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: ['error'],
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
};

// Default data source for CLI
const configService = new ConfigService();
export default createDataSource(configService);