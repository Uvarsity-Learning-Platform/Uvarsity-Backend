import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DatabaseService } from 'src/database/database.service';
import { GetCatalogDto } from './dto/get-catalog.dto';

@Injectable()
export class CourseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async geCatalog(filters: GetCatalogDto) {
    const courses = await this.databaseService.course.findMany({
      where: {
        isActive: true,
        ...(filters.category && { category: filters.category }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.duration && {
          estimatedHours: { lte: parseInt(filters.duration) },
        }),
        status: 'PUBLISHED',
      },select: {
        id: true,
        title: true,
        description: true,
        category: true,
        price: true,
        difficulty: true,
        estimatedHours: true,
        thumbnailUrl: true,
        instructor: {
          select: { name: true }
        },
      modules: {
        select: {id: true}
      },
    });

    return {
      status: 'success',
      data: {
        courses: courses.map(course => ({
          courseId: course.id,
          title: course.title,
          instructor: course.instructor.name,
          rating: 4.5, // Placeholder for actual rating logic
          duration: course.estimatedHours,
          category: course.category,
          coverImageUrl: course.thumbnailUrl,
          description: course.description,
          price: course.price,
          difficulty: course.difficulty,
          moduleCount: course.modules.length
        }))
      },
      timestamp: new Date().toISOString()
    };
  }
  create(createCourseDto: CreateCourseDto) {
    return 'This action adds a new course';
  }

  findAll() {
    return `This action returns all course`;
  }

  findOne(id: number) {
    return `This action returns a #${id} course`;
  }

  update(id: number, updateCourseDto: UpdateCourseDto) {
    return `This action updates a #${id} course`;
  }

  remove(id: number) {
    return `This action removes a #${id} course`;
  }
}
