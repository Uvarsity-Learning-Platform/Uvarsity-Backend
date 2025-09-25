import { Module } from '@nestjs/common';
import { MediaController } from './controllers/media.controller';
import { MediaService } from './services/media.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { DatabaseModule } from 'src/database/database.module';

/**
 * MediaModule - Main module for handling media operations in the application
 *
 * This module integrates:
 * - Cloudinary for file storage and processing
 * - Prisma for database operations
 * - RESTful API endpoints for media management
 * - Authentication and authorization
 */
@Module({
  imports: [CloudinaryModule, DatabaseModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
