import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';

import { LoggerService } from '../../common/services/logger.service';
import { UserProgress } from '../entities/user-progress.entity';
import { User } from '../../user/entities/user.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { Course } from '../../course/entities/course.entity';
import { CourseEnrollment } from '../../course/entities/course-enrollment.entity';

/**
 * Progress Service for Stellr Academy Backend
 * 
 * This service handles all learning progress tracking:
 * - Individual lesson progress
 * - Course completion tracking
 * - Learning analytics
 * - Progress reporting
 */
@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepository: Repository<UserProgress>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Start lesson progress tracking
   */
  async startLesson(userId: string, lessonId: string): Promise<UserProgress> {
    this.logger.log(`Starting lesson progress: ${lessonId} for user: ${userId}`, 'ProgressService');

    // Verify lesson exists
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if user is enrolled in the course
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId: lesson.courseId, userId, status: 'active' },
    });

    if (!enrollment) {
      throw new BadRequestException('User must be enrolled in the course');
    }

    // Get or create progress record
    let progress = await this.progressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        userId,
        lessonId,
      });
    }

    progress.startLesson();
    await this.progressRepository.save(progress);

    this.logger.log(`Lesson progress started: ${lessonId} for user: ${userId}`, 'ProgressService');
    return progress;
  }

  /**
   * Update lesson progress
   */
  async updateProgress(
    userId: string,
    lessonId: string,
    position: number,
    progressPercentage: number,
    timeSpent?: number,
  ): Promise<UserProgress> {
    this.logger.log(`Updating progress: ${lessonId} for user: ${userId}`, 'ProgressService');

    let progress = await this.progressRepository.findOne({
      where: { userId, lessonId },
    });

    if (!progress) {
      progress = await this.startLesson(userId, lessonId);
    }

    progress.updateProgress(position, progressPercentage);
    
    if (timeSpent) {
      progress.addTimeSpent(timeSpent);
    }

    await this.progressRepository.save(progress);

    this.logger.log(`Progress updated: ${lessonId} for user: ${userId}`, 'ProgressService');
    return progress;
  }

  /**
   * Mark lesson as completed
   */
  async completeLesson(userId: string, lessonId: string): Promise<UserProgress> {
    this.logger.log(`Completing lesson: ${lessonId} for user: ${userId}`, 'ProgressService');

    let progress = await this.progressRepository.findOne({
      where: { userId, lessonId },
      relations: ['lesson'],
    });

    if (!progress) {
      progress = await this.startLesson(userId, lessonId);
    }

    progress.markCompleted();
    progress.calculateEngagementScore();
    await this.progressRepository.save(progress);

    // Update course enrollment progress
    await this.updateCourseProgress(userId, progress.lesson.courseId);

    this.logger.log(`Lesson completed: ${lessonId} for user: ${userId}`, 'ProgressService');
    return progress;
  }

  /**
   * Get user's progress for a course
   */
  async getCourseProgress(userId: string, courseId: string) {
    this.logger.log(`Getting course progress: ${courseId} for user: ${userId}`, 'ProgressService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const lessonIds = course.lessons.map(lesson => lesson.id);
    
    const progressRecords = await this.progressRepository.find({
      where: { userId, lessonId: In(lessonIds) },
      relations: ['lesson'],
    });

    const totalLessons = course.lessons.length;
    const completedLessons = progressRecords.filter(p => p.isCompleted).length;
    const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.timeSpentMinutes, 0);

    return {
      courseId,
      totalLessons,
      completedLessons,
      progressPercentage: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
      totalTimeSpent,
      lessons: progressRecords.map(p => p.getProgressSummary()),
    };
  }

  /**
   * Get user's overall learning analytics
   */
  async getUserAnalytics(userId: string) {
    this.logger.log(`Getting analytics for user: ${userId}`, 'ProgressService');

    const progressRecords = await this.progressRepository.find({
      where: { userId },
      relations: ['lesson', 'lesson.course'],
    });

    const totalLessons = progressRecords.length;
    const completedLessons = progressRecords.filter(p => p.isCompleted).length;
    const totalTimeSpent = progressRecords.reduce((sum, p) => sum + p.timeSpentMinutes, 0);
    const averageEngagement = progressRecords.reduce((sum, p) => sum + p.engagementScore, 0) / totalLessons;

    // Course-level analytics
    const courseAnalytics = new Map();
    for (const progress of progressRecords) {
      const courseId = progress.lesson.courseId;
      if (!courseAnalytics.has(courseId)) {
        courseAnalytics.set(courseId, {
          courseId,
          courseTitle: progress.lesson.course.title,
          totalLessons: 0,
          completedLessons: 0,
          timeSpent: 0,
          lastActivity: null,
        });
      }
      
      const courseStats = courseAnalytics.get(courseId);
      courseStats.totalLessons += 1;
      if (progress.isCompleted) courseStats.completedLessons += 1;
      courseStats.timeSpent += progress.timeSpentMinutes;
      
      if (!courseStats.lastActivity || progress.lastAccessedAt > courseStats.lastActivity) {
        courseStats.lastActivity = progress.lastAccessedAt;
      }
    }

    return {
      overall: {
        totalLessons,
        completedLessons,
        completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
        totalTimeSpent,
        averageEngagement,
      },
      courses: Array.from(courseAnalytics.values()),
    };
  }

  /**
   * Update course enrollment progress
   */
  private async updateCourseProgress(userId: string, courseId: string): Promise<void> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId, status: 'active' },
    });

    if (!enrollment) {
      return;
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['lessons'],
    });

    if (!course) {
      return;
    }

    const lessonIds = course.lessons.map(lesson => lesson.id);
    const completedLessons = await this.progressRepository.count({
      where: { userId, lessonId: In(lessonIds), isCompleted: true },
    });

    enrollment.updateProgress(completedLessons, course.lessons.length);

    // Check if course is now complete
    if (completedLessons === course.lessons.length) {
      enrollment.markCompleted();
      enrollment.markCertificateEligible();
    }

    await this.enrollmentRepository.save(enrollment);
  }
}