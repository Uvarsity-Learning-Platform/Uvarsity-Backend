import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoggerService } from '../../common/services/logger.service';
import { Lesson } from '../entities/lesson.entity';
import { Course } from '../entities/course.entity';
import { CourseEnrollment } from '../entities/course-enrollment.entity';

import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateLessonDto } from '../dto/update-course.dto';

/**
 * Lesson Service for Stellr Academy Backend
 * 
 * This service handles all lesson-related business logic:
 * - Lesson creation, updating, and management
 * - Lesson content and structure
 * - Lesson access control
 * - Lesson progress tracking
 */
@Injectable()
export class LessonService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new lesson
   * 
   * @param courseId - Course ID
   * @param createLessonDto - Lesson creation data
   * @param instructorId - ID of the instructor creating the lesson
   * @returns Created lesson
   */
  async createLesson(courseId: string, createLessonDto: CreateLessonDto, instructorId: string): Promise<Lesson> {
    this.logger.log(`Creating lesson: ${createLessonDto.title} for course: ${courseId}`, 'LessonService');

    // Verify course exists and instructor owns it
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only add lessons to your own courses');
    }

    // Check if lesson order is unique within the course
    const existingLesson = await this.lessonRepository.findOne({
      where: { courseId, order: createLessonDto.order },
    });

    if (existingLesson) {
      throw new BadRequestException('Lesson order must be unique within the course');
    }

    // Create lesson
    const lesson = this.lessonRepository.create({
      ...createLessonDto,
      courseId,
      status: 'draft',
    });

    try {
      await this.lessonRepository.save(lesson);
      
      this.logger.log(`Lesson created successfully: ${lesson.id}`, 'LessonService');
      
      return lesson;
    } catch (error) {
      this.logger.error('Failed to create lesson', error, 'LessonService');
      throw new BadRequestException('Failed to create lesson');
    }
  }

  /**
   * Get lessons for a course
   * 
   * @param courseId - Course ID
   * @param userId - User ID (for access control)
   * @returns Course lessons
   */
  async getCourseLessons(courseId: string, userId?: string): Promise<Lesson[]> {
    this.logger.log(`Fetching lessons for course: ${courseId}`, 'LessonService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is enrolled or is the instructor
    let isEnrolled = false;
    let isInstructor = false;

    if (userId) {
      isInstructor = course.instructorId === userId;
      
      if (!isInstructor) {
        const enrollment = await this.enrollmentRepository.findOne({
          where: { courseId, userId, status: 'active' },
        });
        isEnrolled = !!enrollment;
      }
    }

    // Build query based on access permissions
    const queryBuilder = this.lessonRepository.createQueryBuilder('lesson')
      .where('lesson.courseId = :courseId', { courseId })
      .orderBy('lesson.order', 'ASC');

    // Apply access control
    if (!isInstructor) {
      if (isEnrolled) {
        // Enrolled users can see published lessons
        queryBuilder.andWhere('lesson.status = :status', { status: 'published' });
      } else {
        // Non-enrolled users can only see preview lessons
        queryBuilder.andWhere('lesson.status = :status', { status: 'published' })
          .andWhere('lesson.accessSettings->>\'isPreview\' = \'true\'');
      }
    }
    // Instructors can see all lessons (no additional filter)

    const lessons = await queryBuilder.getMany();

    return lessons;
  }

  /**
   * Get lesson by ID
   * 
   * @param lessonId - Lesson ID
   * @param userId - User ID (for access control)
   * @returns Lesson
   */
  async getLessonById(lessonId: string, userId?: string): Promise<Lesson> {
    this.logger.log(`Fetching lesson: ${lessonId}`, 'LessonService');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course', 'course.instructor'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check access permissions
    if (userId) {
      const isInstructor = lesson.course.instructorId === userId;
      
      if (!isInstructor) {
        // Check if user is enrolled in the course
        const enrollment = await this.enrollmentRepository.findOne({
          where: { courseId: lesson.courseId, userId, status: 'active' },
        });

        if (!enrollment && !lesson.accessSettings.isPreview) {
          throw new ForbiddenException('You must be enrolled in the course to access this lesson');
        }

        if (lesson.status !== 'published') {
          throw new ForbiddenException('Lesson is not published');
        }
      }
    } else {
      // Non-authenticated users can only access preview lessons
      if (!lesson.accessSettings.isPreview || lesson.status !== 'published') {
        throw new ForbiddenException('Access denied to this lesson');
      }
    }

    return lesson;
  }

  /**
   * Update lesson
   * 
   * @param lessonId - Lesson ID
   * @param updateLessonDto - Lesson update data
   * @param instructorId - ID of the instructor updating the lesson
   * @returns Updated lesson
   */
  async updateLesson(lessonId: string, updateLessonDto: UpdateLessonDto, instructorId: string): Promise<Lesson> {
    this.logger.log(`Updating lesson: ${lessonId}`, 'LessonService');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if instructor owns the course
    if (lesson.course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only update lessons in your own courses');
    }

    // Check if lesson order is being changed and is unique
    if (updateLessonDto.order && updateLessonDto.order !== lesson.order) {
      const existingLesson = await this.lessonRepository.findOne({
        where: { courseId: lesson.courseId, order: updateLessonDto.order },
      });

      if (existingLesson) {
        throw new BadRequestException('Lesson order must be unique within the course');
      }
    }

    // Update lesson
    Object.assign(lesson, updateLessonDto);

    try {
      await this.lessonRepository.save(lesson);
      
      this.logger.log(`Lesson updated successfully: ${lessonId}`, 'LessonService');
      
      return lesson;
    } catch (error) {
      this.logger.error('Failed to update lesson', error, 'LessonService');
      throw new BadRequestException('Failed to update lesson');
    }
  }

  /**
   * Delete lesson
   * 
   * @param lessonId - Lesson ID
   * @param instructorId - ID of the instructor deleting the lesson
   */
  async deleteLesson(lessonId: string, instructorId: string): Promise<void> {
    this.logger.log(`Deleting lesson: ${lessonId}`, 'LessonService');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if instructor owns the course
    if (lesson.course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only delete lessons from your own courses');
    }

    try {
      await this.lessonRepository.remove(lesson);
      
      this.logger.log(`Lesson deleted successfully: ${lessonId}`, 'LessonService');
    } catch (error) {
      this.logger.error('Failed to delete lesson', error, 'LessonService');
      throw new BadRequestException('Failed to delete lesson');
    }
  }

  /**
   * Publish lesson
   * 
   * @param lessonId - Lesson ID
   * @param instructorId - ID of the instructor publishing the lesson
   */
  async publishLesson(lessonId: string, instructorId: string): Promise<Lesson> {
    this.logger.log(`Publishing lesson: ${lessonId}`, 'LessonService');

    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Check if instructor owns the course
    if (lesson.course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only publish lessons in your own courses');
    }

    // Validate lesson has required content
    if (!lesson.content && !lesson.videoUrl) {
      throw new BadRequestException('Lesson must have content or video to be published');
    }

    lesson.publish();

    try {
      await this.lessonRepository.save(lesson);
      
      this.logger.log(`Lesson published successfully: ${lessonId}`, 'LessonService');
      
      return lesson;
    } catch (error) {
      this.logger.error('Failed to publish lesson', error, 'LessonService');
      throw new BadRequestException('Failed to publish lesson');
    }
  }

  /**
   * Reorder lessons in a course
   * 
   * @param courseId - Course ID
   * @param lessonOrders - Array of lesson IDs with new orders
   * @param instructorId - ID of the instructor reordering lessons
   */
  async reorderLessons(
    courseId: string,
    lessonOrders: { lessonId: string; order: number }[],
    instructorId: string,
  ): Promise<void> {
    this.logger.log(`Reordering lessons for course: ${courseId}`, 'LessonService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only reorder lessons in your own courses');
    }

    // Validate all lessons belong to the course
    const lessons = await this.lessonRepository.find({
      where: { courseId },
    });

    const lessonIds = lessons.map(lesson => lesson.id);
    const providedLessonIds = lessonOrders.map(item => item.lessonId);

    if (!providedLessonIds.every(id => lessonIds.includes(id))) {
      throw new BadRequestException('All lessons must belong to the specified course');
    }

    // Update lesson orders
    try {
      for (const { lessonId, order } of lessonOrders) {
        await this.lessonRepository.update(lessonId, { order });
      }
      
      this.logger.log(`Lessons reordered successfully for course: ${courseId}`, 'LessonService');
    } catch (error) {
      this.logger.error('Failed to reorder lessons', error, 'LessonService');
      throw new BadRequestException('Failed to reorder lessons');
    }
  }

  /**
   * Get lesson content for student access
   * 
   * @param lessonId - Lesson ID
   * @param userId - User ID
   * @returns Lesson content
   */
  async getLessonContent(lessonId: string, userId: string) {
    this.logger.log(`Fetching lesson content: ${lessonId} for user: ${userId}`, 'LessonService');

    const lesson = await this.getLessonById(lessonId, userId);

    // Update user's current lesson
    const enrollment = await this.enrollmentRepository.findOne({
      where: { courseId: lesson.courseId, userId, status: 'active' },
    });

    if (enrollment) {
      enrollment.setCurrentLesson(lessonId);
      await this.enrollmentRepository.save(enrollment);
    }

    return lesson.getStudentContent();
  }
}