import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';

/**
 * User entity for the Uvarsity platform
 * 
 * This entity represents a learner in the system and stores:
 * 
 * 👤 Core Identity:
 * - Unique user ID and email address
 * - Full name and display preferences
 * - Phone number for SMS notifications
 * - Profile avatar/photo URL
 * 
 * 🔒 Authentication:
 * - Secure password hash (never stored in plain text)
 * - Email and phone verification status
 * - Account status (active, suspended, deleted)
 * - OAuth provider information
 * 
 * 📚 Learning Preferences:
 * - Preferred language for content
 * - Notification preferences (email, SMS, push)
 * - Learning goals and interests
 * - Timezone for scheduling
 * 
 * 📊 Onboarding & Progress:
 * - First login and tutorial completion status
 * - Account creation and last activity timestamps
 * - Soft delete capability for GDPR compliance
 * 
 * 🔗 Relationships:
 * - Links to user progress, quiz results, certificates
 * - Enrollment in courses and learning paths
 * - Notification and communication history
 */
@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class User {
  /**
   * Primary key - Auto-generated UUID for user identification
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === CORE IDENTITY INFORMATION ===

  /**
   * User's email address - primary identifier for login
   * Must be unique across the platform
   */
  @Column({ unique: true, length: 255 })
  email: string;

  /**
   * User's full name for display and certificates
   */
  @Column({ length: 100 })
  fullName: string;

  /**
   * Phone number for SMS notifications and alternative login
   * Optional field, but must be unique if provided
   */
  @Column({ nullable: true, length: 20 })
  phone?: string;

  /**
   * Profile avatar/photo URL
   * Can be from file upload or OAuth provider
   */
  @Column({ nullable: true, length: 500 })
  avatarUrl?: string;

  // === AUTHENTICATION INFORMATION ===

  /**
   * Hashed password for email/password authentication
   * Excluded from JSON serialization for security
   */
  @Column({ nullable: true })
  @Exclude()
  passwordHash?: string;

  /**
   * Email verification status
   * Users must verify email before full platform access
   */
  @Column({ default: false })
  isEmailVerified: boolean;

  /**
   * Phone verification status
   * Required for SMS notifications and phone-based login
   */
  @Column({ default: false })
  isPhoneVerified: boolean;

  /**
   * Account status for access control
   * - active: Normal account with full access
   * - suspended: Temporarily restricted access
   * - deleted: Soft-deleted account (GDPR compliance)
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'suspended' | 'deleted';

  /**
   * User role for access control
   * - user: Regular learner with course access
   * - admin: Administrator with full platform access
   * - instructor: Course creator and instructor
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'user',
  })
  @Index()
  role: 'user' | 'admin' | 'instructor';

  // === OAUTH INTEGRATION ===

  /**
   * OAuth provider information
   * Tracks which external service was used for registration
   */
  @Column({ nullable: true, length: 50 })
  oauthProvider?: string;

  /**
   * External OAuth provider user ID
   * Links to Google, Facebook, Apple account
   */
  @Column({ nullable: true, length: 255 })
  oauthProviderId?: string;

  // === LEARNING PREFERENCES ===

  /**
   * Preferred language for platform content
   * ISO 639-1 language codes (en, es, fr, etc.)
   */
  @Column({ default: 'en', length: 5 })
  preferredLanguage: string;

  /**
   * Timezone for scheduling and notifications
   * IANA timezone identifier (America/New_York, Europe/London, etc.)
   */
  @Column({ default: 'UTC', length: 50 })
  timezone: string;

  /**
   * Notification preferences stored as JSON
   * Controls email, SMS, and push notification settings
   */
  @Column({
    type: 'text',
    default: '{"email":{"courseUpdates":true,"reminderNotifications":true,"achievementAlerts":true,"weeklyProgress":true},"sms":{"reminderNotifications":false,"urgentUpdates":false},"push":{"lessonReminders":true,"quizAvailable":true,"achievementUnlocked":true}}',
    transformer: {
      to: (value: any) => JSON.stringify(value),
      from: (value: string) => JSON.parse(value),
    },
  })
  notificationPreferences: {
    email: {
      courseUpdates: boolean;
      reminderNotifications: boolean;
      achievementAlerts: boolean;
      weeklyProgress: boolean;
    };
    sms: {
      reminderNotifications: boolean;
      urgentUpdates: boolean;
    };
    push: {
      lessonReminders: boolean;
      quizAvailable: boolean;
      achievementUnlocked: boolean;
    };
  };

  // === ONBOARDING AND PROGRESS ===

  /**
   * Tracks if user has completed the platform onboarding tutorial
   */
  @Column({ default: false })
  hasCompletedOnboarding: boolean;

  /**
   * Tracks if this is the user's first login
   * Used to trigger welcome flows and initial setup
   */
  @Column({ default: true })
  isFirstLogin: boolean;

  /**
   * User's last activity timestamp
   * Updated on each authenticated request
   */
  @Column({ nullable: true })
  lastActiveAt?: Date;

  /**
   * User's last login timestamp
   * Updated on successful authentication
   */
  @Column({ nullable: true })
  lastLoginAt?: Date;

  // === METADATA AND TIMESTAMPS ===

  /**
   * Record creation timestamp
   * Automatically set when user registers
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Record last update timestamp
   * Automatically updated when user data changes
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Soft delete timestamp
   * Set when user account is deleted (GDPR compliance)
   */
  @Column({ nullable: true })
  deletedAt?: Date;

  // === UTILITY METHODS ===

  /**
   * Check if the user account is active and accessible
   * @returns true if user can access the platform
   */
  isActive(): boolean {
    return this.status === 'active' && !this.deletedAt;
  }

  /**
   * Check if the user is an administrator
   * @returns true if user has admin role
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Check if the user is an instructor
   * @returns true if user has instructor role
   */
  isInstructor(): boolean {
    return this.role === 'instructor';
  }

  /**
   * Check if the user has admin or instructor privileges
   * @returns true if user can manage content
   */
  canManageContent(): boolean {
    return this.isAdmin() || this.isInstructor();
  }

  /**
   * Check if the user can receive email notifications
   * @returns true if email is verified and notifications enabled
   */
  canReceiveEmailNotifications(): boolean {
    return this.isEmailVerified && this.notificationPreferences.email.courseUpdates;
  }

  /**
   * Check if the user can receive SMS notifications
   * @returns true if phone is verified and SMS notifications enabled
   */
  canReceiveSMSNotifications(): boolean {
    return this.isPhoneVerified && this.notificationPreferences.sms.reminderNotifications;
  }

  /**
   * Get user's display name for UI
   * @returns full name or email if name not available
   */
  getDisplayName(): string {
    return this.fullName || this.email;
  }

  /**
   * Mark user as having completed onboarding
   * Updates onboarding status and first login flag
   */
  completeOnboarding(): void {
    this.hasCompletedOnboarding = true;
    this.isFirstLogin = false;
  }

  /**
   * Update last activity timestamp
   * Should be called on each authenticated request
   */
  updateLastActivity(): void {
    this.lastActiveAt = new Date();
  }

  /**
   * Update last login timestamp
   * Should be called on successful authentication
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
    this.updateLastActivity();
  }
}