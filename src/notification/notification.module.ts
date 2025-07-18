import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { User } from '../user/entities/user.entity';

import { NotificationService } from './services/notification.service';

import { CommonModule } from '../common/common.module';

/**
 * Notification Module for Uvarsity Backend
 * 
 * This module handles all notification and communication services:
 * 
 * 📧 Email Notifications:
 * - Welcome and onboarding emails
 * - Course progress updates
 * - Reminder notifications
 * - Achievement and certificate notifications
 * 
 * 📱 SMS Notifications:
 * - OTP verification messages
 * - Urgent reminders
 * - Security alerts
 * - Course deadline notifications
 * 
 * 🔔 Push Notifications:
 * - In-app notifications
 * - Browser push notifications
 * - Mobile app notifications
 * - Real-time updates
 * 
 * ⚙️ Notification Management:
 * - User preference handling
 * - Notification scheduling
 * - Template management
 * - Delivery tracking and analytics
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      User,
    ]),
  ],
  controllers: [
    // Controllers would be added here if needed
  ],
  providers: [
    NotificationService,
  ],
  exports: [
    NotificationService,
  ],
})
export class NotificationModule {
  constructor() {
    console.log('🔔 Notification module initialized - Email, SMS, and push notifications ready');
  }
}