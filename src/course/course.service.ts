import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CourseCatalogQueryDto } from './dto/get-catalog.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { CourseStatus } from '../../generated/prisma';

export interface CourseModule {
  id: string;
  title: string;
}

export interface FilteredCourse {
  courseId: string;
  title: string;
  instructor: string;
  rating: number;
  category: string;
  coverImageUrl: string;
  description: string;
  price: number;
  difficulty: string;
  moduleCount: number;
  modules: CourseModule[];
}

@Injectable()
export class CourseService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all published and active courses (basic catalog)
   */
  async getCatalog(filters: CourseCatalogQueryDto) {
    const courses = await this.databaseService.course.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        ...(filters.category && { category: filters.category }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.duration && { estimatedHours: { lte: filters.duration } }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        difficulty: true,
        estimatedHours: true,
        thumbnailUrl: true,
        instructor: { select: { name: true } },
        modules: { select: { id: true } },
      },
    });

    return {
      status: 'success',
      data: {
        courses: courses.map((course) => ({
          courseId: course.id,
          title: course.title,
          instructor: course.instructor.name,
          duration: course.estimatedHours,
          category: course.category,
          coverImageUrl: course.thumbnailUrl,
          description: course.description,
          price: course.price,
          difficulty: course.difficulty,
          moduleCount: course.modules.length,
        })),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get full course structure (modules + lessons)
   */
  async getStructure(courseId: string) {
    const course = await this.databaseService.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    return {
      status: 'success',
      data: {
        courseId: course.id,
        title: course.title,
        modules: course.modules.map((module) => ({
          id: module.id,
          title: module.title,
          order: module.order,
          lessons: module.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            url: lesson.url,
            order: lesson.order,
          })),
        })),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get filtered catalog by category, difficulty, or duration
   */
  async getFilteredCatalog(filterDto: CourseFilterDto): Promise<FilteredCourse[]> {
    const { category, difficulty, duration } = filterDto;
    const where: {
      category?: string;
      difficulty?: string;
      estimatedHours?: { lte: number };
      isActive?: boolean;
      status?: CourseStatus;
    } = {
      isActive: true,
      status: CourseStatus.PUBLISHED,
    };

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (duration) where.estimatedHours = { lte: duration };

    const courses = await this.databaseService.course.findMany({
      where,
      include: {
        instructor: true,
        modules: { select: { id: true, title: true } },
      },
    });

    return courses.map((course): FilteredCourse => ({
      courseId: course.id,
      title: course.title,
      instructor: course.instructor.name,
      rating: course.rating ?? 0,
      category: course.category,
      coverImageUrl: course.thumbnailUrl ?? '',
      description: course.description,
      price: course.price?.toNumber() ?? 0,
      difficulty: course.difficulty ?? '',
      moduleCount: course.modules.length,
      modules: course.modules.map((module): CourseModule => ({
        id: module.id,
        title: module.title,
      })),
    }));
  }
}
