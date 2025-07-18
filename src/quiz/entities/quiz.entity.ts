import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';

/**
 * Quiz entity for the Uvarsity platform
 * 
 * This entity represents a quiz/assessment within a lesson:
 * 
 * 📝 Quiz Structure:
 * - Multiple question types (MCQ, true/false, essay)
 * - Scoring configuration and time limits
 * - Attempt limits and retake policies
 * - Automatic grading capabilities
 * 
 * 🎯 Assessment Features:
 * - Quiz scheduling and availability windows
 * - Prerequisites and access control
 * - Performance analytics and feedback
 * - Integration with progress tracking
 * 
 * 📊 Results & Analytics:
 * - Detailed results with explanations
 * - Performance metrics and statistics
 * - Certificate eligibility determination
 * - Learning insights and recommendations
 */
@Entity('quizzes')
@Index(['lessonId'])
@Index(['createdBy'])
@Index(['status'])
export class Quiz {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Quiz title
   */
  @Column({ length: 200 })
  title: string;

  /**
   * Quiz description and instructions
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Quiz instructions for students
   */
  @Column({ type: 'text', nullable: true })
  instructions?: string;

  /**
   * Lesson this quiz belongs to
   */
  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column('uuid')
  lessonId: string;

  /**
   * User who created this quiz
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column('uuid')
  createdBy: string;

  /**
   * Quiz configuration
   */
  @Column({
    type: 'text',
    default: '{"timeLimit":null,"maxAttempts":null,"passingScore":70,"showCorrectAnswers":true,"shuffleQuestions":false,"shuffleAnswers":false}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  config: {
    timeLimit?: number; // in minutes
    maxAttempts?: number;
    passingScore: number; // percentage
    showCorrectAnswers: boolean;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
  };

  /**
   * Quiz status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  status: 'draft' | 'published' | 'archived';

  /**
   * Quiz availability window
   */
  @Column({ type: 'datetime', nullable: true })
  availableFrom?: Date;

  @Column({ type: 'datetime', nullable: true })
  availableUntil?: Date;

  /**
   * Quiz statistics
   */
  @Column({ type: 'integer', default: 0 })
  totalAttempts: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageScore: number;

  @Column({ type: 'integer', default: 0 })
  passedAttempts: number;

  /**
   * Timestamps
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  publishedAt?: Date;

  /**
   * Helper methods
   */
  
  /**
   * Check if quiz is available for taking
   */
  isAvailable(): boolean {
    const now = new Date();
    return this.status === 'published' &&
           (!this.availableFrom || this.availableFrom <= now) &&
           (!this.availableUntil || this.availableUntil >= now);
  }

  /**
   * Get quiz display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      instructions: this.instructions,
      lessonId: this.lessonId,
      config: this.config,
      status: this.status,
      availableFrom: this.availableFrom,
      availableUntil: this.availableUntil,
      totalAttempts: this.totalAttempts,
      averageScore: this.averageScore,
      passedAttempts: this.passedAttempts,
      createdAt: this.createdAt,
      publishedAt: this.publishedAt,
    };
  }

  /**
   * Get passing rate percentage
   */
  getPassingRate(): number {
    if (this.totalAttempts === 0) return 0;
    return (this.passedAttempts / this.totalAttempts) * 100;
  }
}