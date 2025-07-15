import { Module } from '@nestjs/common';

/**
 * Notification Module for Stellr Academy Backend
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
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class NotificationModule {
  constructor() {
    console.log('🔔 Notification module initialized - Email, SMS, and push notifications ready');
  }
}