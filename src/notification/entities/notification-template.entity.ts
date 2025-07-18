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
 * NotificationTemplate entity for the Uvarsity platform
 * 
 * This entity represents notification templates:
 * 
 * 📧 Template Types:
 * - Email templates
 * - SMS templates
 * - Push notification templates
 * - In-app notification templates
 * 
 * 🎨 Template Features:
 * - Dynamic content placeholders
 * - Multi-language support
 * - Template versioning
 * - A/B testing support
 * 
 * 📊 Template Management:
 * - Template usage tracking
 * - Performance analytics
 * - Template optimization
 * - Template categories
 */
@Entity('notification_templates')
@Index(['name'])
@Index(['type'])
@Index(['category'])
@Index(['isActive'])
export class NotificationTemplate {
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
   * Template type
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  type: 'email' | 'sms' | 'push' | 'in_app';

  /**
   * Template category
   */
  @Column({ length: 50 })
  category: string;

  /**
   * Template subject (for email)
   */
  @Column({ length: 200, nullable: true })
  subject?: string;

  /**
   * Template content
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * Template HTML content (for email)
   */
  @Column({ type: 'text', nullable: true })
  htmlContent?: string;

  /**
   * Template variables
   */
  @Column({
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  variables: string[];

  /**
   * Template configuration
   */
  @Column({
    type: 'text',
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  config: {
    // Email specific
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    
    // SMS specific
    maxLength?: number;
    
    // Push specific
    icon?: string;
    badge?: string;
    sound?: string;
    clickAction?: string;
    
    // Common
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    ttl?: number; // time to live in seconds
    tags?: string[];
    
    // A/B testing
    abTestId?: string;
    abTestWeight?: number;
    
    // Localization
    languages?: string[];
    defaultLanguage?: string;
  };

  /**
   * Template styles (for HTML content)
   */
  @Column({ type: 'text', nullable: true })
  styles?: string;

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

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failureCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastUsedAt?: Date;

  /**
   * Template performance metrics
   */
  @Column({
    type: 'text',
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  metrics: {
    deliveryRate?: number;
    openRate?: number;
    clickRate?: number;
    unsubscribeRate?: number;
    avgDeliveryTime?: number;
    lastCalculated?: Date;
  };

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
   * Render template with variables
   */
  render(variables: { [key: string]: any }): { subject?: string; content: string; htmlContent?: string } {
    const result: { subject?: string; content: string; htmlContent?: string } = {
      content: this.content,
    };

    // Replace variables in content
    result.content = this.replaceVariables(this.content, variables);

    // Replace variables in subject (if exists)
    if (this.subject) {
      result.subject = this.replaceVariables(this.subject, variables);
    }

    // Replace variables in HTML content (if exists)
    if (this.htmlContent) {
      result.htmlContent = this.replaceVariables(this.htmlContent, variables);
    }

    return result;
  }

  /**
   * Replace variables in text
   */
  private replaceVariables(text: string, variables: { [key: string]: any }): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * Get template display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      category: this.category,
      subject: this.subject,
      variables: this.variables,
      config: this.config,
      isActive: this.isActive,
      isDefault: this.isDefault,
      isSystem: this.isSystem,
      version: this.version,
      usageCount: this.usageCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastUsedAt: this.lastUsedAt,
      metrics: this.metrics,
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
      content: this.content,
      htmlContent: this.htmlContent,
      styles: this.styles,
    };
  }

  /**
   * Increment usage count
   */
  incrementUsage(success: boolean = true): void {
    this.usageCount++;
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }
    this.lastUsedAt = new Date();
  }

  /**
   * Calculate success rate
   */
  getSuccessRate(): number {
    if (this.usageCount === 0) return 0;
    return (this.successCount / this.usageCount) * 100;
  }

  /**
   * Check if template can be used
   */
  canBeUsed(): boolean {
    return this.isActive;
  }

  /**
   * Validate template variables
   */
  validateVariables(variables: { [key: string]: any }): { valid: boolean; missingVariables: string[] } {
    const missingVariables = this.variables.filter(variable => 
      variables[variable] === undefined || variables[variable] === null
    );

    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  }
}