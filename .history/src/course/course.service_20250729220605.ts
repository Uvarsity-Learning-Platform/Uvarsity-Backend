import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DatabaseService } from 'src/database/database.service';
import { GetCatalogDto } from './dto/get-catalog.dto';

@Injectable()
export class CourseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getCatalog(filters: GetCatalogDto) {
    const courses = await this.databaseService.course.findMany({
      where: {
        isActive: true,
        ...(filters.category && { category: filters.category }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.duration && { estimatedHours: { lte: filters.duration } }),
        status: 'PUBLISHED',
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
        instructor: {
          select: { name: true },
        },
        modules: {
          select: { id: true },
        },
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
   * Get full course structure by ID
   */
  async getStructure(courseId: string) {
    const course = await this.databaseService.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return {
      status: 'success',
      data: {
        courseId: course.id,
        title: course.title,
        modules: course.modules.map(module => ({
          id: module.id,
          title: module.title,
          order: module.order,
          lessons: module.lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            type: lesson.type,
            url: lesson.url,
            order: lesson.order
          }))
        }))
      },
      timestamp: new Date().toISOString()
    };
  }

  create(CreateCourseDto: CreateCourseDto) {
    return 'This action adds a new course';
  }

  findAll() {
    return `This action returns all course`;
  }

  findOne(id: number) {
    return `This action returns a #${id} course`;
  }


  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
