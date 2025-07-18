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
 * Notification entity for the Stellr Academy platform
 * 
 * This entity represents notifications sent to users:
 * 
 * 📧 Notification Types:
 * - Email notifications
 * - SMS notifications
 * - Push notifications
 * - In-app notifications
 * 
 * 🔔 Notification Management:
 * - Delivery tracking
 * - Read status tracking
 * - Notification preferences
 * - Retry mechanisms
 * 
 * 📊 Analytics:
 * - Delivery rates
 * - Open rates
 * - Click rates
 * - Engagement metrics
 */
@Entity('notifications')
@Index(['userId'])
@Index(['type'])
@Index(['status'])
@Index(['createdAt'])
export class Notification {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User receiving the notification
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  /**
   * Notification type
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  type: 'email' | 'sms' | 'push' | 'in_app';

  /**
   * Notification category
   */
  @Column({ length: 50 })
  category: string;

  /**
   * Notification title
   */
  @Column({ length: 200 })
  title: string;

  /**
   * Notification message
   */
  @Column({ type: 'text' })
  message: string;

  /**
   * Rich content for notifications
   */
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => value ? JSON.parse(value) : null,
    },
  })
  content?: {
    html?: string;
    attachments?: {
      filename: string;
      url: string;
      type: string;
    }[];
    buttons?: {
      label: string;
      url: string;
      style: 'primary' | 'secondary';
    }[];
    images?: {
      url: string;
      alt: string;
      width?: number;
      height?: number;
    }[];
  };

  /**
   * Notification metadata
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
    templateId?: string;
    variables?: { [key: string]: any };
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    campaign?: string;
    source?: string;
    trackingPixel?: string;
    unsubscribeUrl?: string;
  };

  /**
   * Delivery information
   */
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => value ? JSON.parse(value) : null,
    },
  })
  deliveryInfo?: {
    recipient: string; // email, phone, device token
    provider?: string; // sendgrid, twilio, firebase
    providerId?: string; // external provider message ID
    attempts?: number;
    lastAttempt?: Date;
    errorMessage?: string;
  };

  /**
   * Notification status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

  /**
   * Read status (for in-app notifications)
   */
  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt?: Date;

  /**
   * Interaction tracking
   */
  @Column({ type: 'boolean', default: false })
  isClicked: boolean;

  @Column({ type: 'datetime', nullable: true })
  clickedAt?: Date;

  @Column({ type: 'text', nullable: true })
  clickedUrl?: string;

  /**
   * Scheduling
   */
  @Column({ type: 'datetime', nullable: true })
  scheduledFor?: Date;

  @Column({ type: 'datetime', nullable: true })
  sentAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  failedAt?: Date;

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
   * Mark notification as read
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  /**
   * Mark notification as clicked
   */
  markAsClicked(url?: string): void {
    this.isClicked = true;
    this.clickedAt = new Date();
    if (url) {
      this.clickedUrl = url;
    }
  }

  /**
   * Update delivery status
   */
  updateDeliveryStatus(status: 'sent' | 'delivered' | 'failed' | 'bounced', errorMessage?: string): void {
    this.status = status;
    const now = new Date();

    switch (status) {
      case 'sent':
        this.sentAt = now;
        break;
      case 'delivered':
        this.deliveredAt = now;
        break;
      case 'failed':
      case 'bounced':
        this.failedAt = now;
        if (errorMessage && this.deliveryInfo) {
          this.deliveryInfo.errorMessage = errorMessage;
        }
        break;
    }
  }

  /**
   * Check if notification is scheduled
   */
  isScheduled(): boolean {
    return this.scheduledFor !== null && this.scheduledFor > new Date();
  }

  /**
   * Check if notification is ready to send
   */
  isReadyToSend(): boolean {
    return this.status === 'pending' && 
           (!this.scheduledFor || this.scheduledFor <= new Date());
  }

  /**
   * Get notification display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      userId: this.userId,
      type: this.type,
      category: this.category,
      title: this.title,
      message: this.message,
      status: this.status,
      isRead: this.isRead,
      readAt: this.readAt,
      isClicked: this.isClicked,
      clickedAt: this.clickedAt,
      scheduledFor: this.scheduledFor,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      failedAt: this.failedAt,
      createdAt: this.createdAt,
      metadata: this.metadata,
    };
  }
}