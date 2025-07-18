import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

import { LoggerService } from '../../common/services/logger.service';
import { Media } from '../entities/media.entity';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../course/entities/lesson.entity';

/**
 * Media Service for Uvarsity Backend
 * 
 * This service handles all media-related business logic:
 * - Video upload and processing
 * - PDF file storage and organization
 * - Secure media access and streaming
 * - Media analytics and tracking
 * - File optimization and CDN integration
 */
@Injectable()
export class MediaService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads';

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    private readonly logger: LoggerService,
  ) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Upload media file
   */
  async uploadMedia(
    file: any, // Express.Multer.File
    uploadedBy: string,
    options?: {
      lessonId?: string;
      title?: string;
      description?: string;
      accessControl?: any;
    },
  ): Promise<Media> {
    this.logger.log(`Uploading media file: ${file.originalname}`, 'MediaService');

    // Validate file
    this.validateFile(file);

    // Get uploader
    const uploader = await this.userRepository.findOne({
      where: { id: uploadedBy },
    });

    if (!uploader) {
      throw new NotFoundException('Uploader not found');
    }

    // Validate lesson if provided
    if (options?.lessonId) {
      const lesson = await this.lessonRepository.findOne({
        where: { id: options.lessonId },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }
    }

    // Generate stored filename
    const fileExtension = path.extname(file.originalname);
    const storedFilename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${fileExtension}`;
    const filePath = path.join(this.uploadPath, storedFilename);

    // Save file to storage
    fs.writeFileSync(filePath, file.buffer);

    // Determine media type
    const mediaType = this.getMediaType(file.mimetype);

    // Create media record
    const media = this.mediaRepository.create({
      title: options?.title || file.originalname,
      description: options?.description,
      type: mediaType,
      format: fileExtension.substring(1).toLowerCase(),
      originalFilename: file.originalname,
      storedFilename,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy,
      lessonId: options?.lessonId,
      storageInfo: {
        provider: 'local',
        path: filePath,
        url: `/api/v1/media/${storedFilename}`,
      },
      accessControl: options?.accessControl || {
        public: false,
        requiresAuth: true,
      },
      metadata: {
        uploadedAt: new Date(),
        checksum: this.calculateChecksum(file.buffer),
      },
    });

    const savedMedia = await this.mediaRepository.save(media);

    // Start processing if needed
    if (mediaType === 'video' || mediaType === 'image') {
      this.processMedia(savedMedia);
    } else {
      savedMedia.updateProcessingStatus('completed', 100);
      await this.mediaRepository.save(savedMedia);
    }

    this.logger.log(`Media uploaded successfully: ${savedMedia.id}`, 'MediaService');
    return savedMedia;
  }

  /**
   * Get media by ID
   */
  async getMediaById(id: string, userId?: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({
      where: { id },
      relations: ['lesson', 'uploader'],
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Check access permissions
    if (!media.isAccessibleBy(userId)) {
      throw new ForbiddenException('Access denied to this media');
    }

    return media;
  }

  /**
   * Get media for lesson
   */
  async getLessonMedia(lessonId: string, userId?: string): Promise<Media[]> {
    const media = await this.mediaRepository.find({
      where: { lessonId },
      order: { createdAt: 'ASC' },
    });

    // Filter by access permissions
    return media.filter(m => m.isAccessibleBy(userId));
  }

  /**
   * Stream media file
   */
  async streamMedia(id: string, userId?: string): Promise<{ stream: Buffer; media: Media }> {
    const media = await this.getMediaById(id, userId);

    // Update view count
    media.incrementViewCount();
    await this.mediaRepository.save(media);

    // Read file from storage
    const filePath = media.storageInfo.path;
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Media file not found on storage');
    }

    const stream = fs.readFileSync(filePath);

    this.logger.log(`Media streamed: ${id}`, 'MediaService');
    return { stream, media };
  }

  /**
   * Download media file
   */
  async downloadMedia(id: string, userId?: string): Promise<{ buffer: Buffer; media: Media }> {
    const media = await this.getMediaById(id, userId);

    // Check if downloads are allowed
    if (media.accessControl.downloadLimit && media.downloadCount >= media.accessControl.downloadLimit) {
      throw new BadRequestException('Download limit reached');
    }

    // Update download count
    media.incrementDownloadCount();
    await this.mediaRepository.save(media);

    // Read file from storage
    const filePath = media.storageInfo.path;
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Media file not found on storage');
    }

    const buffer = fs.readFileSync(filePath);

    this.logger.log(`Media downloaded: ${id}`, 'MediaService');
    return { buffer, media };
  }

  /**
   * Update media information
   */
  async updateMedia(id: string, updateData: any, userId: string): Promise<Media> {
    const media = await this.mediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Check if user can update (must be uploader or admin)
    if (media.uploadedBy !== userId) {
      throw new ForbiddenException('Only the uploader can update media');
    }

    Object.assign(media, updateData);
    const updatedMedia = await this.mediaRepository.save(media);

    this.logger.log(`Media updated: ${id}`, 'MediaService');
    return updatedMedia;
  }

  /**
   * Delete media
   */
  async deleteMedia(id: string, userId: string): Promise<void> {
    const media = await this.mediaRepository.findOne({
      where: { id },
    });

    if (!media) {
      throw new NotFoundException('Media not found');
    }

    // Check if user can delete (must be uploader or admin)
    if (media.uploadedBy !== userId) {
      throw new ForbiddenException('Only the uploader can delete media');
    }

    // Delete file from storage
    const filePath = media.storageInfo.path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await this.mediaRepository.remove(media);

    this.logger.log(`Media deleted: ${id}`, 'MediaService');
  }

  /**
   * Get media analytics
   */
  async getMediaAnalytics(id: string, userId: string): Promise<any> {
    const media = await this.getMediaById(id, userId);

    return {
      id: media.id,
      title: media.title,
      type: media.type,
      fileSize: media.fileSize,
      viewCount: media.viewCount,
      downloadCount: media.downloadCount,
      totalWatchTime: media.totalWatchTime,
      averageWatchTime: media.viewCount > 0 ? media.totalWatchTime / media.viewCount : 0,
      lastAccessedAt: media.lastAccessedAt,
      createdAt: media.createdAt,
      metadata: media.metadata,
    };
  }

  /**
   * Search media
   */
  async searchMedia(
    query: string,
    options?: {
      type?: string;
      lessonId?: string;
      userId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Media[]> {
    const queryBuilder = this.mediaRepository.createQueryBuilder('media')
      .where('media.title LIKE :query OR media.description LIKE :query', {
        query: `%${query}%`,
      })
      .orderBy('media.createdAt', 'DESC');

    if (options?.type) {
      queryBuilder.andWhere('media.type = :type', { type: options.type });
    }

    if (options?.lessonId) {
      queryBuilder.andWhere('media.lessonId = :lessonId', { lessonId: options.lessonId });
    }

    if (options?.userId) {
      queryBuilder.andWhere('media.uploadedBy = :userId', { userId: options.userId });
    }

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }

    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get user's media
   */
  async getUserMedia(userId: string, type?: string): Promise<Media[]> {
    const query = this.mediaRepository.createQueryBuilder('media')
      .where('media.uploadedBy = :userId', { userId })
      .orderBy('media.createdAt', 'DESC');

    if (type) {
      query.andWhere('media.type = :type', { type });
    }

    return query.getMany();
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: any): void {
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds limit (100MB)');
    }

    // Check file type
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File type not supported');
    }
  }

  /**
   * Get media type from MIME type
   */
  private getMediaType(mimeType: string): 'video' | 'pdf' | 'image' | 'audio' | 'document' | 'other' {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/')) return 'document';
    return 'other';
  }

  /**
   * Calculate file checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Process media (placeholder for video transcoding, image optimization, etc.)
   */
  private async processMedia(media: Media): Promise<void> {
    this.logger.log(`Processing media: ${media.id}`, 'MediaService');

    // Start processing
    media.updateProcessingStatus('processing', 0);
    await this.mediaRepository.save(media);

    // Simulate processing
    setTimeout(async () => {
      try {
        // TODO: Implement actual media processing
        // - Video transcoding
        // - Image optimization
        // - Thumbnail generation
        // - Metadata extraction

        // Update metadata based on media type
        if (media.type === 'video') {
          // TODO: Extract video metadata
          media.metadata.duration = 300; // placeholder
          media.metadata.resolution = '1920x1080'; // placeholder
          media.metadata.bitrate = 1000000; // placeholder
        } else if (media.type === 'image') {
          // TODO: Extract image metadata
          media.metadata.width = 1920; // placeholder
          media.metadata.height = 1080; // placeholder
        }

        media.updateProcessingStatus('completed', 100);
        await this.mediaRepository.save(media);

        this.logger.log(`Media processing completed: ${media.id}`, 'MediaService');
      } catch (error) {
        media.updateProcessingStatus('failed', 0);
        await this.mediaRepository.save(media);

        this.logger.error(`Media processing failed: ${media.id}`, 'MediaService', error.stack);
      }
    }, 5000); // 5 second processing simulation
  }
}