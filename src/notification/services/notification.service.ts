import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerService } from '../../common/services/logger.service';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { User } from '../../user/entities/user.entity';

/**
 * Notification Service for Stellr Academy Backend
 * 
 * This service handles all notification-related business logic:
 * - Email notifications
 * - SMS notifications
 * - Push notifications
 * - In-app notifications
 * - Template management
 * - Notification scheduling
 * - Delivery tracking
 */
@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Send email notification
   */
  async sendEmail(
    userId: string,
    subject: string,
    message: string,
    options?: {
      htmlContent?: string;
      templateId?: string;
      variables?: { [key: string]: any };
      scheduledFor?: Date;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      category?: string;
    },
  ): Promise<Notification> {
    this.logger.log(`Sending email notification to user: ${userId}`, 'NotificationService');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let finalContent = message;
    let finalSubject = subject;
    let finalHtmlContent = options?.htmlContent;

    // Use template if provided
    if (options?.templateId) {
      const template = await this.getTemplateById(options.templateId);
      if (template.type !== 'email') {
        throw new BadRequestException('Template is not for email notifications');
      }

      const rendered = template.render(options.variables || {});
      finalSubject = rendered.subject || subject;
      finalContent = rendered.content;
      finalHtmlContent = rendered.htmlContent;
    }

    const notification = this.notificationRepository.create({
      userId,
      type: 'email',
      category: options?.category || 'general',
      title: finalSubject,
      message: finalContent,
      content: finalHtmlContent ? {
        html: finalHtmlContent,
      } : undefined,
      metadata: {
        priority: options?.priority || 'normal',
        templateId: options?.templateId,
        variables: options?.variables,
      },
      deliveryInfo: {
        recipient: user.email,
      },
      scheduledFor: options?.scheduledFor,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // If not scheduled, send immediately
    if (!options?.scheduledFor) {
      await this.processEmailNotification(savedNotification);
    }

    this.logger.log(`Email notification created: ${savedNotification.id}`, 'NotificationService');
    return savedNotification;
  }

  /**
   * Send SMS notification
   */
  async sendSMS(
    userId: string,
    message: string,
    options?: {
      templateId?: string;
      variables?: { [key: string]: any };
      scheduledFor?: Date;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      category?: string;
    },
  ): Promise<Notification> {
    this.logger.log(`Sending SMS notification to user: ${userId}`, 'NotificationService');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.phone) {
      throw new BadRequestException('User has no phone number');
    }

    let finalContent = message;

    // Use template if provided
    if (options?.templateId) {
      const template = await this.getTemplateById(options.templateId);
      if (template.type !== 'sms') {
        throw new BadRequestException('Template is not for SMS notifications');
      }

      const rendered = template.render(options.variables || {});
      finalContent = rendered.content;
    }

    const notification = this.notificationRepository.create({
      userId,
      type: 'sms',
      category: options?.category || 'general',
      title: 'SMS Notification',
      message: finalContent,
      metadata: {
        priority: options?.priority || 'normal',
        templateId: options?.templateId,
        variables: options?.variables,
      },
      deliveryInfo: {
        recipient: user.phone,
      },
      scheduledFor: options?.scheduledFor,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // If not scheduled, send immediately
    if (!options?.scheduledFor) {
      await this.processSMSNotification(savedNotification);
    }

    this.logger.log(`SMS notification created: ${savedNotification.id}`, 'NotificationService');
    return savedNotification;
  }

  /**
   * Send push notification
   */
  async sendPush(
    userId: string,
    title: string,
    message: string,
    options?: {
      templateId?: string;
      variables?: { [key: string]: any };
      scheduledFor?: Date;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      category?: string;
      clickAction?: string;
      icon?: string;
    },
  ): Promise<Notification> {
    this.logger.log(`Sending push notification to user: ${userId}`, 'NotificationService');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let finalTitle = title;
    let finalContent = message;

    // Use template if provided
    if (options?.templateId) {
      const template = await this.getTemplateById(options.templateId);
      if (template.type !== 'push') {
        throw new BadRequestException('Template is not for push notifications');
      }

      const rendered = template.render(options.variables || {});
      finalTitle = rendered.subject || title;
      finalContent = rendered.content;
    }

    const notification = this.notificationRepository.create({
      userId,
      type: 'push',
      category: options?.category || 'general',
      title: finalTitle,
      message: finalContent,
      metadata: {
        priority: options?.priority || 'normal',
        templateId: options?.templateId,
        variables: options?.variables,
      },
      deliveryInfo: {
        recipient: 'push_token', // Would be actual device token
      },
      scheduledFor: options?.scheduledFor,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // If not scheduled, send immediately
    if (!options?.scheduledFor) {
      await this.processPushNotification(savedNotification);
    }

    this.logger.log(`Push notification created: ${savedNotification.id}`, 'NotificationService');
    return savedNotification;
  }

  /**
   * Send in-app notification
   */
  async sendInApp(
    userId: string,
    title: string,
    message: string,
    options?: {
      templateId?: string;
      variables?: { [key: string]: any };
      category?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ): Promise<Notification> {
    this.logger.log(`Sending in-app notification to user: ${userId}`, 'NotificationService');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let finalTitle = title;
    let finalContent = message;

    // Use template if provided
    if (options?.templateId) {
      const template = await this.getTemplateById(options.templateId);
      if (template.type !== 'in_app') {
        throw new BadRequestException('Template is not for in-app notifications');
      }

      const rendered = template.render(options.variables || {});
      finalTitle = rendered.subject || title;
      finalContent = rendered.content;
    }

    const notification = this.notificationRepository.create({
      userId,
      type: 'in_app',
      category: options?.category || 'general',
      title: finalTitle,
      message: finalContent,
      metadata: {
        priority: options?.priority || 'normal',
        templateId: options?.templateId,
        variables: options?.variables,
      },
      status: 'delivered', // In-app notifications are immediately delivered
      deliveredAt: new Date(),
    });

    const savedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`In-app notification created: ${savedNotification.id}`, 'NotificationService');
    return savedNotification;
  }

  /**
   * Get notifications for user
   */
  async getUserNotifications(
    userId: string,
    options?: {
      type?: 'email' | 'sms' | 'push' | 'in_app';
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<Notification[]> {
    const query = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.createdAt', 'DESC');

    if (options?.type) {
      query.andWhere('notification.type = :type', { type: options.type });
    }

    if (options?.unreadOnly) {
      query.andWhere('notification.isRead = false');
    }

    if (options?.limit) {
      query.take(options.limit);
    }

    if (options?.offset) {
      query.skip(options.offset);
    }

    return query.getMany();
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.markAsRead();
    const updatedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`Notification marked as read: ${notificationId}`, 'NotificationService');
    return updatedNotification;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.logger.log(`All notifications marked as read for user: ${userId}`, 'NotificationService');
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Create notification template
   */
  async createTemplate(templateData: any, createdBy: string): Promise<NotificationTemplate> {
    const template = this.templateRepository.create({
      ...templateData,
      createdBy,
    });

    const savedTemplate = await this.templateRepository.save(template) as unknown as NotificationTemplate;
    this.logger.log(`Notification template created: ${savedTemplate.id}`, 'NotificationService');

    return savedTemplate;
  }

  /**
   * Get all templates
   */
  async getTemplates(type?: string): Promise<NotificationTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.isActive = true')
      .orderBy('template.name', 'ASC');

    if (type) {
      query.andWhere('template.type = :type', { type });
    }

    return query.getMany();
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Notification template not found');
    }

    return template;
  }

  /**
   * Process email notification (placeholder)
   */
  private async processEmailNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    this.logger.log(`Processing email notification: ${notification.id}`, 'NotificationService');
    
    // Simulate email sending
    try {
      notification.updateDeliveryStatus('sent');
      await this.notificationRepository.save(notification);
      
      // Simulate delivery
      setTimeout(async () => {
        notification.updateDeliveryStatus('delivered');
        await this.notificationRepository.save(notification);
      }, 1000);
    } catch (error) {
      notification.updateDeliveryStatus('failed', error.message);
      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Process SMS notification (placeholder)
   */
  private async processSMSNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    this.logger.log(`Processing SMS notification: ${notification.id}`, 'NotificationService');
    
    // Simulate SMS sending
    try {
      notification.updateDeliveryStatus('sent');
      await this.notificationRepository.save(notification);
      
      // Simulate delivery
      setTimeout(async () => {
        notification.updateDeliveryStatus('delivered');
        await this.notificationRepository.save(notification);
      }, 1000);
    } catch (error) {
      notification.updateDeliveryStatus('failed', error.message);
      await this.notificationRepository.save(notification);
    }
  }

  /**
   * Process push notification (placeholder)
   */
  private async processPushNotification(notification: Notification): Promise<void> {
    // TODO: Integrate with push service (Firebase, Apple Push, etc.)
    this.logger.log(`Processing push notification: ${notification.id}`, 'NotificationService');
    
    // Simulate push sending
    try {
      notification.updateDeliveryStatus('sent');
      await this.notificationRepository.save(notification);
      
      // Simulate delivery
      setTimeout(async () => {
        notification.updateDeliveryStatus('delivered');
        await this.notificationRepository.save(notification);
      }, 1000);
    } catch (error) {
      notification.updateDeliveryStatus('failed', error.message);
      await this.notificationRepository.save(notification);
    }
  }
}