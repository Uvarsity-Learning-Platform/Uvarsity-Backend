import { Module } from '@nestjs/common';
import { CloudinaryService } from './services/cloudinary/cloudinary.service';
import { MediaProcessingService } from './services/media-processing/media-processing.service';

/**
 * CloudinaryModule - Handles all file upload and media processing operations
 * This module replaces AWS S3 functionality with Cloudinary for:
 * - Image uploads and transformations
 * - Video uploads and processing
 * - Document storage
 * - Media optimization and delivery via CDN
 */

@Module({
  providers: [CloudinaryService, MediaProcessingService],
  exports: [CloudinaryService, MediaProcessingService],
})
export class CloudinaryModule {}
