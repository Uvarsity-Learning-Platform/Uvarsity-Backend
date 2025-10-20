import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { MediaService } from '../media/services/media.service';

@Injectable()
export class CourseService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly mediaService: MediaService,
  ) {}

  // ================== COURSE OPERATIONS ==================

  async createCourse(instructorId: string, createCourseDto: CreateCourseDto) {
    try {
      const course = await this.databaseService.course.create({
        data: {
          title: createCourseDto.title,
          description: createCourseDto.description,
          shortDescription: createCourseDto.shortDescription,
          price: createCourseDto.price,
          category: createCourseDto.category,
          level: createCourseDto.level,
          thumbnailUrl: createCourseDto.thumbnail,
          tags: createCourseDto.tags || [],
          learningObjectives: createCourseDto.learningObjectives || [],
          isPublished: createCourseDto.isPublished || false,
          instructorId,
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      });

      return {
        message: 'Course created successfully',
        course,
      };
    } catch (error) {
      console.error('Course creation error:', error);
      throw new BadRequestException(`Failed to create course: ${error.message}`);
    }
  }

  async findAllCourses(
    page = 1, 
    limit = 10, 
    category?: string, 
    level?: string,
    search?: string,
    minPrice?: number,
    maxPrice?: number,
    isPublished = true
  ) {
    const skip = (page - 1) * limit;
    
    const where: any = { isPublished };
    
    if (category) where.category = category;
    if (level) where.level = level;
    if (minPrice !== undefined) where.price = { gte: minPrice };
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    try {
      const [courses, total] = await Promise.all([
        this.databaseService.course.findMany({
          where,
          skip,
          take: limit,
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.databaseService.course.count({ where }),
      ]);

      return {
        courses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('Find courses error:', error);
      throw new BadRequestException('Failed to fetch courses');
    }
  }

  async findCourseById(id: string, userId?: string) {
    try {
      const course = await this.databaseService.course.findUnique({
        where: { id },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          enrollments: userId ? {
            where: { userId },
            select: {
              id: true,
            },
          } : false,
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      return {
        ...course,
        totalDuration: 0, // Will be calculated when modules are implemented
        totalLessons: 0,  // Will be calculated when modules are implemented
        isEnrolled: userId ? (course.enrollments as any[]).length > 0 : false,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Find course by ID error:', error);
      throw new BadRequestException('Failed to fetch course');
    }
  }

  async updateCourse(id: string, instructorId: string, updateCourseDto: UpdateCourseDto) {
    try {
      // Verify ownership
      const course = await this.databaseService.course.findFirst({
        where: { id, instructorId },
      });

      if (!course) {
        throw new NotFoundException('Course not found or access denied');
      }

      const updateData: any = {};
      
      // Only update fields that are provided
      if (updateCourseDto.title !== undefined) updateData.title = updateCourseDto.title;
      if (updateCourseDto.description !== undefined) updateData.description = updateCourseDto.description;
      if (updateCourseDto.shortDescription !== undefined) updateData.shortDescription = updateCourseDto.shortDescription;
      if (updateCourseDto.price !== undefined) updateData.price = updateCourseDto.price;
      if (updateCourseDto.category !== undefined) updateData.category = updateCourseDto.category;
      if (updateCourseDto.level !== undefined) updateData.level = updateCourseDto.level;
      if (updateCourseDto.level !== undefined) updateData.level = updateCourseDto.level;
      if (updateCourseDto.thumbnail !== undefined) updateData.thumbnailUrl = updateCourseDto.thumbnail;
      if (updateCourseDto.tags !== undefined) updateData.tags = updateCourseDto.tags;
      if (updateCourseDto.isPublished !== undefined) updateData.isPublished = updateCourseDto.isPublished;

      const updatedCourse = await this.databaseService.course.update({
        where: { id },
        data: updateData,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        message: 'Course updated successfully',
        course: updatedCourse,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Update course error:', error);
      throw new BadRequestException('Failed to update course');
    }
  }

  async deleteCourse(id: string, instructorId: string) {
    try {
      const course = await this.databaseService.course.findFirst({
        where: { id, instructorId },
        include: {
          enrollments: true,
        },
      });

      if (!course) {
        throw new NotFoundException('Course not found or access denied');
      }

      // Check if course has enrollments
      if (course.enrollments && course.enrollments.length > 0) {
        throw new BadRequestException('Cannot delete course with active enrollments');
      }

      await this.databaseService.course.delete({
        where: { id },
      });

      return { message: 'Course deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Delete course error:', error);
      throw new BadRequestException('Failed to delete course');
    }
  }

  async publishCourse(id: string, instructorId: string) {
    try {
      const course = await this.databaseService.course.findFirst({
        where: { id, instructorId },
      });

      if (!course) {
        throw new NotFoundException('Course not found or access denied');
      }

      // Basic validation - you can add more checks when modules are implemented
      if (!course.title || !course.description) {
        throw new BadRequestException('Course must have title and description before publishing');
      }

      const updatedCourse = await this.databaseService.course.update({
        where: { id },
        data: { isPublished: true },
      });

      return {
        message: 'Course published successfully',
        course: updatedCourse,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Publish course error:', error);
      throw new BadRequestException('Failed to publish course');
    }
  }

  // ================== MODULE OPERATIONS ==================
  // Note: These methods will work once you add the Module model to your Prisma schema

  async createModule(courseId: string, instructorId: string, createModuleDto: CreateModuleDto) {
    try {
      // Verify course ownership
      const course = await this.databaseService.course.findFirst({
        where: { id: courseId, instructorId },
      });

      if (!course) {
        throw new ForbiddenException('Course not found or access denied');
      }

      // This will work once you add Module to your schema
      const module = await this.databaseService.module.create({
        data: {
          title: createModuleDto.title,
          description: createModuleDto.description,
          order: createModuleDto.order,
          courseId,
        },
      });

      return {
        message: 'Module created successfully',
        module,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Create module error:', error);
      throw new BadRequestException('Failed to create module');
    }
  }

  async updateModule(moduleId: string, instructorId: string, updateData: Partial<CreateModuleDto>) {
    try {
      // This will work once you add Module to your schema
      const module = await this.databaseService.module.findFirst({
        where: {
          id: moduleId,
          course: {
            instructorId,
          },
        },
      });

      if (!module) {
        throw new ForbiddenException('Module not found or access denied');
      }

      const updatedModule = await this.databaseService.module.update({
        where: { id: moduleId },
        data: updateData,
      });

      return {
        message: 'Module updated successfully',
        module: updatedModule,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Update module error:', error);
      throw new BadRequestException('Failed to update module');
    }
  }

  async deleteModule(moduleId: string, instructorId: string) {
    try {
      const module = await this.databaseService.module.findFirst({
        where: {
          id: moduleId,
          course: {
            instructorId,
          },
        },
      });

      if (!module) {
        throw new ForbiddenException('Module not found or access denied');
      }

      await this.databaseService.module.delete({
        where: { id: moduleId },
      });

      return { message: 'Module deleted successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Delete module error:', error);
      throw new BadRequestException('Failed to delete module');
    }
  }

  // ================== LESSON OPERATIONS ==================
  // Note: These methods will work once you add the Lesson model to your Prisma schema

  async createLesson(moduleId: string, instructorId: string, createLessonDto: CreateLessonDto) {
    try {
      // Verify ownership through course
      const module = await this.databaseService.module.findFirst({
        where: {
          id: moduleId,
          course: {
            instructorId,
          },
        },
      });

      if (!module) {
        throw new ForbiddenException('Module not found or access denied');
      }

      const lesson = await this.databaseService.lesson.create({
        data: {
          title: createLessonDto.title,
          description: createLessonDto.description,
          shortDescription: createLessonDto.shortDescription,
          content: createLessonDto.content,
          videoUrl: createLessonDto.videoUrl,
          duration: createLessonDto.duration,
          order: createLessonDto.order,
          type: createLessonDto.type, 
          moduleId,
        },
      });

      return {
        message: 'Lesson created successfully',
        lesson,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Create lesson error:', error);
      throw new BadRequestException(`Failed to create lesson: ${error.message}`);
    }
  }

  async updateLesson(lessonId: string, instructorId: string, updateData: Partial<CreateLessonDto>) {
    try {
      const lesson = await this.databaseService.lesson.findFirst({
        where: {
          id: lessonId,
          module: {
            course: {
              instructorId,
            },
          },
        },
      });

      if (!lesson) {
        throw new ForbiddenException('Lesson not found or access denied');
      }

      const prismaUpdateData: any = {};
      if (updateData.title !== undefined) prismaUpdateData.title = updateData.title;
      if (updateData.description !== undefined) prismaUpdateData.description = updateData.description;
      if (updateData.content !== undefined) prismaUpdateData.content = updateData.content;
      if (updateData.videoUrl !== undefined) prismaUpdateData.videoUrl = updateData.videoUrl;
      if (updateData.duration !== undefined) prismaUpdateData.duration = updateData.duration;
      if (updateData.order !== undefined) prismaUpdateData.order = updateData.order;
      if (updateData.type !== undefined) prismaUpdateData.type = updateData.type;

      const updatedLesson = await this.databaseService.lesson.update({
        where: { id: lessonId },
        data: prismaUpdateData,
      });

      return {
        message: 'Lesson updated successfully',
        lesson: updatedLesson,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Update lesson error:', error);
      throw new BadRequestException('Failed to update lesson');
    }
  }

  async deleteLesson(lessonId: string, instructorId: string) {
    try {
      const lesson = await this.databaseService.lesson.findFirst({
        where: {
          id: lessonId,
          module: {
            course: {
              instructorId,
            },
          },
        },
      });

      if (!lesson) {
        throw new ForbiddenException('Lesson not found or access denied');
      }

      await this.databaseService.lesson.delete({
        where: { id: lessonId },
      });

      return { message: 'Lesson deleted successfully' };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Delete lesson error:', error);
      throw new BadRequestException('Failed to delete lesson');
    }
  }

  // ================== INSTRUCTOR OPERATIONS ==================

  async getCoursesByInstructor(instructorId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    try {
      const [courses, total] = await Promise.all([
        this.databaseService.course.findMany({
          where: { instructorId },
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.databaseService.course.count({
          where: { instructorId },
        }),
      ]);

      return {
        courses,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get instructor courses error:', error);
      throw new BadRequestException('Failed to fetch instructor courses');
    }
  }

  // ================== UTILITY METHODS ==================

  async getCourseCategories() {
    try {
      const categories = await this.databaseService.course.groupBy({
        by: ['category'],
        where: { isPublished: true },
        _count: {
          category: true,
        },
      });

      return categories.map(cat => ({
        name: cat.category,
        count: cat._count.category,
      }));
    } catch (error) {
      console.error('Get categories error:', error);
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  async getCourseLevels() {
    try {
      // Fetch all published courses and manually group by level
      const courses = await this.databaseService.course.findMany({
        where: { isPublished: true },
        select: { level: true },
      });

      const levelCounts = courses.reduce((acc, course) => {
        if (course.level) {
          acc[course.level] = (acc[course.level] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(levelCounts).map(([name, count]) => ({
        name,
        count,
      }));
    } catch (error) {
      console.error('Get levels error:', error);
      throw new BadRequestException('Failed to fetch levels');
    }
  }
}
