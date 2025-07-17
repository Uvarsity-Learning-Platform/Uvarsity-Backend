import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';

import { LoggerService } from '../../common/services/logger.service';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';
import { CourseEnrollment } from '../entities/course-enrollment.entity';
import { User } from '../../user/entities/user.entity';

import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CourseQueryDto, EnrollmentQueryDto } from '../dto/query-course.dto';

/**
 * Course Service for Stellr Academy Backend
 * 
 * This service handles all course-related business logic:
 * - Course creation, updating, and management
 * - Lesson management within courses
 * - Course enrollment and access control
 * - Course search and filtering
 * - Progress tracking integration
 */
@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new course
   * 
   * @param createCourseDto - Course creation data
   * @param instructorId - ID of the instructor creating the course
   * @returns Created course
   */
  async createCourse(createCourseDto: CreateCourseDto, instructorId: string): Promise<Course> {
    this.logger.log(`Creating course: ${createCourseDto.title} by instructor: ${instructorId}`, 'CourseService');

    // Verify instructor exists
    const instructor = await this.userRepository.findOne({ where: { id: instructorId } });
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // Create course
    const course = this.courseRepository.create({
      ...createCourseDto,
      instructorId,
      status: 'draft',
    });

    try {
      await this.courseRepository.save(course);
      
      this.logger.log(`Course created successfully: ${course.id}`, 'CourseService');
      
      return course;
    } catch (error) {
      this.logger.error('Failed to create course', error, 'CourseService');
      throw new BadRequestException('Failed to create course');
    }
  }

  /**
   * Get all courses with filtering and pagination
   * 
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Paginated course list
   */
  async getCourses(queryDto: CourseQueryDto) {
    this.logger.log('Fetching courses with filters', 'CourseService');

    const {
      search,
      category,
      level,
      tags,
      pricing,
      status = 'published',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
      language,
      minRating,
      maxDuration,
      openEnrollment,
    } = queryDto;

    const queryBuilder = this.courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.lessons', 'lessons');

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(course.title ILIKE :search OR course.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (category) {
      queryBuilder.andWhere('course.category = :category', { category });
    }

    if (level) {
      queryBuilder.andWhere('course.level = :level', { level });
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      queryBuilder.andWhere('course.tags && :tags', { tags: tagArray });
    }

    if (pricing) {
      queryBuilder.andWhere('course.pricing->>\'type\' = :pricing', { pricing });
    }

    if (status) {
      queryBuilder.andWhere('course.status = :status', { status });
    }

    if (language) {
      queryBuilder.andWhere('course.language = :language', { language });
    }

    if (minRating) {
      queryBuilder.andWhere('course.averageRating >= :minRating', { minRating });
    }

    if (maxDuration) {
      queryBuilder.andWhere('course.estimatedDuration <= :maxDuration', { maxDuration });
    }

    if (openEnrollment) {
      queryBuilder.andWhere('course.enrollmentSettings->>\'isOpen\' = \'true\'');
    }

    // Apply sorting
    const sortField = sortBy === 'rating' ? 'course.averageRating' : `course.${sortBy}`;
    queryBuilder.orderBy(sortField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [courses, total] = await queryBuilder.getManyAndCount();

    return {
      courses: courses.map(course => course.getDisplayInfo()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course by ID with lessons
   * 
   * @param courseId - Course ID
   * @returns Course with lessons
   */
  async getCourseById(courseId: string): Promise<Course> {
    this.logger.log(`Fetching course: ${courseId}`, 'CourseService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor', 'lessons', 'enrollments'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  /**
   * Update course
   * 
   * @param courseId - Course ID
   * @param updateCourseDto - Course update data
   * @param instructorId - ID of the instructor updating the course
   * @returns Updated course
   */
  async updateCourse(courseId: string, updateCourseDto: UpdateCourseDto, instructorId: string): Promise<Course> {
    this.logger.log(`Updating course: ${courseId}`, 'CourseService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Update course
    Object.assign(course, updateCourseDto);

    try {
      await this.courseRepository.save(course);
      
      this.logger.log(`Course updated successfully: ${courseId}`, 'CourseService');
      
      return course;
    } catch (error) {
      this.logger.error('Failed to update course', error, 'CourseService');
      throw new BadRequestException('Failed to update course');
    }
  }

  /**
   * Delete course
   * 
   * @param courseId - Course ID
   * @param instructorId - ID of the instructor deleting the course
   */
  async deleteCourse(courseId: string, instructorId: string): Promise<void> {
    this.logger.log(`Deleting course: ${courseId}`, 'CourseService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    try {
      await this.courseRepository.remove(course);
      
      this.logger.log(`Course deleted successfully: ${courseId}`, 'CourseService');
    } catch (error) {
      this.logger.error('Failed to delete course', error, 'CourseService');
      throw new BadRequestException('Failed to delete course');
    }
  }

  /**
   * Publish course
   * 
   * @param courseId - Course ID
   * @param instructorId - ID of the instructor publishing the course
   */
  async publishCourse(courseId: string, instructorId: string): Promise<Course> {
    this.logger.log(`Publishing course: ${courseId}`, 'CourseService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if instructor owns the course
    if (course.instructorId !== instructorId) {
      throw new ForbiddenException('You can only publish your own courses');
    }

    // Validate course has lessons
    if (!course.lessons || course.lessons.length === 0) {
      throw new BadRequestException('Course must have at least one lesson to be published');
    }

    course.publish();

    try {
      await this.courseRepository.save(course);
      
      this.logger.log(`Course published successfully: ${courseId}`, 'CourseService');
      
      return course;
    } catch (error) {
      this.logger.error('Failed to publish course', error, 'CourseService');
      throw new BadRequestException('Failed to publish course');
    }
  }

  /**
   * Enroll user in course
   * 
   * @param courseId - Course ID
   * @param userId - User ID
   * @returns Enrollment record
   */
  async enrollInCourse(courseId: string, userId: string): Promise<CourseEnrollment> {
    this.logger.log(`Enrolling user ${userId} in course ${courseId}`, 'CourseService');

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['lessons'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.isEnrollmentOpen()) {
      throw new BadRequestException('Course enrollment is not open');
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: { courseId, userId },
    });

    if (existingEnrollment) {
      throw new BadRequestException('User is already enrolled in this course');
    }

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      courseId,
      userId,
      status: 'active',
      totalLessons: course.lessons.length,
      startedAt: new Date(),
    });

    try {
      await this.enrollmentRepository.save(enrollment);
      
      // Update course enrollment count
      course.incrementEnrollment();
      await this.courseRepository.save(course);
      
      this.logger.log(`User enrolled successfully: ${userId} in course ${courseId}`, 'CourseService');
      
      return enrollment;
    } catch (error) {
      this.logger.error('Failed to enroll user in course', error, 'CourseService');
      throw new BadRequestException('Failed to enroll in course');
    }
  }

  /**
   * Get user's enrollments
   * 
   * @param userId - User ID
   * @param queryDto - Query parameters
   * @returns User's enrollments
   */
  async getUserEnrollments(userId: string, queryDto: EnrollmentQueryDto) {
    this.logger.log(`Fetching enrollments for user: ${userId}`, 'CourseService');

    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = queryDto;

    const queryBuilder = this.enrollmentRepository.createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .where('enrollment.userId = :userId', { userId });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('enrollment.status = :status', { status });
    }

    // Apply sorting
    queryBuilder.orderBy(`enrollment.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [enrollments, total] = await queryBuilder.getManyAndCount();

    return {
      enrollments: enrollments.map(enrollment => ({
        ...enrollment.getDisplayInfo(),
        course: enrollment.course.getDisplayInfo(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course categories
   * 
   * @returns List of course categories
   */
  async getCourseCategories(): Promise<string[]> {
    this.logger.log('Fetching course categories', 'CourseService');

    const categories = await this.courseRepository
      .createQueryBuilder('course')
      .select('DISTINCT course.category', 'category')
      .where('course.status = :status', { status: 'published' })
      .getRawMany();

    return categories.map(item => item.category);
  }

  /**
   * Get course statistics
   * 
   * @returns Course statistics
   */
  async getCourseStats() {
    this.logger.log('Fetching course statistics', 'CourseService');

    const totalCourses = await this.courseRepository.count();
    const publishedCourses = await this.courseRepository.count({
      where: { status: 'published' },
    });
    const totalEnrollments = await this.enrollmentRepository.count();
    const activeEnrollments = await this.enrollmentRepository.count({
      where: { status: 'active' },
    });

    return {
      totalCourses,
      publishedCourses,
      totalEnrollments,
      activeEnrollments,
    };
  }
}