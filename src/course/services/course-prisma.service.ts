import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

interface Course {
  id: string;
  title: string;
  description: string;
  summary?: string | null;
  thumbnailUrl?: string | null;
  category: string;
  tags: string;
  level: string;
  estimatedDuration?: number | null;
  language: string;
  instructorId: string;
  status: string;
  pricing: string;
  enrollmentSettings: string;
  prerequisites: string;
  learningObjectives: string;
  enrollmentCount: number;
  averageRating: number;
  ratingCount: number;
  completionRate: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
}

/**
 * Course Service using Prisma for Uvarsity Backend
 * 
 * This service handles all course-related business logic including:
 * - Course creation, updates, and management
 * - Course catalog and discovery
 * - Enrollment management
 * - Course metrics and analytics
 * - Publishing and archiving workflows
 */
@Injectable()
export class CoursePrismaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Find a course by its unique ID
   * 
   * @param id - Course ID to search for
   * @returns Course entity or null if not found
   */
  async findById(id: string): Promise<Course | null> {
    try {
      const course = await this.prisma.course.findUnique({
        where: { id },
      });
      this.logger.debug(`Course lookup by ID: ${id} - ${course ? 'Found' : 'Not found'}`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to find course by ID: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Find courses by instructor ID
   * 
   * @param instructorId - Instructor ID to search for
   * @returns Array of courses by the instructor
   */
  async findByInstructor(instructorId: string): Promise<Course[]> {
    try {
      const courses = await this.prisma.course.findMany({
        where: { instructorId },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.debug(`Found ${courses.length} courses for instructor: ${instructorId}`, 'CoursePrismaService');
      return courses;
    } catch (error) {
      this.logger.error(`Failed to find courses by instructor: ${instructorId}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Find courses by category
   * 
   * @param category - Category to search for
   * @returns Array of courses in the category
   */
  async findByCategory(category: string): Promise<Course[]> {
    try {
      const courses = await this.prisma.course.findMany({
        where: { 
          category,
          status: 'published', // Only published courses
        },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.debug(`Found ${courses.length} courses in category: ${category}`, 'CoursePrismaService');
      return courses;
    } catch (error) {
      this.logger.error(`Failed to find courses by category: ${category}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Create a new course
   * 
   * @param courseData - Course data for creation
   * @returns Created course entity
   */
  async create(courseData: {
    title: string;
    description: string;
    summary?: string;
    thumbnailUrl?: string;
    category: string;
    tags?: string[];
    level?: 'beginner' | 'intermediate' | 'advanced';
    estimatedDuration?: number;
    language?: string;
    instructorId: string;
    pricing?: {
      type: 'free' | 'paid' | 'premium';
      price: number;
      currency: string;
    };
    prerequisites?: string[];
    learningObjectives?: string[];
  }): Promise<Course> {
    try {
      const course = await this.prisma.course.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          summary: courseData.summary,
          thumbnailUrl: courseData.thumbnailUrl,
          category: courseData.category,
          tags: JSON.stringify(courseData.tags || []),
          level: courseData.level || 'beginner',
          estimatedDuration: courseData.estimatedDuration,
          language: courseData.language || 'en',
          instructorId: courseData.instructorId,
          pricing: JSON.stringify(courseData.pricing || {
            type: 'free',
            price: 0,
            currency: 'USD',
          }),
          prerequisites: JSON.stringify(courseData.prerequisites || []),
          learningObjectives: JSON.stringify(courseData.learningObjectives || []),
        },
      });

      this.logger.log(`Course created successfully: ${course.title} (ID: ${course.id})`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to create course: ${courseData.title}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update course information
   * 
   * @param id - Course ID to update
   * @param updateData - Data to update
   * @returns Updated course entity
   */
  async update(id: string, updateData: Partial<Course>): Promise<Course> {
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Course updated successfully: ${course.title} (ID: ${course.id})`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to update course: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Publish a course
   * 
   * @param id - Course ID to publish
   * @returns Updated course entity
   */
  async publish(id: string): Promise<Course> {
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: {
          status: 'published',
          publishedAt: new Date(),
        },
      });

      this.logger.log(`Course published: ${course.title} (ID: ${course.id})`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to publish course: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Archive a course
   * 
   * @param id - Course ID to archive
   * @returns Updated course entity
   */
  async archive(id: string): Promise<Course> {
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: {
          status: 'archived',
          archivedAt: new Date(),
        },
      });

      this.logger.log(`Course archived: ${course.title} (ID: ${course.id})`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to archive course: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Get paginated list of courses
   * 
   * @param page - Page number (1-based)
   * @param pageSize - Number of courses per page
   * @param filters - Optional filters
   * @returns Paginated course list
   */
  async findMany(
    page: number = 1,
    pageSize: number = 10,
    filters: {
      category?: string;
      level?: 'beginner' | 'intermediate' | 'advanced';
      status?: 'draft' | 'published' | 'archived';
      search?: string;
      instructorId?: string;
    } = {},
  ): Promise<{ courses: Course[]; total: number; totalPages: number }> {
    try {
      const skip = (page - 1) * pageSize;
      const where: any = {};

      // Apply filters
      if (filters.category) {
        where.category = filters.category;
      }
      if (filters.level) {
        where.level = filters.level;
      }
      if (filters.status) {
        where.status = filters.status;
      }
      if (filters.instructorId) {
        where.instructorId = filters.instructorId;
      }
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search } },
          { description: { contains: filters.search } },
          { category: { contains: filters.search } },
        ];
      }

      const [courses, total] = await Promise.all([
        this.prisma.course.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.course.count({ where }),
      ]);

      const totalPages = Math.ceil(total / pageSize);

      this.logger.debug(`Found ${courses.length} courses (page ${page}/${totalPages})`, 'CoursePrismaService');
      
      return {
        courses,
        total,
        totalPages,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch courses (page ${page})`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update course enrollment count
   * 
   * @param id - Course ID
   * @param increment - Whether to increment (true) or decrement (false)
   * @returns Updated course entity
   */
  async updateEnrollmentCount(id: string, increment: boolean = true): Promise<Course> {
    try {
      const course = await this.prisma.course.update({
        where: { id },
        data: {
          enrollmentCount: increment 
            ? { increment: 1 }
            : { decrement: 1 },
        },
      });

      this.logger.debug(`Course enrollment count ${increment ? 'incremented' : 'decremented'}: ${id}`, 'CoursePrismaService');
      return course;
    } catch (error) {
      this.logger.error(`Failed to update enrollment count for course: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Update course rating
   * 
   * @param id - Course ID
   * @param rating - New rating (1-5)
   * @returns Updated course entity
   */
  async updateRating(id: string, rating: number): Promise<Course> {
    try {
      const course = await this.findById(id);
      if (!course) {
        throw new Error('Course not found');
      }

      const totalRating = course.averageRating * course.ratingCount + rating;
      const newRatingCount = course.ratingCount + 1;
      const newAverageRating = totalRating / newRatingCount;

      const updatedCourse = await this.prisma.course.update({
        where: { id },
        data: {
          averageRating: newAverageRating,
          ratingCount: newRatingCount,
        },
      });

      this.logger.debug(`Course rating updated: ${id} - New average: ${newAverageRating}`, 'CoursePrismaService');
      return updatedCourse;
    } catch (error) {
      this.logger.error(`Failed to update rating for course: ${id}`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Get featured courses (high-rated, popular)
   * 
   * @param limit - Number of courses to return
   * @returns Array of featured courses
   */
  async getFeaturedCourses(limit: number = 6): Promise<Course[]> {
    try {
      const courses = await this.prisma.course.findMany({
        where: {
          status: 'published',
          averageRating: { gte: 4.0 },
          enrollmentCount: { gte: 10 },
        },
        orderBy: [
          { averageRating: 'desc' },
          { enrollmentCount: 'desc' },
        ],
        take: limit,
      });

      this.logger.debug(`Found ${courses.length} featured courses`, 'CoursePrismaService');
      return courses;
    } catch (error) {
      this.logger.error(`Failed to get featured courses`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }

  /**
   * Get course categories with count
   * 
   * @returns Array of categories with course counts
   */
  async getCategoriesWithCount(): Promise<Array<{ category: string; count: number }>> {
    try {
      // Since we don't have proper aggregation with our mock, we'll return a simple structure
      const courses = await this.prisma.course.findMany({
        where: { status: 'published' },
      });

      const categoryCount: { [key: string]: number } = {};
      courses.forEach(course => {
        categoryCount[course.category] = (categoryCount[course.category] || 0) + 1;
      });

      const result = Object.entries(categoryCount).map(([category, count]) => ({
        category,
        count,
      }));

      this.logger.debug(`Found ${result.length} categories`, 'CoursePrismaService');
      return result;
    } catch (error) {
      this.logger.error(`Failed to get categories with count`, 'CoursePrismaService', error.stack);
      throw error;
    }
  }
}