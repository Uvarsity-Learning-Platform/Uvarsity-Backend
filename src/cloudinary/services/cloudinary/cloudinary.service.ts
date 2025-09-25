import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import * as streamifier from 'streamifier';

/**
 * CloudinaryService - Core service for handling file uploads to Cloudinary
 *
 * This service provides:
 * - File upload functionality with automatic optimization
 * - Secure URL generation with transformations
 * - File deletion capabilities
 * - Support for images, videos, and documents
 * - Integration with Prisma database for metadata storage
 */
@Injectable()
export class CloudinaryService {
  // Logger instance for tracking upload operations and errors
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    // Configure Cloudinary with credentials from environment variables
    // These should be set in your .env file from your Cloudinary dashboard
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'), // Your cloud name
      api_key: this.configService.get('CLOUDINARY_API_KEY'), // Your API key
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'), // Your API secret
    });

    // Log successful configuration (without exposing secrets)
    this.logger.log('Cloudinary configured successfully');
  }

  /**
   * Upload a file to Cloudinary with automatic optimization
   *
   * @param file - The uploaded file from multer
   * @param folder - Cloudinary folder to organize uploads (e.g., 'courses/videos')
   * @param resourceType - Type of resource: image, video, or raw (for documents)
   * @returns Promise with upload result containing URL and public_id
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'media',
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{
    url: string;
    publicId: string;
    secureUrl: string;
    format: string;
    bytes: number;
  }> {
    try {
      // Convert file buffer to readable stream for Cloudinary upload
      const stream = streamifier.createReadStream(file.buffer);

      // Define upload options based on file type and requirements
      const uploadOptions = {
        folder, // Organize files in folders
        resource_type: resourceType as 'image' | 'video' | 'raw' | 'auto', // Specify if it's image, video, or raw file
        public_id: undefined, // Let Cloudinary generate unique ID
        overwrite: false, // Don't overwrite existing files
        invalidate: true, // Invalidate CDN cache for immediate availability

        // Conditional options based on resource type
        ...(resourceType === 'image' && {
          // Image-specific optimizations
          quality: 'auto:good', // Automatic quality optimization
          fetch_format: 'auto', // Automatic format selection (WebP, AVIF when supported)
          flags: 'progressive', // Progressive JPEG loading
        }),

        ...(resourceType === 'video' && {
          // Video-specific optimizations
          quality: 'auto', // Automatic video quality
        }),

        ...(resourceType === 'raw' &&
          {
            // Document/raw file options
          }),
      };

      // Perform the actual upload to Cloudinary
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) {
              // Log upload error with details
              this.logger.error(
                `Cloudinary upload failed: ${error.message}`,
                error,
              );
              reject(
                new BadRequestException(`Upload failed: ${error.message}`),
              );
            } else if (result) {
              // Log successful upload
              this.logger.log(
                `File uploaded successfully: ${result.public_id}`,
              );
              resolve(result);
            } else {
              // Handle unexpected empty result
              reject(
                new BadRequestException('Upload failed: No result returned'),
              );
            }
          },
        );

        // Pipe the file stream to Cloudinary upload stream
        stream.pipe(uploadStream);
      });

      // Return standardized response with essential upload information
      return {
        url: result.url, // Public URL for accessing the file
        publicId: result.public_id, // Cloudinary public ID for future operations
        secureUrl: result.secure_url, // HTTPS URL (recommended for production)
        format: result.format, // File format after processing
        bytes: result.bytes, // File size in bytes
      };
    } catch (error) {
      // Handle and log any upload errors
      this.logger.error(`Failed to upload file: ${error.message}`, error);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Generate a transformed URL for images with specific dimensions and optimizations
   * Useful for creating thumbnails, responsive images, etc.
   *
   * @param publicId - Cloudinary public ID of the image
   * @param transformations - Object containing transformation parameters
   * @returns Optimized and transformed image URL
   */
  getTransformedUrl(
    publicId: string,
    transformations: {
      width?: number; // Target width in pixels
      height?: number; // Target height in pixels
      crop?: string; // Crop mode: fill, fit, scale, etc.
      quality?: string; // Quality: auto, 80, etc.
      format?: string; // Target format: jpg, png, webp, etc.
      gravity?: string; // Focus area: face, center, etc.
    } = {},
  ): string {
    try {
      // Use Cloudinary's URL generation with transformations
      const transformedUrl = cloudinary.url(publicId, {
        // Default optimizations
        quality: transformations.quality || 'auto:good',
        fetch_format: transformations.format || 'auto',

        // Size and crop settings
        width: transformations.width,
        height: transformations.height,
        crop: transformations.crop || 'fill',
        gravity: transformations.gravity || 'auto',

        // Security and performance
        secure: true, // Always use HTTPS
        sign_url: false, // Public URLs don't need signing
      });

      this.logger.debug(`Generated transformed URL for ${publicId}`);
      return transformedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate transformed URL: ${error.message}`);
      // Return original URL if transformation fails
      return cloudinary.url(publicId, { secure: true });
    }
  }

  /**
   * Delete a file from Cloudinary
   * Important for cleanup when files are removed from the system
   *
   * @param publicId - Cloudinary public ID of the file to delete
   * @param resourceType - Type of resource being deleted
   * @returns Promise indicating success/failure of deletion
   */
  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{ success: boolean; result?: any }> {
    try {
      // Attempt to delete the file from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true, // Invalidate CDN cache
      });

      // Check if deletion was successful
      if (result.result === 'ok') {
        this.logger.log(`File deleted successfully: ${publicId}`);
        return { success: true, result };
      } else {
        this.logger.warn(
          `File deletion returned: ${result.result} for ${publicId}`,
        );
        return { success: false, result };
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      return { success: false, result: error.message };
    }
  }

  /**
   * Generate a secure, time-limited URL for private content
   * Useful for course materials that should only be accessible to enrolled students
   *
   * @param publicId - Cloudinary public ID
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL with expiration
   */
  generateSecureUrl(publicId: string, expiresIn: number = 3600): string {
    try {
      // Calculate expiration timestamp
      const expirationTimestamp = Math.floor(Date.now() / 1000) + expiresIn;

      // Generate signed URL with expiration
      const secureUrl = cloudinary.url(publicId, {
        sign_url: true, // Enable URL signing
        auth_token: {
          duration: expiresIn, // Token validity duration
        },
        secure: true, // Always use HTTPS
      });

      this.logger.debug(
        `Generated secure URL for ${publicId}, expires in ${expiresIn}s`,
      );
      return secureUrl;
    } catch (error) {
      this.logger.error(`Failed to generate secure URL: ${error.message}`);
      // Fallback to regular secure URL
      return cloudinary.url(publicId, { secure: true });
    }
  }

  /**
   * Get detailed information about a file stored in Cloudinary
   * Useful for file management and displaying file metadata
   *
   * @param publicId - Cloudinary public ID
   * @param resourceType - Type of resource
   * @returns Detailed file information
   */
  async getFileInfo(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<any> {
    try {
      // Fetch file details from Cloudinary
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      this.logger.debug(`Retrieved file info for: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get file info: ${error.message}`);
      throw new BadRequestException(
        `Failed to get file info: ${error.message}`,
      );
    }
  }
}
