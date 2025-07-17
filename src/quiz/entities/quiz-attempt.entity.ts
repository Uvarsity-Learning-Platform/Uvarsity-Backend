import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../user/entities/user.entity';

/**
 * QuizAttempt entity for tracking quiz submissions
 * 
 * This entity represents a user's attempt at taking a quiz:
 * 
 * 📝 Attempt Tracking:
 * - Individual quiz attempts by users
 * - Answer submissions and scoring
 * - Time tracking and completion status
 * - Multiple attempts support
 * 
 * 🎯 Features:
 * - Automatic and manual grading
 * - Detailed feedback and results
 * - Progress tracking integration
 * - Performance analytics
 */
@Entity('quiz_attempts')
@Index(['userId'])
@Index(['quizId'])
@Index(['status'])
@Index(['completedAt'])
export class QuizAttempt {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * User who made this attempt
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column('uuid')
  userId: string;

  /**
   * Quiz being attempted
   */
  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column('uuid')
  quizId: string;

  /**
   * Attempt number for this user and quiz
   */
  @Column({ type: 'integer', default: 1 })
  attemptNumber: number;

  /**
   * Attempt status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'started',
  })
  status: 'started' | 'completed' | 'abandoned' | 'graded';

  /**
   * User's answers
   */
  @Column({
    type: 'text',
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  answers: {
    [questionId: string]: {
      answer: any;
      timeSpent: number; // in seconds
      submittedAt: Date;
      isCorrect?: boolean;
      pointsAwarded?: number;
      feedback?: string;
    };
  };

  /**
   * Scoring information
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  maxScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  /**
   * Timing information
   */
  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'integer', default: 0 })
  timeSpentSeconds: number;

  /**
   * Grading information
   */
  @Column({ type: 'boolean', default: false })
  isGraded: boolean;

  @Column({ type: 'datetime', nullable: true })
  gradedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  gradedBy?: string;

  /**
   * Pass/fail status
   */
  @Column({ type: 'boolean', default: false })
  isPassed: boolean;

  /**
   * Additional feedback and notes
   */
  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'text', nullable: true })
  instructorNotes?: string;

  /**
   * Attempt metadata
   */
  @Column({
    type: 'text',
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    browserInfo?: string;
    deviceInfo?: string;
    questionsOrder?: string[];
    questionsShuffled?: boolean;
    answersShuffled?: boolean;
  };

  /**
   * Timestamps
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper methods
   */

  /**
   * Calculate and update the score
   */
  calculateScore(): void {
    let totalScore = 0;
    let totalPossible = 0;
    let correctAnswers = 0;

    Object.values(this.answers).forEach(answer => {
      if (answer.pointsAwarded !== undefined) {
        totalScore += answer.pointsAwarded;
      }
      if (answer.isCorrect) {
        correctAnswers++;
      }
    });

    this.score = totalScore;
    this.percentage = this.maxScore > 0 ? (totalScore / this.maxScore) * 100 : 0;
  }

  /**
   * Mark attempt as completed
   */
  complete(): void {
    this.status = 'completed';
    this.completedAt = new Date();
    this.calculateScore();
  }

  /**
   * Check if attempt passed based on quiz passing score
   */
  checkPassed(passingScore: number): boolean {
    this.isPassed = this.percentage >= passingScore;
    return this.isPassed;
  }

  /**
   * Get attempt display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      userId: this.userId,
      quizId: this.quizId,
      attemptNumber: this.attemptNumber,
      status: this.status,
      score: this.score,
      maxScore: this.maxScore,
      percentage: this.percentage,
      isPassed: this.isPassed,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      timeSpentSeconds: this.timeSpentSeconds,
      isGraded: this.isGraded,
      gradedAt: this.gradedAt,
      feedback: this.feedback,
      createdAt: this.createdAt,
    };
  }

  /**
   * Get detailed results with answers
   */
  getDetailedResults() {
    return {
      ...this.getDisplayInfo(),
      answers: this.answers,
      metadata: this.metadata,
      instructorNotes: this.instructorNotes,
    };
  }

  /**
   * Get time spent in human readable format
   */
  getFormattedTimeSpent(): string {
    const minutes = Math.floor(this.timeSpentSeconds / 60);
    const seconds = this.timeSpentSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }
}