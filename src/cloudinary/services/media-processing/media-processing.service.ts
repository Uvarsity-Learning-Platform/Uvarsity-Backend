import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';import * as sharp from 'sharp';
import { Express } from 'express';
import { MediaType } from '@prisma/client';


/**
 * MediaProcessingService - Handles file processing before and after Cloudinary upload
 *
 * This service provides:
 * - File type detection and validation
 * - Pre-processing (compression, format conversion)
 * - Post-processing (thumbnail generation, metadata extraction)
 * - Integration with Prisma Media model for database storage
 */
@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(private cloudinaryService: CloudinaryService) {}

  /**
   * Process and upload any type of media file
   * This is the main entry point for file uploads in the application
   *
   * @param file - Uploaded file from multer
   * @param courseId - ID of the course this media belongs to
   * @param uploaderId - ID of the user uploading the file
   * @returns Processed file information for database storage
   */
  async processAndUploadMedia(
  file: Express.Multer.File,
  courseId: string,
  uploaderId: string,
  ): Promise<{
    url: string;
    publicId: string;
    mediaType: MediaType;
    thumbnailUrl?: string;
    duration?: number;
    resolution?: string;
    fileSize: number;
    originalName: string;
    mimeType: string;
  }> {
    try {
      // Step 1: Determine the media type based on MIME type
      const mediaType = this.determineMediaType(file.mimetype);
      this.logger.log(`Processing ${mediaType} file: ${file.originalname}`);

      // Step 2: Validate file size and type
      this.validateFile(file, mediaType);

      // Step 3: Process the file based on its type
      let uploadResult: any;
      let thumbnailUrl: string | undefined;
      let duration: number | undefined;
      let resolution: string | undefined;

      switch (mediaType) {
        case MediaType.IMAGE:
          uploadResult = await this.processImage(file, courseId);
          // Generate thumbnail for images
          thumbnailUrl = this.cloudinaryService.getTransformedUrl(
            uploadResult.publicId,
            { width: 300, height: 200, crop: 'fill' },
          );
          break;

        case MediaType.VIDEO:
          uploadResult = await this.processVideo(file, courseId);
          // Cloudinary automatically generates video thumbnails
          thumbnailUrl = this.cloudinaryService.getTransformedUrl(
            uploadResult.publicId,
            { width: 400, height: 300, crop: 'fill', format: 'jpg' },
          );
          break;

        case MediaType.DOCUMENT:
          uploadResult = await this.processDocument(file, courseId);
          break;

        case MediaType.AUDIO:
          uploadResult = await this.processAudio(file, courseId);
          break;

        default:
          throw new BadRequestException(`Unsupported media type: ${mediaType}`);
      }

      // Step 4: Extract additional metadata if available
      if (mediaType === MediaType.VIDEO) {
        // For videos, we can get duration and resolution from Cloudinary response
        const fileInfo = await this.cloudinaryService.getFileInfo(
          uploadResult.publicId,
          'video',
        );
        duration = fileInfo.duration; // Duration in seconds
        resolution = `${fileInfo.width}x${fileInfo.height}`;
      }

      // Step 5: Return processed file information
      const result = {
        url: uploadResult.secureUrl, // Secure HTTPS URL
        publicId: uploadResult.publicId, // Cloudinary public ID
        mediaType, // Determined media type
        thumbnailUrl, // Generated thumbnail URL
        duration, // Video/audio duration in seconds
        resolution, // Video resolution
        fileSize: uploadResult.bytes, // File size in bytes
        originalName: file.originalname, // Original filename
        mimeType: file.mimetype, // MIME type
      };

      this.logger.log(`Successfully processed file: ${file.originalname}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to process media: ${error.message}`, error);
      throw new BadRequestException(
        `Failed to process media: ${error.message}`,
      );
    }
  }

  /**
   * Process image files with optimization and format conversion
   *
   * @param file - Image file to process
   * @param courseId - Course ID for folder organization
   * @returns Upload result from Cloudinary
   */
  private async processImage(file: Express.Multer.File, courseId: string) {
    try {
      // Pre-process image with Sharp for additional optimization
      const optimizedBuffer = await sharp(file.buffer)
        .resize(1920, 1080, {
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true, // Don't upscale small images
        })
        .jpeg({
          quality: 85, // Good quality while reducing file size
          progressive: true, // Progressive loading
        })
        .toBuffer();

      // Create optimized file object
      const optimizedFile = {
        ...file,
        buffer: optimizedBuffer,
      };

      // Upload to Cloudinary with image-specific settings
      return await this.cloudinaryService.uploadFile(
        optimizedFile,
        `courses/${courseId}/images`, // Organized folder structure
        'image',
      );
    } catch (error) {
      this.logger.error(`Image processing failed: ${error.message}`);
      // Fallback: upload original file if processing fails
      return await this.cloudinaryService.uploadFile(
        file,
        `courses/${courseId}/images`,
        'image',
      );
    }
  }

  /**
   * Process video files
   * Cloudinary handles video optimization automatically
   *
   * @param file - Video file to process
   * @param courseId - Course ID for folder organization
   * @returns Upload result from Cloudinary
   */
  private async processVideo(file: Express.Multer.File, courseId: string) {
    // Upload video to Cloudinary
    // Cloudinary automatically handles video optimization, transcoding, and thumbnail generation
    return await this.cloudinaryService.uploadFile(
      file,
      `courses/${courseId}/videos`, // Organized folder structure
      'video',
    );
  }

  /**
   * Process document files (PDFs, Word docs, etc.)
   *
   * @param file - Document file to process
   * @param courseId - Course ID for folder organization
   * @returns Upload result from Cloudinary
   */
  private async processDocument(file: Express.Multer.File, courseId: string) {
    // Upload document as raw file to Cloudinary
    return await this.cloudinaryService.uploadFile(
      file,
      `courses/${courseId}/documents`, // Organized folder structure
      'raw',
    );
  }

  /**
   * Process audio files
   *
   * @param file - Audio file to process
   * @param courseId - Course ID for folder organization
   * @returns Upload result from Cloudinary
   */
  private async processAudio(file: Express.Multer.File, courseId: string) {
    // Upload audio file to Cloudinary
    return await this.cloudinaryService.uploadFile(
      file,
      `courses/${courseId}/audio`, // Organized folder structure
      'video', // Cloudinary uses 'video' resource type for audio files
    );
  }

  /**
   * Determine media type based on MIME type
   *
   * @param mimeType - File MIME type
   * @returns Corresponding MediaType enum value
   */
  private determineMediaType(mimeType: string): MediaType {
    // Image files
    if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    }

    // Video files
    if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    }

    // Audio files
    if (mimeType.startsWith('audio/')) {
      return MediaType.AUDIO;
    }

    // Document files
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return MediaType.DOCUMENT;
    }

    // Default to document for unknown types
    return MediaType.DOCUMENT;
  }

  /**
   * Validate uploaded file based on type and size constraints
   *
   * @param file - File to validate
   * @param mediaType - Determined media type
   */
  private validateFile(file: Express.Multer.File, mediaType: MediaType): void {
    // Define size limits for different media types (in bytes)
    const SIZE_LIMITS = {
      [MediaType.IMAGE]: 10 * 1024 * 1024, // 10MB for images
      [MediaType.VIDEO]: 500 * 1024 * 1024, // 500MB for videos
      [MediaType.AUDIO]: 50 * 1024 * 1024, // 50MB for audio
      [MediaType.DOCUMENT]: 20 * 1024 * 1024, // 20MB for documents
      [MediaType.ARCHIVE]: 100 * 1024 * 1024, // 100MB for archives
    };

    // Check file size
    const maxSize = SIZE_LIMITS[mediaType];
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Maximum size for ${mediaType} is ${Math.round(maxSize / (1024 * 1024))}MB`,
      );
    }

    // Validate file has content
    if (file.size === 0) {
      throw new BadRequestException('File is empty');
    }

    this.logger.debug(`File validation passed for: ${file.originalname}`);
  }

  /**
   * Delete media file from Cloudinary
   *
   * @param publicId - Cloudinary public ID
   * @param mediaType - Type of media being deleted
   * @returns Deletion result
   */
  async deleteMedia(
    publicId: string,
    mediaType: MediaType,
  ): Promise<{ success: boolean }> {
    try {
      // Map MediaType to Cloudinary resource type
      const resourceType = this.getCloudinaryResourceType(mediaType);

      // Delete from Cloudinary
      const result = await this.cloudinaryService.deleteFile(
        publicId,
        resourceType,
      );

      if (result.success) {
        this.logger.log(`Successfully deleted media: ${publicId}`);
      } else {
        this.logger.warn(`Failed to delete media: ${publicId}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error deleting media: ${error.message}`);
      return { success: false };
    }
  }

  /**
   * Map MediaType enum to Cloudinary resource type
   *
   * @param mediaType - Internal MediaType enum
   * @returns Cloudinary resource type string
   */
  private getCloudinaryResourceType(
    mediaType: MediaType,
  ): 'image' | 'video' | 'raw' {
    switch (mediaType) {
      case MediaType.IMAGE:
        return 'image';
      case MediaType.VIDEO:
      case MediaType.AUDIO:
        return 'video'; // Cloudinary uses 'video' for both video and audio
      default:
        return 'raw'; // Documents and other files
    }
  }
}
