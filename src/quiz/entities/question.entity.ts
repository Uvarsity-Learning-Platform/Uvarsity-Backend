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

/**
 * Question entity for quiz questions
 * 
 * This entity represents individual questions within a quiz:
 * 
 * 📝 Question Types:
 * - Multiple choice (single and multiple select)
 * - True/false questions
 * - Essay/text response
 * - Fill-in-the-blank
 * 
 * 🎯 Features:
 * - Question ordering and randomization
 * - Scoring weights and points
 * - Explanations and feedback
 * - Rich text content support
 */
@Entity('questions')
@Index(['quizId'])
@Index(['type'])
@Index(['order'])
export class Question {
  /**
   * Primary key - Auto-generated UUID
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Quiz this question belongs to
   */
  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizId' })
  quiz: Quiz;

  @Column('uuid')
  quizId: string;

  /**
   * Question type
   */
  @Column({
    type: 'varchar',
    length: 20,
  })
  type: 'multiple_choice' | 'true_false' | 'essay' | 'fill_blank';

  /**
   * Question text/content
   */
  @Column({ type: 'text' })
  questionText: string;

  /**
   * Question explanation (shown after answer)
   */
  @Column({ type: 'text', nullable: true })
  explanation?: string;

  /**
   * Question order within the quiz
   */
  @Column({ type: 'integer' })
  order: number;

  /**
   * Points awarded for correct answer
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  points: number;

  /**
   * Answer options for multiple choice questions
   */
  @Column({
    type: 'text',
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => value ? JSON.parse(value) : null,
    },
  })
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];

  /**
   * Correct answer(s) for the question
   */
  @Column({
    type: 'text',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  correctAnswer: {
    // For multiple choice: array of correct option IDs
    options?: string[];
    // For true/false: boolean value
    boolean?: boolean;
    // For essay: sample answer or keywords
    text?: string;
    // For fill_blank: expected text or pattern
    pattern?: string;
  };

  /**
   * Question metadata
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
    difficulty?: 'easy' | 'medium' | 'hard';
    tags?: string[];
    category?: string;
    estimatedTime?: number; // in seconds
  };

  /**
   * Question statistics
   */
  @Column({ type: 'integer', default: 0 })
  totalAttempts: number;

  @Column({ type: 'integer', default: 0 })
  correctAttempts: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageScore: number;

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
   * Check if given answer is correct
   */
  isAnswerCorrect(answer: any): boolean {
    switch (this.type) {
      case 'multiple_choice':
        const selectedOptions = Array.isArray(answer) ? answer : [answer];
        const correctOptions = this.correctAnswer.options || [];
        return selectedOptions.length === correctOptions.length &&
               selectedOptions.every(opt => correctOptions.includes(opt));
      
      case 'true_false':
        return answer === this.correctAnswer.boolean;
      
      case 'essay':
        // For essay questions, manual grading is typically required
        return false;
      
      case 'fill_blank':
        const pattern = this.correctAnswer.pattern || '';
        return answer && answer.toLowerCase().trim() === pattern.toLowerCase().trim();
      
      default:
        return false;
    }
  }

  /**
   * Get question display information (without revealing answers)
   */
  getDisplayInfo() {
    return {
      id: this.id,
      quizId: this.quizId,
      type: this.type,
      questionText: this.questionText,
      order: this.order,
      points: this.points,
      options: this.options?.map(opt => ({
        id: opt.id,
        text: opt.text,
        // Don't reveal correct answers
      })),
      metadata: this.metadata,
      totalAttempts: this.totalAttempts,
      correctAttempts: this.correctAttempts,
      averageScore: this.averageScore,
    };
  }

  /**
   * Get success rate percentage
   */
  getSuccessRate(): number {
    if (this.totalAttempts === 0) return 0;
    return (this.correctAttempts / this.totalAttempts) * 100;
  }
}