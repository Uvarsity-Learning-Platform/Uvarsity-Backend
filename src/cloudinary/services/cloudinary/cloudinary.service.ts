import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import * as streamifier from 'streamifier';
import type { Express } from 'express'; 
import { Multer} from 'multer';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('✅ Cloudinary configured successfully');
  }

  async uploadFile(
    file: Express.Multer.File, 
    folder = 'media',
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{
    url: string;
    publicId: string;
    secureUrl: string;
    format: string;
    bytes: number;
  }> {
    try {
      const stream = streamifier.createReadStream(file.buffer);

      const uploadOptions = {
        folder,
        resource_type: resourceType,
        overwrite: false,
        invalidate: true,
        ...(resourceType === 'image' && {
          quality: 'auto:good',
          fetch_format: 'auto',
          flags: 'progressive',
        }),
        ...(resourceType === 'video' && { quality: 'auto' }),
      };

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              this.logger.error(`Cloudinary upload failed: ${error.message}`);
              reject(new BadRequestException(`Upload failed: ${error.message}`));
            } else if (result) {
              this.logger.log(`✅ File uploaded: ${result.public_id}`);
              resolve(result);
            } else {
              reject(new BadRequestException('Upload failed: No result returned'));
            }
          },
        );

        stream.pipe(uploadStream);
      });

      return {
        url: result.url,
        publicId: result.public_id,
        secureUrl: result.secure_url,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`);
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  getTransformedUrl(
    publicId: string,
    transformations: {
      width?: number;
      height?: number;
      crop?: string;
      quality?: string;
      format?: string;
      gravity?: string;
    } = {},
  ): string {
    try {
      const transformedUrl = cloudinary.url(publicId, {
        quality: transformations.quality || 'auto:good',
        fetch_format: transformations.format || 'auto',
        width: transformations.width,
        height: transformations.height,
        crop: transformations.crop || 'fill',
        gravity: transformations.gravity || 'auto',
        secure: true,
      });

      this.logger.debug(`Generated transformed URL for ${publicId}`);
      return transformedUrl;
    } catch (error) {
      this.logger.error(`Failed to generate transformed URL: ${error.message}`);
      return cloudinary.url(publicId, { secure: true });
    }
  }

  async deleteFile(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<{ success: boolean; result?: any }> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (result.result === 'ok') {
        this.logger.log(`🗑️ File deleted: ${publicId}`);
        return { success: true, result };
      } else {
        this.logger.warn(`⚠️ File deletion returned: ${result.result}`);
        return { success: false, result };
      }
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`);
      return { success: false, result: error.message };
    }
  }

  generateSecureUrl(publicId: string, expiresIn = 3600): string {
    try {
      const secureUrl = cloudinary.url(publicId, {
        sign_url: true,
        auth_token: { duration: expiresIn },
        secure: true,
      });

      this.logger.debug(
        `Generated secure URL for ${publicId}, expires in ${expiresIn}s`,
      );
      return secureUrl;
    } catch (error) {
      this.logger.error(`Failed to generate secure URL: ${error.message}`);
      return cloudinary.url(publicId, { secure: true });
    }
  }

  async getFileInfo(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      this.logger.debug(`Retrieved file info for: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get file info: ${error.message}`);
      throw new BadRequestException(`Failed to get file info: ${error.message}`);
    }
  }
}
