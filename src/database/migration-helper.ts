/**
 * Prisma Migration Helper
 * 
 * This utility helps with migrating from TypeORM to Prisma by providing:
 * - Data transformation utilities
 * - JSON parsing helpers
 * - Type conversion functions
 * - Migration validation tools
 */

/**
 * Parse JSON string safely with fallback
 */
export function parseJsonSafely<T>(
  jsonString: string | null | undefined,
  fallback: T,
): T {
  if (!jsonString) {
    return fallback;
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error);
    return fallback;
  }
}

/**
 * Convert TypeORM entity to Prisma-compatible format
 */
export function convertEntityToPrismaFormat(entity: any): any {
  if (!entity) return null;
  
  const converted = { ...entity };
  
  // Convert JSON fields from string to objects for backward compatibility
  if (typeof converted.notificationPreferences === 'string') {
    converted.notificationPreferences = parseJsonSafely(
      converted.notificationPreferences,
      {
        email: {
          courseUpdates: true,
          reminderNotifications: true,
          achievementAlerts: true,
          weeklyProgress: true,
        },
        sms: {
          reminderNotifications: false,
          urgentUpdates: false,
        },
        push: {
          lessonReminders: true,
          quizAvailable: true,
          achievementUnlocked: true,
        },
      },
    );
  }
  
  if (typeof converted.tags === 'string') {
    converted.tags = parseJsonSafely(converted.tags, []);
  }
  
  if (typeof converted.pricing === 'string') {
    converted.pricing = parseJsonSafely(converted.pricing, {
      type: 'free',
      price: 0,
      currency: 'USD',
    });
  }
  
  if (typeof converted.enrollmentSettings === 'string') {
    converted.enrollmentSettings = parseJsonSafely(converted.enrollmentSettings, {
      isOpen: true,
      maxEnrollments: null,
      enrollmentDeadline: null,
    });
  }
  
  if (typeof converted.prerequisites === 'string') {
    converted.prerequisites = parseJsonSafely(converted.prerequisites, []);
  }
  
  if (typeof converted.learningObjectives === 'string') {
    converted.learningObjectives = parseJsonSafely(converted.learningObjectives, []);
  }
  
  if (typeof converted.resources === 'string') {
    converted.resources = parseJsonSafely(converted.resources, []);
  }
  
  if (typeof converted.keyConcepts === 'string') {
    converted.keyConcepts = parseJsonSafely(converted.keyConcepts, []);
  }
  
  if (typeof converted.accessSettings === 'string') {
    converted.accessSettings = parseJsonSafely(converted.accessSettings, {
      isPreview: false,
      requiresEnrollment: true,
      prerequisiteCompleted: false,
    });
  }
  
  if (typeof converted.metadata === 'string') {
    converted.metadata = parseJsonSafely(converted.metadata, {});
  }
  
  return converted;
}

/**
 * Convert Prisma result to TypeORM-compatible format
 */
export function convertPrismaResultToEntityFormat(result: any): any {
  if (!result) return null;
  
  const converted = { ...result };
  
  // Convert JSON objects back to strings for TypeORM compatibility
  if (typeof converted.notificationPreferences === 'object') {
    converted.notificationPreferences = JSON.stringify(converted.notificationPreferences);
  }
  
  if (Array.isArray(converted.tags)) {
    converted.tags = JSON.stringify(converted.tags);
  }
  
  if (typeof converted.pricing === 'object') {
    converted.pricing = JSON.stringify(converted.pricing);
  }
  
  if (typeof converted.enrollmentSettings === 'object') {
    converted.enrollmentSettings = JSON.stringify(converted.enrollmentSettings);
  }
  
  if (Array.isArray(converted.prerequisites)) {
    converted.prerequisites = JSON.stringify(converted.prerequisites);
  }
  
  if (Array.isArray(converted.learningObjectives)) {
    converted.learningObjectives = JSON.stringify(converted.learningObjectives);
  }
  
  if (Array.isArray(converted.resources)) {
    converted.resources = JSON.stringify(converted.resources);
  }
  
  if (Array.isArray(converted.keyConcepts)) {
    converted.keyConcepts = JSON.stringify(converted.keyConcepts);
  }
  
  if (typeof converted.accessSettings === 'object') {
    converted.accessSettings = JSON.stringify(converted.accessSettings);
  }
  
  if (typeof converted.metadata === 'object') {
    converted.metadata = JSON.stringify(converted.metadata);
  }
  
  return converted;
}

