import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

/**
 * Refresh Token entity for secure token management
 * 
 * This entity handles JWT refresh token storage and management:
 * 
 * 🔐 Security Features:
 * - Secure token storage with hashing
 * - Automatic expiration handling
 * - Token revocation and blacklisting
 * - Device/session tracking
 * - Rotation on each use for enhanced security
 * 
 * 📱 Multi-Device Support:
 * - Tracks user agent and device information
 * - Supports multiple active sessions per user
 * - Individual token revocation per device
 * - Session management and monitoring
 * 
 * 🛡️ Security Benefits:
 * - Longer-lived than access tokens but still expire
 * - Can be revoked immediately if compromised
 * - Helps detect token theft and suspicious activity
 * - Enables "logout from all devices" functionality
 */
@Entity('refresh_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId', 'isRevoked'])
export class RefreshToken {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Hashed refresh token value
   * Actual token is hashed before storage for security
   */
  @Column({ unique: true, length: 255 })
  tokenHash: string;

  /**
   * User who owns this refresh token
   * Links to the User entity for token ownership
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * User ID for efficient querying
   * Stored separately for database performance
   */
  @Column('uuid')
  userId: string;

  /**
   * Token expiration timestamp
   * Refresh tokens have longer expiration than access tokens
   */
  @Column()
  expiresAt: Date;

  /**
   * Token revocation status
   * Revoked tokens cannot be used for new access tokens
   */
  @Column({ default: false })
  isRevoked: boolean;

  /**
   * Revocation timestamp
   * When the token was revoked (for audit purposes)
   */
  @Column({ nullable: true })
  revokedAt?: Date;

  /**
   * Reason for token revocation
   * Helps with security auditing and user notifications
   */
  @Column({ nullable: true, length: 100 })
  revocationReason?: string;

  /**
   * User agent string from token creation
   * Helps identify the device/browser that created the token
   */
  @Column({ nullable: true, length: 500 })
  userAgent?: string;

  /**
   * IP address from token creation
   * Tracks where the token was issued for security monitoring
   */
  @Column({ nullable: true, length: 45 })
  ipAddress?: string;

  /**
   * Device identifier or name
   * User-friendly device identification (e.g., "iPhone 12", "Chrome on Windows")
   */
  @Column({ nullable: true, length: 100 })
  deviceName?: string;

  /**
   * Last time this token was used
   * Updated when token is used to generate new access token
   */
  @Column({ nullable: true })
  lastUsedAt?: Date;

  /**
   * Token creation timestamp
   * Automatically set when token is created
   */
  @CreateDateColumn()
  createdAt: Date;

  // === UTILITY METHODS ===

  /**
   * Check if the refresh token is still valid
   * Validates expiration and revocation status
   * 
   * @returns true if token can be used for refresh
   */
  isValid(): boolean {
    return !this.isRevoked && this.expiresAt > new Date();
  }

  /**
   * Check if the token has expired
   * 
   * @returns true if token is past expiration date
   */
  isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  /**
   * Revoke the refresh token
   * Marks token as revoked with timestamp and reason
   * 
   * @param reason - Reason for revocation (logout, security, etc.)
   */
  revoke(reason?: string): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    if (reason) {
      this.revocationReason = reason;
    }
  }

  /**
   * Update last used timestamp
   * Called when token is used for access token refresh
   */
  updateLastUsed(): void {
    this.lastUsedAt = new Date();
  }

  /**
   * Check if token is from the same device
   * Compares user agent for device identification
   * 
   * @param userAgent - User agent to compare
   * @returns true if likely from the same device
   */
  isSameDevice(userAgent: string): boolean {
    return this.userAgent === userAgent;
  }

  /**
   * Get a user-friendly token description
   * Useful for user's session management UI
   * 
   * @returns descriptive string about the token/session
   */
  getDescription(): string {
    const deviceInfo = this.deviceName || 'Unknown Device';
    const lastUsed = this.lastUsedAt || this.createdAt;
    const timeAgo = this.getTimeAgo(lastUsed);
    
    return `${deviceInfo} (last used ${timeAgo})`;
  }

  /**
   * Get time ago string for display
   * Converts date to user-friendly relative time
   * 
   * @param date - Date to convert
   * @returns relative time string (e.g., "2 hours ago")
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }
}