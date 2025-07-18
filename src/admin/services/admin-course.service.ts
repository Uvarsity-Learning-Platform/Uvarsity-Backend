import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { CourseEnrollment } from '../../course/entities/course-enrollment.entity';
import { Lesson } from '../../course/entities/lesson.entity';
import { User } from '../../user/entities/user.entity';
import { AdminCourseFilterDto, AdminCreateCourseDto, AdminUpdateCourseDto } from '../dto/admin-course.dto';
import { AdminBulkCourseOperationDto, AdminDashboardStatsDto } from '../dto/admin-dashboard.dto';
import { LoggerService } from '../../common/services/logger.service';

/**
 * Admin Course Service
 * 
 * Handles all course management operations for admin panel:
 * - Course listing with filtering and pagination
 * - Course creation and updates
 * - Bulk operations on courses
 * - Course statistics and analytics
 * - Course content management
 */
@Injectable()
export class AdminCourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get paginated list of courses with filtering
   */
  async getCourses(filterDto: AdminCourseFilterDto) {
    const { search, category, level, status, instructorId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = filterDto;
    
    const query = this.courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor');
    
    // Apply search filter
    if (search) {
      query.where('(course.title ILIKE :search OR course.description ILIKE :search)', { search: `%${search}%` });
    }
    
    // Apply category filter
    if (category) {
      query.andWhere('course.category = :category', { category });
    }
    
    // Apply level filter
    if (level) {
      query.andWhere('course.level = :level', { level });
    }
    
    // Apply status filter
    if (status) {
      query.andWhere('course.status = :status', { status });
    }
    
    // Apply instructor filter
    if (instructorId) {
      query.andWhere('course.instructorId = :instructorId', { instructorId });
    }
    
    // Apply pagination and sorting
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    query.orderBy(`course.${sortBy}`, sortOrder);
    
    const [courses, total] = await query.getManyAndCount();
    
    // Get course statistics
    const courseStats = await this.getCourseStatistics(courses.map(c => c.id));
    
    // Combine course data with statistics
    const coursesWithStats = courses.map(course => ({
      ...course,
      stats: courseStats[course.id] || {
        totalLessons: 0,
        totalEnrollments: 0,
        completedEnrollments: 0,
        averageProgress: 0,
      }
    }));
    
    return {
      courses: coursesWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get course by ID with detailed information
   */
  async getCourseById(courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor', 'lessons', 'enrollments'],
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Get detailed course statistics
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId },
      relations: ['user'],
    });
    
    const lessons = await this.lessonRepository.find({
      where: { courseId },
      order: { order: 'ASC' },
    });
    
    const stats = {
      totalLessons: lessons.length,
      totalEnrollments: enrollments.length,
      completedEnrollments: enrollments.filter(e => e.isCompleted).length,
      averageProgress: enrollments.length > 0 
        ? enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / enrollments.length
        : 0,
      totalTimeSpent: enrollments.reduce((sum, e) => sum + e.timeSpentMinutes, 0),
      certificatesIssued: enrollments.filter(e => e.certificateIssuedAt).length,
    };
    
    return {
      ...course,
      lessons,
      enrollments,
      stats,
    };
  }

  /**
   * Create a new course (admin only)
   */
  async createCourse(createCourseDto: AdminCreateCourseDto) {
    const { instructorId, pricingType, price, currency, autoPublish, ...courseData } = createCourseDto;
    
    // Verify instructor exists
    const instructor = await this.userRepository.findOne({
      where: { id: instructorId },
    });
    
    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
    
    // Check if course title already exists
    const existingCourse = await this.courseRepository.findOne({
      where: { title: courseData.title },
    });
    
    if (existingCourse) {
      throw new ConflictException('Course with this title already exists');
    }
    
    // Create course
    const course = this.courseRepository.create({
      ...courseData,
      instructorId,
      instructor,
      pricing: {
        type: pricingType,
        price: price || 0,
        currency: currency || 'USD',
      },
      status: autoPublish ? 'published' : 'draft',
      publishedAt: autoPublish ? new Date() : null,
    });
    
    await this.courseRepository.save(course);
    
    this.logger.log(`Admin created course: ${course.title}`, 'AdminCourseService');
    
    return course;
  }

  /**
   * Update course information (admin only)
   */
  async updateCourse(courseId: string, updateDto: AdminUpdateCourseDto) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor'],
    });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Check for title conflicts if title is being updated
    if (updateDto.title && updateDto.title !== course.title) {
      const existingCourse = await this.courseRepository.findOne({
        where: { title: updateDto.title },
      });
      if (existingCourse) {
        throw new ConflictException('Course title already in use');
      }
    }
    
    // Verify instructor exists if being updated
    if (updateDto.instructorId) {
      const instructor = await this.userRepository.findOne({
        where: { id: updateDto.instructorId },
      });
      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }
      course.instructor = instructor;
      course.instructorId = updateDto.instructorId;
    }
    
    // Update pricing if provided
    if (updateDto.pricingType || updateDto.price !== undefined || updateDto.currency) {
      course.pricing = {
        type: updateDto.pricingType || course.pricing.type,
        price: updateDto.price !== undefined ? updateDto.price : course.pricing.price,
        currency: updateDto.currency || course.pricing.currency,
      };
    }
    
    // Update status and timestamps
    if (updateDto.status) {
      course.status = updateDto.status;
      if (updateDto.status === 'published' && !course.publishedAt) {
        course.publishedAt = new Date();
      } else if (updateDto.status === 'archived' && !course.archivedAt) {
        course.archivedAt = new Date();
      }
    }
    
    // Update other fields
    Object.assign(course, updateDto);
    
    await this.courseRepository.save(course);
    
    this.logger.log(`Admin updated course: ${course.title}`, 'AdminCourseService');
    
    return course;
  }

  /**
   * Delete course (soft delete)
   */
  async deleteCourse(courseId: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    // Check if course has enrollments
    const enrollmentCount = await this.enrollmentRepository.count({ where: { courseId } });
    
    if (enrollmentCount > 0) {
      // Archive instead of delete if there are enrollments
      course.status = 'archived';
      course.archivedAt = new Date();
      await this.courseRepository.save(course);
      
      this.logger.log(`Admin archived course with enrollments: ${course.title}`, 'AdminCourseService');
      
      return { message: 'Course archived successfully (had active enrollments)' };
    } else {
      // Hard delete if no enrollments
      await this.courseRepository.remove(course);
      
      this.logger.log(`Admin deleted course: ${course.title}`, 'AdminCourseService');
      
      return { message: 'Course deleted successfully' };
    }
  }

  /**
   * Bulk operations on courses
   */
  async bulkCourseOperation(bulkOperationDto: AdminBulkCourseOperationDto) {
    const { courseIds, operation, reason } = bulkOperationDto;
    
    const courses = await this.courseRepository.find({
      where: { id: In(courseIds) },
    });
    
    if (courses.length === 0) {
      throw new NotFoundException('No courses found');
    }
    
    let updatedCourses = [];
    
    switch (operation) {
      case 'publish':
        updatedCourses = await this.bulkPublishCourses(courses);
        break;
      case 'unpublish':
        updatedCourses = await this.bulkUnpublishCourses(courses);
        break;
      case 'archive':
        updatedCourses = await this.bulkArchiveCourses(courses);
        break;
      case 'delete':
        updatedCourses = await this.bulkDeleteCourses(courses);
        break;
    }
    
    this.logger.log(`Admin performed bulk operation: ${operation} on ${courses.length} courses`, 'AdminCourseService');
    
    return {
      message: `Bulk operation ${operation} completed successfully`,
      affectedCourses: updatedCourses.length,
      courses: updatedCourses,
    };
  }

  /**
   * Get course statistics for dashboard
   */
  async getCourseStatisticsForDashboard(statsDto: AdminDashboardStatsDto) {
    const { range = '30d', startDate, endDate } = statsDto;
    
    const totalCourses = await this.courseRepository.count();
    const publishedCourses = await this.courseRepository.count({ where: { status: 'published' } });
    const draftCourses = await this.courseRepository.count({ where: { status: 'draft' } });
    const archivedCourses = await this.courseRepository.count({ where: { status: 'archived' } });
    
    // Get new courses in the specified period
    const newCourses = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.createdAt >= :startDate', { 
        startDate: startDate || new Date(Date.now() - this.getRangeInDays(range) * 24 * 60 * 60 * 1000) 
      })
      .getCount();
    
    // Get total enrollments
    const totalEnrollments = await this.enrollmentRepository.count();
    const completedEnrollments = await this.enrollmentRepository.count({ where: { isCompleted: true } });
    
    // Get popular courses
    const popularCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .orderBy('course.enrollmentCount', 'DESC')
      .limit(5)
      .getMany();
    
    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      archivedCourses,
      newCourses,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
      popularCourses,
      coursesByStatus: {
        published: publishedCourses,
        draft: draftCourses,
        archived: archivedCourses,
      },
    };
  }

  /**
   * Get course categories for filtering
   */
  async getCourseCategories() {
    const categories = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.category')
      .distinct(true)
      .getRawMany();
    
    return categories.map(c => c.course_category).filter(Boolean);
  }

  // Private helper methods
  private async getCourseStatistics(courseIds: string[]) {
    const enrollments = await this.enrollmentRepository.find({
      where: { courseId: In(courseIds) },
    });
    
    const lessons = await this.lessonRepository.find({
      where: { courseId: In(courseIds) },
    });
    
    const courseStats = {};
    
    // Initialize stats for all courses
    courseIds.forEach(id => {
      courseStats[id] = {
        totalLessons: 0,
        totalEnrollments: 0,
        completedEnrollments: 0,
        averageProgress: 0,
      };
    });
    
    // Count lessons per course
    lessons.forEach(lesson => {
      if (courseStats[lesson.courseId]) {
        courseStats[lesson.courseId].totalLessons++;
      }
    });
    
    // Calculate enrollment stats
    enrollments.forEach(enrollment => {
      const courseId = enrollment.courseId;
      if (courseStats[courseId]) {
        courseStats[courseId].totalEnrollments++;
        if (enrollment.isCompleted) {
          courseStats[courseId].completedEnrollments++;
        }
      }
    });
    
    // Calculate average progress
    Object.keys(courseStats).forEach(courseId => {
      const courseEnrollments = enrollments.filter(e => e.courseId === courseId);
      if (courseEnrollments.length > 0) {
        courseStats[courseId].averageProgress = 
          courseEnrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / courseEnrollments.length;
      }
    });
    
    return courseStats;
  }

  private async bulkPublishCourses(courses: Course[]) {
    const updatedCourses = [];
    for (const course of courses) {
      course.status = 'published';
      course.publishedAt = new Date();
      await this.courseRepository.save(course);
      updatedCourses.push(course);
    }
    return updatedCourses;
  }

  private async bulkUnpublishCourses(courses: Course[]) {
    const updatedCourses = [];
    for (const course of courses) {
      course.status = 'draft';
      await this.courseRepository.save(course);
      updatedCourses.push(course);
    }
    return updatedCourses;
  }

  private async bulkArchiveCourses(courses: Course[]) {
    const updatedCourses = [];
    for (const course of courses) {
      course.status = 'archived';
      course.archivedAt = new Date();
      await this.courseRepository.save(course);
      updatedCourses.push(course);
    }
    return updatedCourses;
  }

  private async bulkDeleteCourses(courses: Course[]) {
    const updatedCourses = [];
    for (const course of courses) {
      // Check if course has enrollments
      const enrollmentCount = await this.enrollmentRepository.count({ where: { courseId: course.id } });
      
      if (enrollmentCount > 0) {
        // Archive instead of delete if there are enrollments
        course.status = 'archived';
        course.archivedAt = new Date();
        await this.courseRepository.save(course);
        updatedCourses.push(course);
      } else {
        // Hard delete if no enrollments
        await this.courseRepository.remove(course);
        updatedCourses.push(course);
      }
    }
    return updatedCourses;
  }

  private getRangeInDays(range: string): number {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }
}