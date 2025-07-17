import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { LoggerService } from '../../common/services/logger.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../../user/entities/user.entity';

/**
 * Token Service for JWT and Refresh Token Management
 * 
 * This service handles:
 * - JWT access token generation and validation
 * - Refresh token creation and management
 * - Token revocation and blacklisting
 * - Token security and rotation
 */
@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Generate JWT access token for authenticated user
   * 
   * @param userId - User ID to encode in token
   * @param email - User email to encode in token
   * @returns JWT access token
   */
  async generateAccessToken(userId: string, email: string): Promise<string> {
    this.logger.debug(`Generating access token for user: ${userId}`, 'TokenService');
    
    const payload = { 
      sub: userId, 
      email,
      iat: Math.floor(Date.now() / 1000),
    };
    
    return this.jwtService.sign(payload);
  }

  /**
   * Generate refresh token for long-term authentication
   * 
   * @param userId - User ID to link token to
   * @param userAgent - User agent string for device tracking
   * @param ipAddress - IP address for security tracking
   * @returns Refresh token entity
   */
  async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    this.logger.debug(`Generating refresh token for user: ${userId}`, 'TokenService');
    
    // Generate random token
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
    
    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Create refresh token entity
    const refreshToken = this.refreshTokenRepository.create({
      tokenHash,
      userId,
      expiresAt,
      userAgent,
      ipAddress,
      deviceName: this.parseDeviceName(userAgent),
    });
    
    await this.refreshTokenRepository.save(refreshToken);
    
    this.logger.debug(`Refresh token generated for user: ${userId}`, 'TokenService');
    
    // Return the token entity with the plain token value
    const result = refreshToken as any;
    result.tokenHash = tokenValue;
    return result;
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token string
   * @returns New access token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.logger.debug('Processing token refresh request', 'TokenService');
    
    // Hash the provided token to find it in database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find refresh token in database
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    
    if (!storedToken) {
      throw new Error('Invalid refresh token');
    }
    
    // Validate token
    if (!storedToken.isValid()) {
      throw new Error('Refresh token is expired or revoked');
    }
    
    // Update last used timestamp
    storedToken.updateLastUsed();
    await this.refreshTokenRepository.save(storedToken);
    
    // Generate new access token
    const accessToken = await this.generateAccessToken(
      storedToken.userId,
      storedToken.user.email,
    );
    
    this.logger.debug(`Access token refreshed for user: ${storedToken.userId}`, 'TokenService');
    
    return accessToken;
  }

  /**
   * Revoke a specific refresh token
   * 
   * @param refreshToken - Refresh token to revoke
   * @param reason - Reason for revocation
   */
  async revokeRefreshToken(refreshToken: string, reason?: string): Promise<void> {
    this.logger.debug('Revoking refresh token', 'TokenService');
    
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });
    
    if (storedToken) {
      storedToken.revoke(reason);
      await this.refreshTokenRepository.save(storedToken);
      
      this.logger.debug(`Refresh token revoked for user: ${storedToken.userId}`, 'TokenService');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * 
   * @param userId - User ID
   * @param reason - Reason for revocation
   */
  async revokeAllUserTokens(userId: string, reason?: string): Promise<void> {
    this.logger.debug(`Revoking all tokens for user: ${userId}`, 'TokenService');
    
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
    });
    
    for (const token of tokens) {
      token.revoke(reason);
    }
    
    await this.refreshTokenRepository.save(tokens);
    
    this.logger.debug(`All tokens revoked for user: ${userId}`, 'TokenService');
  }

  /**
   * Clean up expired refresh tokens
   * Should be called periodically to maintain database hygiene
   */
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.debug('Cleaning up expired refresh tokens', 'TokenService');
    
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    
    this.logger.debug(`Cleaned up ${result.affected} expired tokens`, 'TokenService');
  }

  /**
   * Get active sessions for a user
   * 
   * @param userId - User ID
   * @returns Active refresh tokens with session info
   */
  async getActiveSessions(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Parse device name from user agent
   * 
   * @param userAgent - User agent string
   * @returns Friendly device name
   */
  private parseDeviceName(userAgent?: string): string {
    if (!userAgent) return 'Unknown Device';
    
    // Basic device parsing - can be enhanced with a proper library
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    
    return 'Unknown Device';
  }
}