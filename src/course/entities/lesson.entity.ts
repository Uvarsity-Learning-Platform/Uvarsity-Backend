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
import { Course } from './course.entity';

/**
 * Lesson entity for the Stellr Academy platform
 * 
 * This entity represents a lesson within a course:
 * 
 * 📖 Lesson Content:
 * - Lesson title, description, and content
 * - Media attachments (videos, documents, etc.)
 * - Learning objectives and materials
 * - Duration and difficulty estimates
 * 
 * 🎯 Lesson Structure:
 * - Hierarchical organization within courses
 * - Lesson ordering and dependencies
 * - Content types and formats
 * - Prerequisites and requirements
 * 
 * 📊 Lesson Management:
 * - Publication status and availability
 * - Access control and permissions
 * - Progress tracking integration
 * - Analytics and engagement metrics
 * 
 * 🔗 Relationships:
 * - Links to parent course
 * - Progress tracking entries
 * - Quiz and assessment integration
 * - Media and resource attachments
 */
@Entity('lessons')
@Index(['courseId'])
@Index(['order'])
@Index(['status'])
export class Lesson {
  /**
   * Primary key - Auto-generated UUID for lesson identification
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === LESSON INFORMATION ===

  /**
   * Lesson title
   */
  @Column({ length: 200 })
  title: string;

  /**
   * Lesson description or overview
   */
  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Lesson content (HTML, Markdown, or structured content)
   */
  @Column({ type: 'text', nullable: true })
  content?: string;

  /**
   * Lesson content type
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'text',
  })
  contentType: 'video' | 'text' | 'interactive' | 'quiz' | 'assignment';

  /**
   * Lesson order within the course
   */
  @Column({ type: 'int' })
  @Index()
  order: number;

  /**
   * Estimated lesson duration in minutes
   */
  @Column({ type: 'int', nullable: true })
  durationMinutes?: number;

  /**
   * Lesson difficulty level
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'beginner',
  })
  level: 'beginner' | 'intermediate' | 'advanced';

  // === LESSON CONTENT ===

  /**
   * Video URL or media reference
   */
  @Column({ length: 500, nullable: true })
  videoUrl?: string;

  /**
   * Video duration in seconds
   */
  @Column({ type: 'int', nullable: true })
  videoDuration?: number;

  /**
   * Additional resources and materials
   */
  @Column({
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: any) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  resources: {
    type: 'pdf' | 'link' | 'document' | 'exercise';
    title: string;
    url: string;
    description?: string;
  }[];

  /**
   * Learning objectives for this lesson
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

  /**
   * Key concepts covered in this lesson
   */
  @Column({ 
    type: 'text',
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => JSON.parse(value || '[]'),
    },
  })
  keyConcepts: string[];

  // === LESSON MANAGEMENT ===

  /**
   * Lesson publication status
   */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'draft',
  })
  @Index()
  status: 'draft' | 'published' | 'archived';

  /**
   * Lesson access settings
   */
  @Column({
    type: 'text',
    default: '{"isPreview":false,"requiresEnrollment":true,"prerequisiteCompleted":false}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => JSON.parse(value || '{}'),
    },
  })
  accessSettings: {
    isPreview: boolean;
    requiresEnrollment: boolean;
    prerequisiteCompleted: boolean;
  };

  /**
   * Lesson prerequisite requirements
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

  // === LESSON METRICS ===

  /**
   * Number of students who have completed this lesson
   */
  @Column({ default: 0 })
  completionCount: number;

  /**
   * Average time spent on this lesson (in minutes)
   */
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  averageTimeSpent: number;

  /**
   * Lesson engagement score (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  engagementScore: number;

  // === COURSE RELATIONSHIP ===

  /**
   * Parent course for this lesson
   */
  @ManyToOne(() => Course, course => course.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  /**
   * Course ID for efficient querying
   */
  @Column('uuid')
  @Index()
  courseId: string;

  // === TIMESTAMPS ===

  /**
   * Lesson creation timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Lesson last update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Lesson publication date
   */
  @Column({ nullable: true })
  publishedAt?: Date;

  // === UTILITY METHODS ===

  /**
   * Check if lesson is published and available
   */
  isPublished(): boolean {
    return this.status === 'published';
  }

  /**
   * Check if lesson is archived
   */
  isArchived(): boolean {
    return this.status === 'archived';
  }

  /**
   * Check if lesson is available as preview
   */
  isPreview(): boolean {
    return this.accessSettings.isPreview;
  }

  /**
   * Get lesson duration as display text
   */
  getDurationText(): string {
    if (!this.durationMinutes) return 'Duration not set';
    
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get lesson difficulty as display text
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
   * Get content type as display text
   */
  getContentTypeText(): string {
    const types = {
      video: 'Video Lesson',
      text: 'Reading Material',
      interactive: 'Interactive Content',
      quiz: 'Quiz',
      assignment: 'Assignment',
    };
    return types[this.contentType];
  }

  /**
   * Publish the lesson
   */
  publish(): void {
    this.status = 'published';
    this.publishedAt = new Date();
  }

  /**
   * Archive the lesson
   */
  archive(): void {
    this.status = 'archived';
  }

  /**
   * Increment completion count
   */
  incrementCompletion(): void {
    this.completionCount += 1;
  }

  /**
   * Update average time spent
   */
  updateAverageTimeSpent(timeSpent: number): void {
    const totalTime = this.averageTimeSpent * this.completionCount + timeSpent;
    this.averageTimeSpent = totalTime / (this.completionCount + 1);
  }

  /**
   * Get lesson display information
   */
  getDisplayInfo() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      contentType: this.getContentTypeText(),
      duration: this.getDurationText(),
      level: this.getDifficultyText(),
      order: this.order,
      isPreview: this.isPreview(),
      completionCount: this.completionCount,
      resources: this.resources,
    };
  }

  /**
   * Get lesson content for student access
   */
  getStudentContent() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      content: this.content,
      contentType: this.contentType,
      videoUrl: this.videoUrl,
      videoDuration: this.videoDuration,
      resources: this.resources,
      learningObjectives: this.learningObjectives,
      keyConcepts: this.keyConcepts,
      durationMinutes: this.durationMinutes,
    };
  }
}