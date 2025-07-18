import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { Media } from './entities/media.entity';
import { User } from '../user/entities/user.entity';
import { Lesson } from '../course/entities/lesson.entity';

import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

import { CommonModule } from '../common/common.module';

/**
 * Media Module for Stellr Academy Backend
 * 
 * This module handles media file management and delivery:
 * 
 * 🎥 Video Management:
 * - Video upload and processing
 * - Video streaming and delivery
 * - Video transcoding and optimization
 * - Secure video access control
 * 
 * 📄 Document Management:
 * - PDF file storage and retrieval
 * - Document access control
 * - File download and streaming
 * - Document versioning
 * 
 * 🔒 Access Control:
 * - Secure URL generation
 * - Token-based file access
 * - User permission verification
 * - Content protection
 * 
 * ☁️ Storage Integration:
 * - Local file storage
 * - Cloud storage integration (S3, CloudFlare)
 * - CDN distribution
 * - File optimization and compression
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Media,
      User,
      Lesson,
    ]),
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
  ],
  controllers: [
    MediaController,
  ],
  providers: [
    MediaService,
  ],
  exports: [
    MediaService,
  ],
})
export class MediaModule {
  constructor() {
    console.log('🎥 Media module initialized - Video and document management ready');
  }
}