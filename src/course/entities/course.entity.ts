import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from './lesson.entity';
import { CourseEnrollment } from './course-enrollment.entity';

/**
 * Course entity for the Uvarsity platform
 * 
 * This entity represents a course in the learning system:
 * 
 * 📚 Course Information:
 * - Course title, description, and metadata
 * - Instructor information and creation details
 * - Category and tags for organization
 * - Difficulty level and duration estimates
 * 
 * 🎯 Course Structure:
 * - Hierarchical lesson organization
 * - Prerequisites and learning paths
 * - Course completion requirements
 * - Assessment and certification details
 * 
 * 💰 Course Management:
 * - Pricing and enrollment options
 * - Course status and availability
 * - Publication and scheduling
 * - Analytics and reporting
 * 
 * 🔗 Relationships:
 * - Links to lessons and course content
 * - User enrollments and progress tracking
 * - Quiz and assessment integration
 * - Certificate generation
 */
@Entity('courses')
@Index(['title'])
@Index(['category'])
@Index(['status'])
@Index(['instructor'])
export class Course {
  /**
   * Primary key - Auto-generated UUID for course identification
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === COURSE INFORMATION ===

  /**
   * Course title - main identifier for learners
   */
  @Column({ length: 200 })
  @Index()
  title: string;

  /**
   * Course description - overview of course content
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * Short course summary for catalog display
   */
  @Column({ type: 'text', nullable: true })
  summary?: string;

  /**
   * Course thumbnail/cover image URL
   */
  @Column({ length: 500, nullable: true })
  thumbnailUrl?: string;

  /**
   * Course category for organization
   */
  @Column({ length: 100 })
  @Index()
  category: string;

  /**
   * Course tags for search and discovery
   */
  @Column({ 
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  tags: string[];

  /**
   * Course difficulty level
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'beginner',
  })
  level: 'beginner' | 'intermediate' | 'advanced';

  /**
   * Estimated course duration in hours
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  estimatedDuration?: number;

  /**
   * Course language (ISO 639-1 code)
   */
  @Column({ length: 5, default: 'en' })
  language: string;

  // === INSTRUCTOR INFORMATION ===

  /**
   * Course instructor/creator
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructorId' })
  instructor: User;

  /**
   * Instructor ID for efficient querying
   */
  @Column('uuid')
  @Index()
  instructorId: string;

  // === COURSE MANAGEMENT ===

  /**
   * Course publication status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  @Index()
  status: 'draft' | 'published' | 'archived';

  /**
   * Course pricing information
   */
  @Column({
    type: 'text',
    default: '{"type":"free","price":0,"currency":"USD"}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  pricing: {
    type: 'free' | 'paid' | 'premium';
    price: number;
    currency: string;
  };

  /**
   * Course enrollment settings
   */
  @Column({
    type: 'text',
    default: '{"isOpen":true,"maxEnrollments":null,"enrollmentDeadline":null}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  enrollmentSettings: {
    isOpen: boolean;
    maxEnrollments?: number;
    enrollmentDeadline?: Date;
  };

  /**
   * Course requirements and prerequisites
   */
  @Column({ 
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  prerequisites: string[];

  /**
   * Learning objectives and outcomes
   */
  @Column({ 
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  learningObjectives: string[];

  // === COURSE METRICS ===

  /**
   * Total number of enrolled students
   */
  @Column({ default: 0 })
  enrollmentCount: number;

  /**
   * Average course rating (1-5 stars)
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  /**
   * Total number of ratings
   */
  @Column({ default: 0 })
  ratingCount: number;

  /**
   * Course completion rate percentage
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  completionRate: number;

  // === TIMESTAMPS ===

  /**
   * Course creation timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Course last update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Course publication date
   */
  @Column({ nullable: true })
  publishedAt?: Date;

  /**
   * Course archival date
   */
  @Column({ nullable: true })
  archivedAt?: Date;

  // === RELATIONSHIPS ===

  /**
   * Course lessons - one-to-many relationship
   */
  @OneToMany(() => Lesson, lesson => lesson.course)
  lessons: Lesson[];

  /**
   * Course enrollments - one-to-many relationship
   */
  @OneToMany(() => CourseEnrollment, enrollment => enrollment.course)
  enrollments: CourseEnrollment[];

  // === UTILITY METHODS ===

  /**
   * Check if course is available for enrollment
   */
  isEnrollmentOpen(): boolean {
    if (!this.enrollmentSettings.isOpen || this.status !== 'published') {
      return false;
    }

    if (this.enrollmentSettings.enrollmentDeadline) {
      return new Date() <= this.enrollmentSettings.enrollmentDeadline;
    }

    if (this.enrollmentSettings.maxEnrollments) {
      return this.enrollmentCount < this.enrollmentSettings.maxEnrollments;
    }

    return true;
  }

  /**
   * Get course difficulty as display text
   */
  getDifficultyText(): string {
    const levels = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return levels[this.level];
  }

  /**
   * Get course pricing as display text
   */
  getPricingText(): string {
    if (this.pricing.type === 'free') {
      return 'Free';
    }
    return `${this.pricing.currency} ${this.pricing.price}`;
  }

  /**
   * Check if course is published and available
   */
  isPublished(): boolean {
    return this.status === 'published';
  }

  /**
   * Check if course is archived
   */
  isArchived(): boolean {
    return this.status === 'archived';
  }

  /**
   * Update course rating
   */
  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.ratingCount + newRating;
    this.ratingCount += 1;
    this.averageRating = totalRating / this.ratingCount;
  }

  /**
   * Increment enrollment count
   */
  incrementEnrollment(): void {
    this.enrollmentCount += 1;
  }

  /**
   * Decrement enrollment count
   */
  decrementEnrollment(): void {
    if (this.enrollmentCount > 0) {
      this.enrollmentCount -= 1;
    }
  }

  /**
   * Publish the course
   */
  publish(): void {
    this.status = 'published';
    this.publishedAt = new Date();
  }

  /**
   * Archive the course
   */
  archive(): void {
    this.status = 'archived';
    this.archivedAt = new Date();
  }

  /**
   * Get course display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      title: this.title,
      summary: this.summary,
      thumbnailUrl: this.thumbnailUrl,
      category: this.category,
      level: this.getDifficultyText(),
      pricing: this.getPricingText(),
      duration: this.estimatedDuration,
      rating: this.averageRating,
      enrollmentCount: this.enrollmentCount,
      isEnrollmentOpen: this.isEnrollmentOpen(),
    };
  }
}