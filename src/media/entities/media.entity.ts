import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../course/entities/lesson.entity';

/**
 * Media entity for the Uvarsity platform
 * 
 * This entity represents media files (videos, PDFs, images, etc.):
 * 
 * 🎥 Video Management:
 * - Video upload and processing
 * - Video transcoding and optimization
 * - Secure video streaming
 * - Video progress tracking
 * 
 * 📄 Document Management:
 * - PDF file storage
 * - Document access control
 * - File download tracking
 * - Document versioning
 * 
 * 🔒 Access Control:
 * - Secure URL generation
 * - Token-based access
 * - Permission verification
 * - Content protection
 */
@Entity('media')
@Index(['lessonId'])
@Index(['uploadedBy'])
@Index(['type'])
@Index(['status'])
export class Media {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Media title
   */
  @Column({ length: 200 })
  title: string;

  /**
   * Media description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Media type
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  type: 'video' | 'pdf' | 'image' | 'audio' | 'document' | 'other';

  /**
   * Media format/extension
   */
  @Column({ length: 10 })
  format: string;

  /**
   * Original filename
   */
  @Column({ length: 255 })
  originalFilename: string;

  /**
   * Stored filename
   */
  @Column({ length: 255 })
  storedFilename: string;

  /**
   * File size in bytes
   */
  @Column({ type: 'bigint' })
  fileSize: number;

  /**
   * MIME type
   */
  @Column({ length: 100 })
  mimeType: string;

  /**
   * File storage information
   */
  @Column({
    type: 'text',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  storageInfo: {
    provider: 'local' | 'aws' | 'cloudflare' | 'gcs';
    bucket?: string;
    region?: string;
    path: string;
    url: string;
    thumbnailUrl?: string;
    variants?: {
      quality: string;
      url: string;
      fileSize: number;
    }[];
  };

  /**
   * Media metadata
   */
  @Column({
    type: 'text',
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  metadata: {
    // Video specific
    duration?: number; // in seconds
    resolution?: string; // e.g., "1920x1080"
    bitrate?: number;
    fps?: number;
    codec?: string;
    
    // Audio specific
    audioCodec?: string;
    audioChannels?: number;
    audioSampleRate?: number;
    
    // Document specific
    pageCount?: number;
    wordCount?: number;
    
    // Image specific
    width?: number;
    height?: number;
    
    // Common
    checksum?: string;
    uploadedAt?: Date;
    processedAt?: Date;
    tags?: string[];
    transcriptUrl?: string;
    captionsUrl?: string;
  };

  /**
   * Lesson this media belongs to
   */
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson?: Lesson;

  @Column({ type: 'uuid', nullable: true })
  lessonId?: string;

  /**
   * User who uploaded this media
   */
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedBy' })
  uploader?: User;

  @Column({ type: 'uuid', nullable: true })
  uploadedBy?: string;

  /**
   * Media processing status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'deleted';

  /**
   * Processing progress (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  processingProgress: number;

  /**
   * Access control settings
   */
  @Column({
    type: 'text',
    default: '{"public":false,"requiresAuth":true}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  accessControl: {
    public: boolean;
    requiresAuth: boolean;
    allowedUserIds?: string[];
    allowedRoles?: string[];
    expiresAt?: Date;
    downloadLimit?: number;
    ipWhitelist?: string[];
  };

  /**
   * Usage statistics
   */
  @Column({ type: 'integer', default: 0 })
  viewCount: number;

  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalWatchTime: number; // in seconds

  @Column({ type: 'datetime', nullable: true })
  lastAccessedAt?: Date;

  /**
   * Timestamps
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  deletedAt?: Date;

  /**
   * Helper methods
   */

  /**
   * Check if media is accessible by user
   */
  isAccessibleBy(userId?: string): boolean {
    if (this.accessControl.public) {
      return true;
    }

    if (!userId) {
      return false;
    }

    if (this.accessControl.requiresAuth) {
      if (this.accessControl.allowedUserIds) {
        return this.accessControl.allowedUserIds.includes(userId);
      }
      return true; // Auth required but no specific user restrictions
    }

    return false;
  }

  /**
   * Check if media is expired
   */
  isExpired(): boolean {
    return this.accessControl.expiresAt && this.accessControl.expiresAt < new Date();
  }

  /**
   * Get secure URL for media access
   */
  getSecureUrl(expiresIn: number = 3600): string {
    // TODO: Implement secure URL generation with expiration
    const timestamp = Date.now() + (expiresIn * 1000);
    const token = Buffer.from(`${this.id}:${timestamp}`).toString('base64');
    return `${this.storageInfo.url}?token=${token}`;
  }

  /**
   * Get media display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      format: this.format,
      originalFilename: this.originalFilename,
      fileSize: this.fileSize,
      mimeType: this.mimeType,
      status: this.status,
      processingProgress: this.processingProgress,
      metadata: this.metadata,
      viewCount: this.viewCount,
      downloadCount: this.downloadCount,
      totalWatchTime: this.totalWatchTime,
      lastAccessedAt: this.lastAccessedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      processedAt: this.processedAt,
    };
  }

  /**
   * Get media with access information
   */
  getAccessInfo(userId?: string) {
    return {
      ...this.getDisplayInfo(),
      isAccessible: this.isAccessibleBy(userId),
      isExpired: this.isExpired(),
      secureUrl: this.isAccessibleBy(userId) ? this.getSecureUrl() : null,
      thumbnailUrl: this.storageInfo.thumbnailUrl,
    };
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.viewCount++;
    this.lastAccessedAt = new Date();
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(): void {
    this.downloadCount++;
    this.lastAccessedAt = new Date();
  }

  /**
   * Update processing status
   */
  updateProcessingStatus(status: 'processing' | 'completed' | 'failed', progress: number = 0): void {
    this.status = status;
    this.processingProgress = progress;
    
    if (status === 'completed') {
      this.processedAt = new Date();
    }
  }

  /**
   * Check if media is ready for streaming
   */
  isReadyForStreaming(): boolean {
    return this.status === 'completed' && this.type === 'video';
  }
}