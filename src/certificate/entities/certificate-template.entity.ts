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

/**
 * CertificateTemplate entity for the Uvarsity platform
 * 
 * This entity represents certificate templates for PDF generation:
 * 
 * 🎨 Template Features:
 * - Custom certificate designs
 * - Dynamic content placeholders
 * - Multiple format support
 * - Brand customization
 * 
 * 📐 Template Management:
 * - Template versioning
 * - Preview generation
 * - Template categories
 * - Usage statistics
 */
@Entity('certificate_templates')
@Index(['name'])
@Index(['category'])
@Index(['isActive'])
export class CertificateTemplate {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Template name
   */
  @Column({ length: 100 })
  name: string;

  /**
   * Template description
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Template category
   */
  @Column({ length: 50, default: 'course' })
  category: 'course' | 'achievement' | 'participation' | 'custom';

  /**
   * Template configuration
   */
  @Column({
    type: 'text',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  config: {
    // Page settings
    pageSize: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    
    // Background
    backgroundColor?: string;
    backgroundImage?: string;
    watermark?: string;
    
    // Typography
    fonts: {
      title: {
        family: string;
        size: number;
        color: string;
        weight: 'normal' | 'bold';
      };
      body: {
        family: string;
        size: number;
        color: string;
        weight: 'normal' | 'bold';
      };
      signature: {
        family: string;
        size: number;
        color: string;
        weight: 'normal' | 'bold';
      };
    };
    
    // Layout elements
    logo?: {
      url: string;
      width: number;
      height: number;
      position: { x: number; y: number };
    };
    
    border?: {
      style: 'solid' | 'dashed' | 'dotted';
      width: number;
      color: string;
    };
    
    // Content placeholders
    placeholders: {
      [key: string]: {
        position: { x: number; y: number };
        width?: number;
        height?: number;
        alignment: 'left' | 'center' | 'right';
        fontSize?: number;
        fontColor?: string;
      };
    };
  };

  /**
   * Template content (HTML or template markup)
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Template style (CSS)
   */
  @Column({ type: 'text', nullable: true })
  styles?: string;

  /**
   * Template preview image
   */
  @Column({ type: 'text', nullable: true })
  previewImage?: string;

  /**
   * Template creator
   */
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator?: User;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  /**
   * Template status
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean;

  /**
   * Template version
   */
  @Column({ type: 'varchar', length: 10, default: '1.0' })
  version: string;

  @Column({ type: 'uuid', nullable: true })
  parentTemplateId?: string;

  /**
   * Template statistics
   */
  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt?: Date;

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
   * Get template display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      isActive: this.isActive,
      isDefault: this.isDefault,
      isSystem: this.isSystem,
      version: this.version,
      usageCount: this.usageCount,
      lastUsedAt: this.lastUsedAt,
      previewImage: this.previewImage,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get template configuration
   */
  getConfiguration() {
    return {
      ...this.getDisplayInfo(),
      config: this.config,
      content: this.content,
      styles: this.styles,
    };
  }

  /**
   * Increment usage count
   */
  incrementUsage(): void {
    this.usageCount++;
    this.lastUsedAt = new Date();
  }

  /**
   * Check if template can be used
   */
  canBeUsed(): boolean {
    return this.isActive;
  }

  /**
   * Create new version
   */
  createVersion(newVersion: string): Partial<CertificateTemplate> {
    return {
      name: this.name,
      description: this.description,
      category: this.category,
      config: this.config,
      content: this.content,
      styles: this.styles,
      version: newVersion,
      parentTemplateId: this.id,
      createdBy: this.createdBy,
      isActive: true,
      isDefault: false,
      isSystem: false,
    };
  }
}