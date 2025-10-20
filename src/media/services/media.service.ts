import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MediaProcessingService } from '../../cloudinary/services/media-processing/media-processing.service';
import { CloudinaryService } from '../../cloudinary/services/cloudinary/cloudinary.service';
import { MediaType } from '../../../generated/prisma';

/**
 * MediaService - Business logic layer for media management
 *
 * This service handles:
 * - Media upload and processing workflow
 * - Database operations for media metadata
 * - File access control and permissions
 * - Media retrieval and organization
 * - Integration between Cloudinary and Prisma
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private prisma: DatabaseService, // Database operations
    private mediaProcessingService: MediaProcessingService, // File processing
    private cloudinaryService: CloudinaryService, // Direct Cloudinary operations
  ) {}

  /**
   * Upload and process a media file
   * This is the main entry point for file uploads in the application
   *
   * @param file - Uploaded file from multer middleware
   * @param courseId - ID of the course this media belongs to
   * @param uploaderId - ID of the user uploading the file
   * @returns Media record with database ID and file information
   */
  async uploadFile(
    file: Express.Multer.File,
    courseId: string,
    uploaderId: string,
  ) {
    return this.uploadMedia(file, courseId, uploaderId);
  }
  async uploadMedia(
    file: Express.Multer.File,
    courseId: string,
    uploaderId: string,
  ) {
    try {
      // Step 1: Verify the course exists and user has permission to upload
      await this.validateUploadPermissions(courseId, uploaderId);

      // Step 2: Process and upload the file to Cloudinary
      this.logger.log(
        `Starting upload for file: ${file.originalname} by user: ${uploaderId}`,
      );

      const processedFile =
        await this.mediaProcessingService.processAndUploadMedia(
          file,
          courseId,
          uploaderId,
        );

      // Step 3: Calculate the next upload index for this course
      // This helps maintain chronological order of uploads
      const lastMedia = await this.prisma.media.findFirst({
        where: { courseId },
        orderBy: { uploadIndex: 'desc' },
        select: { uploadIndex: true },
      });

      const nextIndex = lastMedia ? lastMedia.uploadIndex + 1 : 1;

      // Step 4: Save media metadata to database
      const mediaRecord = await this.prisma.media.create({
        data: {
          courseId, // Associate with course
          uploaderId, // Track who uploaded
          fileName: processedFile.originalName, // Original filename
          fileSize: BigInt(processedFile.fileSize), // File size in bytes
          mimeType: processedFile.mimeType, // MIME type
          mediaType: processedFile.mediaType, // Our MediaType enum
          url: processedFile.url, // Cloudinary URL
          thumbnailUrl: processedFile.thumbnailUrl, // Thumbnail URL if generated
          duration: processedFile.duration, // Duration for video/audio
          resolution: processedFile.resolution, // Resolution for videos
          uploadIndex: nextIndex, // Sequential upload order
          isProcessed: true, // Mark as successfully processed
          // Store Cloudinary public_id in a JSON metadata field for future operations
          // This allows us to perform operations like deletion or transformation
        },
        include: {
          course: {
            select: { title: true, instructorId: true }, // Include course info
          },
          uploader: {
            select: { name: true, email: true }, // Include uploader info
          },
        },
      });

      // Step 5: Log successful upload and return response
      this.logger.log(
        `Media uploaded successfully: ${mediaRecord.id} for course: ${courseId}`,
      );

      return {
        id: mediaRecord.id, // Database record ID
        fileName: mediaRecord.fileName, // Original filename
        url: mediaRecord.url, // Public URL
        thumbnailUrl: mediaRecord.thumbnailUrl, // Thumbnail URL
        mediaType: mediaRecord.mediaType, // Media type
        fileSize: Number(mediaRecord.fileSize), // File size (convert BigInt to number)
        duration: mediaRecord.duration, // Duration if applicable
        resolution: mediaRecord.resolution, // Resolution if applicable
        uploadIndex: mediaRecord.uploadIndex, // Upload order
        uploadedAt: mediaRecord.uploadedAt, // Upload timestamp
        course: mediaRecord.course, // Course information
        uploader: mediaRecord.uploader, // Uploader information
      };
    } catch (error) {
      this.logger.error(`Media upload failed: ${error.message}`, error);
      throw error; // Re-throw to be handled by controller
    }
  }

  /**
   * Delete a media file
   * Removes both the file from Cloudinary and the database record
   *
   * @param mediaId - Database ID of the media to delete
   * @param userId - ID of the user requesting deletion
   * @returns Confirmation of deletion
   */
  async deleteMedia(mediaId: string, userId: string) {
    try {
      // Step 1: Find the media record and verify ownership/permissions
      const media = await this.prisma.media.findUnique({
        where: { id: mediaId },
        include: {
          course: {
            select: { instructorId: true, title: true },
          },
          uploader: {
            select: { id: true, name: true },
          },
        },
      });

      if (!media) {
        throw new NotFoundException('Media file not found');
      }

      // Step 2: Check if user has permission to delete this media
      // Only the uploader or course instructor can delete media
      if (media.uploaderId !== userId && media.course.instructorId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this media',
        );
      }

      // Step 3: Extract Cloudinary public_id from URL
      // Cloudinary URLs follow the pattern: .../upload/v{version}/{public_id}.{format}
      const publicId = this.extractPublicIdFromUrl(media.url);

      // Step 4: Delete file from Cloudinary
      if (publicId) {
        const deleteResult = await this.mediaProcessingService.deleteMedia(
          publicId,
          media.mediaType,
        );

        if (!deleteResult.success) {
          this.logger.warn(
            `Failed to delete file from Cloudinary: ${publicId}`,
          );
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Step 5: Delete database record
      await this.prisma.media.delete({
        where: { id: mediaId },
      });

      this.logger.log(`Media deleted successfully: ${mediaId}`);

      return {
        success: true,
        message: 'Media file deleted successfully',
        deletedFile: {
          id: media.id,
          fileName: media.fileName,
          course: media.course.title,
        },
      };
    } catch (error) {
      this.logger.error(`Media deletion failed: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get media files for a specific course
   * Supports pagination and filtering
   *
   * @param courseId - Course ID to get media for
   * @param options - Pagination and filter options
   * @returns Paginated list of media files
   */
  async getCourseMedia(
    courseId: string,
    options: {
      page?: number; // Page number (1-based)
      limit?: number; // Items per page
      mediaType?: MediaType; // Filter by media type
      userId?: string; // User requesting (for permission check)
    } = {},
  ) {
    try {
      // Set default pagination values
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 50); // Max 50 items per page
      const skip = (page - 1) * limit;

      // Step 1: Verify course exists and user has access
      if (options.userId) {
        await this.validateCourseAccess(courseId, options.userId);
      }

      // Step 2: Build query conditions
      const whereConditions = {
        courseId,
        ...(options.mediaType && { mediaType: options.mediaType }),
        isProcessed: true, // Only show successfully processed files
      };

      // Step 3: Get total count for pagination
      const totalCount = await this.prisma.media.count({
        where: whereConditions,
      });

      // Step 4: Get paginated media files
      const mediaFiles = await this.prisma.media.findMany({
        where: whereConditions,
        include: {
          uploader: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [
          { uploadIndex: 'asc' }, // Primary sort by upload order
          { uploadedAt: 'desc' }, // Secondary sort by timestamp
        ],
        skip,
        take: limit,
      });

      // Step 5: Transform data for response
      const transformedMedia = mediaFiles.map((media: { id: any; fileName: any; url: any; thumbnailUrl: any; mediaType: any; fileSize: any; duration: any; resolution: any; uploadIndex: any; uploadedAt: any; uploader: any; }) => ({
        id: media.id,
        fileName: media.fileName,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        mediaType: media.mediaType,
        fileSize: Number(media.fileSize), // Convert BigInt to number for JSON
        duration: media.duration,
        resolution: media.resolution,
        uploadIndex: media.uploadIndex,
        uploadedAt: media.uploadedAt,
        uploader: media.uploader,
      }));

      // Step 6: Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      this.logger.debug(
        `Retrieved ${mediaFiles.length} media files for course: ${courseId}`,
      );

      return {
        data: transformedMedia,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage,
          hasPreviousPage,
          limit,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get course media: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get a specific media file by ID
   * Includes permission checking
   *
   * @param mediaId - Media file ID
   * @param userId - User requesting the file
   * @returns Media file details
   */
  async getMediaById(mediaId: string, userId?: string) {
    try {
      // Find media file with related data
      const media = await this.prisma.media.findUnique({
        where: { id: mediaId },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              instructorId: true,
            },
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!media) {
        throw new NotFoundException('Media file not found');
      }

      // Check access permissions if user is provided
      if (userId) {
        await this.validateCourseAccess(media.courseId, userId);
      }

      // Generate secure URL for video content or sensitive materials
      let secureUrl = media.url;
      if (media.mediaType === MediaType.VIDEO && userId) {
        // Generate time-limited URL for video content (1 hour expiry)
        const publicId = this.extractPublicIdFromUrl(media.url);
        if (publicId) {
          secureUrl = this.cloudinaryService.generateSecureUrl(publicId, 3600);
        }
      }

      return {
        id: media.id,
        fileName: media.fileName,
        url: secureUrl, // May be secure URL for videos
        thumbnailUrl: media.thumbnailUrl,
        mediaType: media.mediaType,
        fileSize: Number(media.fileSize),
        duration: media.duration,
        resolution: media.resolution,
        uploadIndex: media.uploadIndex,
        uploadedAt: media.uploadedAt,
        course: media.course,
        uploader: media.uploader,
      };
    } catch (error) {
      this.logger.error(`Failed to get media by ID: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get media files uploaded by a specific user
   *
   * @param userId - User ID
   * @param limit - Number of files to return
   * @returns List of user's uploaded media
   */
  async getUserMedia(userId: string, limit: number = 20) {
    try {
      const mediaFiles = await this.prisma.media.findMany({
        where: {
          uploaderId: userId,
          isProcessed: true,
        },
        include: {
          course: {
            select: { id: true, title: true },
          },
        },
        orderBy: { uploadedAt: 'desc' },
        take: Math.min(limit, 50), // Max 50 files
      });

      return mediaFiles.map((media: { id: any; fileName: any; url: any; thumbnailUrl: any; mediaType: any; fileSize: any; uploadedAt: any; course: any; }) => ({
        id: media.id,
        fileName: media.fileName,
        url: media.url,
        thumbnailUrl: media.thumbnailUrl,
        mediaType: media.mediaType,
        fileSize: Number(media.fileSize),
        uploadedAt: media.uploadedAt,
        course: media.course,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user media: ${error.message}`, error);
      throw error;
    }
  }

  // --- PRIVATE HELPER METHODS ---

  /**
   * Validate that a user has permission to upload media to a course
   *
   * @param courseId - Course ID
   * @param userId - User ID
   */
  private async validateUploadPermissions(
    courseId: string,
    userId: string,
  ): Promise<void> {
    // Find the course and check if user is the instructor
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, title: true, status: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Only course instructors can upload media
    if (course.instructorId !== userId) {
      throw new ForbiddenException('Only course instructors can upload media');
    }

    // Don't allow uploads to archived courses
    if (course.status === 'ARCHIVED') {
      throw new ForbiddenException('Cannot upload media to archived courses');
    }
  }

  /**
   * Validate that a user has access to view course media
   *
   * @param courseId - Course ID
   * @param userId - User ID
   */
  private async validateCourseAccess(
    courseId: string,
    userId: string,
  ): Promise<void> {
    // Check if user is enrolled in the course or is the instructor
    const access = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { instructorId: userId }, // User is instructor
          { enrollments: { some: { userId } } }, // User is enrolled
        ],
      },
    });

    if (!access) {
      throw new ForbiddenException('You do not have access to this course');
    }
  }

  /**
   * Extract Cloudinary public_id from a URL
   *
   * @param url - Cloudinary URL
   * @returns Public ID or null if extraction fails
   */
  private extractPublicIdFromUrl(url: string): string | null {
    try {
      // Cloudinary URLs have format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
      const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
      return matches ? matches[1] : null;
    } catch (error) {
      this.logger.warn(`Failed to extract public ID from URL: ${url}`);
      return null;
    }
  }
}
