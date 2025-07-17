import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../course/entities/lesson.entity';

/**
 * User Progress entity for the Stellr Academy platform
 * 
 * This entity tracks user progress for individual lessons:
 * 
 * 📖 Lesson Progress:
 * - Completion status and timestamps
 * - Time spent on lesson content
 * - Progress percentage within lesson
 * - Last accessed position
 * 
 * 📊 Engagement Metrics:
 * - Number of visits to lesson
 * - Time spent across sessions
 * - Interaction patterns
 * - Learning velocity
 * 
 * 🎯 Learning Analytics:
 * - Progress tracking per lesson
 * - Completion patterns
 * - Time-to-completion metrics
 * - Engagement scoring
 * 
 * 🔗 Relationships:
 * - Links to user and lesson entities
 * - Course progress aggregation
 * - Achievement tracking
 * - Analytics reporting
 */
@Entity('user_progress')
@Unique(['userId', 'lessonId'])
@Index(['userId'])
@Index(['lessonId'])
@Index(['completedAt'])
@Index(['isCompleted'])
export class UserProgress {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === USER AND LESSON RELATIONSHIP ===

  /**
   * User who owns this progress record
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * User ID for efficient querying
   */
  @Column('uuid')
  @Index()
  userId: string;

  /**
   * Lesson this progress record tracks
   */
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  /**
   * Lesson ID for efficient querying
   */
  @Column('uuid')
  @Index()
  lessonId: string;

  // === PROGRESS INFORMATION ===

  /**
   * Completion status of the lesson
   */
  @Column({ default: false })
  @Index()
  isCompleted: boolean;

  /**
   * Progress percentage within the lesson (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  /**
   * Current position in the lesson (for videos: seconds, for text: scroll position)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  currentPosition: number;

  /**
   * Total time spent on this lesson (in minutes)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  timeSpentMinutes: number;

  /**
   * Number of times user has visited this lesson
   */
  @Column({ default: 0 })
  visitCount: number;

  // === COMPLETION INFORMATION ===

  /**
   * Date and time when lesson was first started
   */
  @Column({ nullable: true })
  startedAt?: Date;

  /**
   * Date and time when lesson was completed
   */
  @Column({ nullable: true })
  @Index()
  completedAt?: Date;

  /**
   * Last time user accessed this lesson
   */
  @Column({ nullable: true })
  lastAccessedAt?: Date;

  // === ENGAGEMENT METRICS ===

  /**
   * Score representing user engagement (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagementScore: number;

  /**
   * Number of times user rewatched/reread content
   */
  @Column({ default: 0 })
  reviewCount: number;

  /**
   * User's self-reported difficulty rating (1-5)
   */
  @Column({ type: 'int', nullable: true })
  difficultyRating?: number;

  /**
   * User's rating of the lesson (1-5 stars)
   */
  @Column({ type: 'int', nullable: true })
  userRating?: number;

  // === ADDITIONAL METADATA ===

  /**
   * Notes or comments user made about the lesson
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Additional metadata as JSON
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata: {
    lastPosition?: number;
    bookmarks?: number[];
    interactions?: string[];
    challenges?: string[];
  };

  // === TIMESTAMPS ===

  /**
   * Progress record creation timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Progress record last update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // === UTILITY METHODS ===

  /**
   * Start lesson progress tracking
   */
  startLesson(): void {
    if (!this.startedAt) {
      this.startedAt = new Date();
    }
    this.visitCount += 1;
    this.lastAccessedAt = new Date();
  }

  /**
   * Update progress position
   */
  updateProgress(position: number, progressPercentage: number): void {
    this.currentPosition = position;
    this.progressPercentage = Math.min(100, Math.max(0, progressPercentage));
    this.lastAccessedAt = new Date();
  }

  /**
   * Add time spent on lesson
   */
  addTimeSpent(minutes: number): void {
    this.timeSpentMinutes += minutes;
    this.lastAccessedAt = new Date();
  }

  /**
   * Mark lesson as completed
   */
  markCompleted(): void {
    this.isCompleted = true;
    this.completedAt = new Date();
    this.progressPercentage = 100;
    this.lastAccessedAt = new Date();
  }

  /**
   * Mark lesson as incomplete
   */
  markIncomplete(): void {
    this.isCompleted = false;
    this.completedAt = null;
    this.progressPercentage = Math.min(99, this.progressPercentage);
  }

  /**
   * Add a review/rewatch
   */
  addReview(): void {
    this.reviewCount += 1;
    this.lastAccessedAt = new Date();
  }

  /**
   * Set user rating
   */
  setRating(rating: number): void {
    this.userRating = Math.min(5, Math.max(1, rating));
  }

  /**
   * Set difficulty rating
   */
  setDifficultyRating(rating: number): void {
    this.difficultyRating = Math.min(5, Math.max(1, rating));
  }

  /**
   * Calculate engagement score based on various metrics
   */
  calculateEngagementScore(): number {
    let score = 0;
    
    // Base score for completion
    if (this.isCompleted) {
      score += 40;
    } else {
      score += this.progressPercentage * 0.4;
    }
    
    // Time spent factor (normalized)
    const timeScore = Math.min(30, this.timeSpentMinutes * 0.5);
    score += timeScore;
    
    // Review factor
    const reviewScore = Math.min(15, this.reviewCount * 3);
    score += reviewScore;
    
    // Rating factor
    if (this.userRating) {
      score += this.userRating * 3;
    }
    
    this.engagementScore = Math.min(100, score);
    return this.engagementScore;
  }

  /**
   * Get progress summary
   */
  getProgressSummary() {
    return {
      id: this.id,
      lessonId: this.lessonId,
      isCompleted: this.isCompleted,
      progressPercentage: this.progressPercentage,
      timeSpentMinutes: this.timeSpentMinutes,
      visitCount: this.visitCount,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      lastAccessedAt: this.lastAccessedAt,
      engagementScore: this.engagementScore,
      userRating: this.userRating,
      difficultyRating: this.difficultyRating,
    };
  }

  /**
   * Get detailed progress information
   */
  getDetailedProgress() {
    return {
      ...this.getProgressSummary(),
      currentPosition: this.currentPosition,
      reviewCount: this.reviewCount,
      notes: this.notes,
      metadata: this.metadata,
    };
  }

  /**
   * Check if lesson was recently accessed
   */
  isRecentlyAccessed(hours: number = 24): boolean {
    if (!this.lastAccessedAt) return false;
    
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    return this.lastAccessedAt > hoursAgo;
  }

  /**
   * Get time since last access
   */
  getTimeSinceLastAccess(): string {
    if (!this.lastAccessedAt) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - this.lastAccessedAt.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }
}