/**
 * Validate that a Prisma result has the expected structure
 */
export function validatePrismaResult(result: any, entityType: string): boolean {
  if (!result) return false;
  
  // Basic validation - should have id and timestamps
  if (!result.id || !result.createdAt || !result.updatedAt) {
    console.warn(`Invalid ${entityType} result: missing required fields`, result);
    return false;
  }
  
  return true;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  totalEntities: number;
  migratedEntities: number;
  failedEntities: number;
  errors: string[];
  warnings: string[];
}

export class MigrationTracker {
  private status: MigrationStatus = {
    totalEntities: 0,
    migratedEntities: 0,
    failedEntities: 0,
    errors: [],
    warnings: [],
  };

  setTotal(total: number): void {
    this.status.totalEntities = total;
  }

  recordSuccess(): void {
    this.status.migratedEntities++;
  }

  recordFailure(error: string): void {
    this.status.failedEntities++;
    this.status.errors.push(error);
  }

  recordWarning(warning: string): void {
    this.status.warnings.push(warning);
  }

  getStatus(): MigrationStatus {
    return { ...this.status };
  }

  getProgressPercentage(): number {
    if (this.status.totalEntities === 0) return 0;
    return Math.round((this.status.migratedEntities / this.status.totalEntities) * 100);
  }

  getSummary(): string {
    const percentage = this.getProgressPercentage();
    return `Migration Progress: ${percentage}% (${this.status.migratedEntities}/${this.status.totalEntities} entities migrated, ${this.status.failedEntities} failed)`;
  }
}

/**
 * Prisma query helpers
 */
export class PrismaQueryHelper {
  /**
   * Convert TypeORM-style where clause to Prisma where clause
   */
  static convertWhereClause(typeormWhere: any): any {
    if (!typeormWhere) return {};
    
    const prismaWhere: any = {};
    
    for (const [key, value] of Object.entries(typeormWhere)) {
      if (typeof value === 'object' && value !== null) {
        // Handle operators like { id: { in: [1, 2, 3] } }
        if ('in' in value) {
          prismaWhere[key] = { in: value.in };
        } else if ('not' in value) {
          prismaWhere[key] = { not: value.not };
        } else if ('gt' in value) {
          prismaWhere[key] = { gt: value.gt };
        } else if ('gte' in value) {
          prismaWhere[key] = { gte: value.gte };
        } else if ('lt' in value) {
          prismaWhere[key] = { lt: value.lt };
        } else if ('lte' in value) {
          prismaWhere[key] = { lte: value.lte };
        } else if ('like' in value) {
          prismaWhere[key] = { contains: String(value.like).replace(/%/g, '') };
        } else {
          prismaWhere[key] = value;
        }
      } else {
        prismaWhere[key] = value;
      }
    }
    
    return prismaWhere;
  }

  /**
   * Convert TypeORM-style order clause to Prisma orderBy clause
   */
  static convertOrderClause(typeormOrder: any): any {
    if (!typeormOrder) return {};
    
    const prismaOrderBy: any = {};
    
    for (const [key, direction] of Object.entries(typeormOrder)) {
      if (typeof direction === 'string') {
        prismaOrderBy[key] = direction.toLowerCase();
      }
    }
    
    return prismaOrderBy;
  }

  /**
   * Convert TypeORM-style relations to Prisma include
   */
  static convertRelations(typeormRelations: string[]): any {
    if (!typeormRelations || typeormRelations.length === 0) return {};
    
    const include: any = {};
    
    for (const relation of typeormRelations) {
      include[relation] = true;
    }
    
    return { include };
  }
}