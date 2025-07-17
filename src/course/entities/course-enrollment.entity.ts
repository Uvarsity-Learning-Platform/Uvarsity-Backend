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
import { Course } from './course.entity';

/**
 * Course Enrollment entity for the Stellr Academy platform
 * 
 * This entity tracks student enrollments in courses:
 * 
 * 🎓 Enrollment Information:
 * - Student and course relationship
 * - Enrollment date and status
 * - Progress tracking and completion
 * - Access permissions and settings
 * 
 * 📊 Progress Tracking:
 * - Enrollment progress percentage
 * - Completion status and dates
 * - Time spent and engagement metrics
 * - Last activity tracking
 * 
 * 💰 Enrollment Management:
 * - Payment status and information
 * - Enrollment source and method
 * - Expiration and renewal tracking
 * - Access control and restrictions
 * 
 * 🔗 Relationships:
 * - Links to user and course entities
 * - Progress and completion tracking
 * - Certificate eligibility
 * - Analytics and reporting
 */
@Entity('course_enrollments')
@Unique(['userId', 'courseId'])
@Index(['userId'])
@Index(['courseId'])
@Index(['status'])
export class CourseEnrollment {
  /**
   * Primary key - Auto-generated UUID for enrollment identification
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === ENROLLMENT RELATIONSHIPS ===

  /**
   * Enrolled student
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
   * Enrolled course
   */
  @ManyToOne(() => Course, course => course.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  /**
   * Course ID for efficient querying
   */
  @Column('uuid')
  @Index()
  courseId: string;

  // === ENROLLMENT STATUS ===

  /**
   * Enrollment status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  @Index()
  status: 'active' | 'completed' | 'dropped' | 'suspended';

  /**
   * Enrollment method/source
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'self',
  })
  enrollmentMethod: 'self' | 'admin' | 'bulk' | 'invitation';

  // === PROGRESS TRACKING ===

  /**
   * Course progress percentage (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  progressPercentage: number;

  /**
   * Number of lessons completed
   */
  @Column({ default: 0 })
  lessonsCompleted: number;

  /**
   * Total lessons in the course at enrollment time
   */
  @Column({ default: 0 })
  totalLessons: number;

  /**
   * Total time spent on course (in minutes)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  timeSpentMinutes: number;

  /**
   * Last accessed lesson ID
   */
  @Column({ nullable: true })
  lastAccessedLessonId?: string;

  /**
   * Current lesson being studied
   */
  @Column({ nullable: true })
  currentLessonId?: string;

  // === COMPLETION TRACKING ===

  /**
   * Course completion status
   */
  @Column({ default: false })
  isCompleted: boolean;

  /**
   * Course completion date
   */
  @Column({ nullable: true })
  completedAt?: Date;

  /**
   * Final course score (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore?: number;

  /**
   * Certificate eligibility status
   */
  @Column({ default: false })
  isCertificateEligible: boolean;

  /**
   * Certificate issued date
   */
  @Column({ nullable: true })
  certificateIssuedAt?: Date;

  // === PAYMENT INFORMATION ===

  /**
   * Payment status for paid courses
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'free',
  })
  paymentStatus: 'free' | 'paid' | 'pending' | 'failed';

  /**
   * Payment amount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paymentAmount: number;

  /**
   * Payment currency
   */
  @Column({ length: 3, default: 'USD' })
  paymentCurrency: string;

  /**
   * Payment transaction ID
   */
  @Column({ nullable: true })
  paymentTransactionId?: string;

  // === ACCESS CONTROL ===

  /**
   * Enrollment expiration date
   */
  @Column({ nullable: true })
  expiresAt?: Date;

  /**
   * Access restrictions or notes
   */
  @Column({ type: 'text', nullable: true })
  accessNotes?: string;

  /**
   * Last activity timestamp
   */
  @Column({ nullable: true })
  lastActivityAt?: Date;

  // === TIMESTAMPS ===

  /**
   * Enrollment creation timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Enrollment last update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Enrollment start date (may differ from createdAt)
   */
  @Column({ nullable: true })
  startedAt?: Date;

  /**
   * Enrollment suspension date
   */
  @Column({ nullable: true })
  suspendedAt?: Date;

  /**
   * Enrollment drop date
   */
  @Column({ nullable: true })
  droppedAt?: Date;

  // === UTILITY METHODS ===

  /**
   * Check if enrollment is active
   */
  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }

  /**
   * Check if enrollment has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  /**
   * Check if course is completed
   */
  isCompletelyFinished(): boolean {
    return this.status === 'completed' && this.isCompleted;
  }

  /**
   * Calculate progress percentage
   */
  calculateProgress(): number {
    if (this.totalLessons === 0) return 0;
    return (this.lessonsCompleted / this.totalLessons) * 100;
  }

  /**
   * Update progress
   */
  updateProgress(lessonsCompleted: number, totalLessons: number): void {
    this.lessonsCompleted = lessonsCompleted;
    this.totalLessons = totalLessons;
    this.progressPercentage = this.calculateProgress();
  }

  /**
   * Mark course as completed
   */
  markCompleted(finalScore?: number): void {
    this.status = 'completed';
    this.isCompleted = true;
    this.completedAt = new Date();
    this.progressPercentage = 100;
    if (finalScore !== undefined) {
      this.finalScore = finalScore;
    }
  }

  /**
   * Drop enrollment
   */
  drop(reason?: string): void {
    this.status = 'dropped';
    this.droppedAt = new Date();
    if (reason) {
      this.accessNotes = reason;
    }
  }

  /**
   * Suspend enrollment
   */
  suspend(reason?: string): void {
    this.status = 'suspended';
    this.suspendedAt = new Date();
    if (reason) {
      this.accessNotes = reason;
    }
  }

  /**
   * Reactivate enrollment
   */
  reactivate(): void {
    this.status = 'active';
    this.suspendedAt = null;
    this.droppedAt = null;
  }

  /**
   * Update last activity
   */
  updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Add time spent
   */
  addTimeSpent(minutes: number): void {
    this.timeSpentMinutes += minutes;
  }

  /**
   * Set current lesson
   */
  setCurrentLesson(lessonId: string): void {
    this.currentLessonId = lessonId;
    this.lastAccessedLessonId = lessonId;
    this.updateLastActivity();
  }

  /**
   * Mark certificate as eligible
   */
  markCertificateEligible(): void {
    this.isCertificateEligible = true;
  }

  /**
   * Mark certificate as issued
   */
  markCertificateIssued(): void {
    this.certificateIssuedAt = new Date();
  }

  /**
   * Get enrollment display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      status: this.status,
      progressPercentage: this.progressPercentage,
      lessonsCompleted: this.lessonsCompleted,
      totalLessons: this.totalLessons,
      timeSpentMinutes: this.timeSpentMinutes,
      isCompleted: this.isCompleted,
      completedAt: this.completedAt,
      finalScore: this.finalScore,
      isCertificateEligible: this.isCertificateEligible,
      enrolledAt: this.createdAt,
      lastActivity: this.lastActivityAt,
    };
  }

  /**
   * Get enrollment summary
   */
  getEnrollmentSummary() {
    return {
      enrollmentId: this.id,
      courseId: this.courseId,
      userId: this.userId,
      status: this.status,
      progress: `${this.progressPercentage.toFixed(1)}%`,
      completion: this.isCompleted ? 'Completed' : 'In Progress',
      enrolledDate: this.createdAt,
      lastActivity: this.lastActivityAt,
    };
  }
}