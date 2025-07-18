import { VersioningType } from '@nestjs/common';

/**
 * API Versioning Configuration
 * 
 * Defines versioning strategy and settings for the Uvarsity Backend
 */
export const API_VERSIONING_CONFIG = {
  // Use URI versioning (e.g., /api/v1/users)
  type: VersioningType.URI,
  
  // Default version when no version is specified
  defaultVersion: '1',
  
  // Supported versions
  supportedVersions: ['1', '2'],
};

/**
 * Version-specific route decorators
 */
export const V1_ROUTES = { version: '1' };
export const V2_ROUTES = { version: '2' };
export const ALL_VERSIONS = { version: ['1', '2'] };

/**
 * API version constants
 */
export const API_VERSIONS = {
  V1: '1',
  V2: '2',
  LATEST: '1', // Current stable version
} as const;

/**
 * Versioning utilities
 */
export class VersioningUtils {
  /**
   * Check if a version is supported
   */
  static isVersionSupported(version: string): boolean {
    return API_VERSIONING_CONFIG.supportedVersions.includes(version);
  }

  /**
   * Get the latest version
   */
  static getLatestVersion(): string {
    return API_VERSIONS.LATEST;
  }

  /**
   * Get all supported versions
   */
  static getSupportedVersions(): string[] {
    return API_VERSIONING_CONFIG.supportedVersions;
  }

  /**
   * Format version for URL
   */
  static formatVersionForUrl(version: string): string {
    return `v${version}`;
  }
}