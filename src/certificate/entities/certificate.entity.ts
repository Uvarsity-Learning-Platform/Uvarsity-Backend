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
import { Course } from '../../course/entities/course.entity';

/**
 * Certificate entity for the Uvarsity platform
 * 
 * This entity represents certificates awarded to users:
 * 
 * 🏆 Certificate Features:
 * - PDF certificate generation
 * - Digital verification system
 * - Blockchain-based validation
 * - Custom certificate templates
 * 
 * 📜 Certificate Management:
 * - Certificate storage and retrieval
 * - Download and sharing capabilities
 * - Verification system
 * - Certificate history tracking
 * 
 * ✅ Eligibility & Validation:
 * - Course completion verification
 * - Quiz score requirements
 * - Progress milestone validation
 * - Automated certificate issuance
 */
@Entity('certificates')
@Index(['userId'])
@Index(['courseId'])
@Index(['verificationCode'])
@Index(['issuedAt'])
export class Certificate {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User who earned this certificate
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  /**
   * Course this certificate is for
   */
  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column('uuid')
  courseId: string;

  /**
   * Certificate title
   */
  @Column({ length: 200 })
  title: string;

  /**
   * Certificate description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Unique verification code
   */
  @Column({ unique: true, length: 100 })
  verificationCode: string;

  /**
   * Certificate metadata
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
    completionScore?: number;
    totalLessons?: number;
    completedLessons?: number;
    timeSpent?: number; // in minutes
    completionDate?: Date;
    instructorName?: string;
    courseDuration?: number; // in hours
    skillsAcquired?: string[];
    certificateVersion?: string;
  };

  /**
   * Certificate template used
   */
  @Column({ length: 100, default: 'default' })
  templateId: string;

  /**
   * Certificate file information
   */
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => value ? JSON.parse(value) : null,
    },
  })
  fileInfo?: {
    filename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    downloadUrl?: string;
    thumbnailUrl?: string;
  };

  /**
   * Certificate status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'valid',
  })
  status: 'valid' | 'revoked' | 'expired';

  /**
   * Certificate validity period
   */
  @Column({ type: 'datetime' })
  issuedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'text', nullable: true })
  revocationReason?: string;

  /**
   * Digital signature and blockchain validation
   */
  @Column({ type: 'text', nullable: true })
  digitalSignature?: string;

  @Column({ type: 'text', nullable: true })
  blockchainHash?: string;

  @Column({ type: 'text', nullable: true })
  blockchainTransaction?: string;

  /**
   * Certificate statistics
   */
  @Column({ type: 'integer', default: 0 })
  downloadCount: number;

  @Column({ type: 'integer', default: 0 })
  verificationCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastDownloadedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  lastVerifiedAt?: Date;

  /**
   * Timestamps
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper methods
   */

  /**
   * Check if certificate is valid
   */
  isValid(): boolean {
    const now = new Date();
    return this.status === 'valid' &&
           (!this.expiresAt || this.expiresAt > now);
  }

  /**
   * Check if certificate is expired
   */
  isExpired(): boolean {
    const now = new Date();
    return this.expiresAt && this.expiresAt <= now;
  }

  /**
   * Revoke certificate
   */
  revoke(reason?: string): void {
    this.status = 'revoked';
    this.revokedAt = new Date();
    this.revocationReason = reason;
  }

  /**
   * Generate verification URL
   */
  getVerificationUrl(): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://stellr.academy';
    return `${baseUrl}/verify/${this.verificationCode}`;
  }

  /**
   * Get certificate display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      verificationCode: this.verificationCode,
      status: this.status,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      metadata: this.metadata,
      templateId: this.templateId,
      downloadCount: this.downloadCount,
      verificationCount: this.verificationCount,
      verificationUrl: this.getVerificationUrl(),
      isValid: this.isValid(),
      isExpired: this.isExpired(),
      createdAt: this.createdAt,
    };
  }

  /**
   * Get verification information
   */
  getVerificationInfo() {
    return {
      id: this.id,
      title: this.title,
      verificationCode: this.verificationCode,
      userId: this.userId,
      courseId: this.courseId,
      issuedAt: this.issuedAt,
      expiresAt: this.expiresAt,
      status: this.status,
      metadata: this.metadata,
      digitalSignature: this.digitalSignature,
      blockchainHash: this.blockchainHash,
      isValid: this.isValid(),
      lastVerifiedAt: this.lastVerifiedAt,
    };
  }
}