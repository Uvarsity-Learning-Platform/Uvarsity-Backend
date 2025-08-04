import { Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { DatabaseService } from 'src/database/database.service';
import { GetCatalogDto } from './dto/get-catalog.dto';

@Injectable()
export class CourseService {
  constructor(private readonly databaseService: DatabaseService) {}

  async geCatalog(filter: GetCatalogDto) {
    const courses = await this.databaseService.course.findMany({
      where: {
        isActive: true
        category: filter.category,
      },
      include: {
        modules: true,
        instructor: true,
      },
    });

    return courses.map((course) => ({
      courseId: course.id,
      title: course.title,
      instructor: course.instructor.name,
      rating: 4.5, // Placeholder - calculate or store separately
      duration: 120, // Placeholder - calculate total lesson duration
      category: course.category,
      coverImageUrl: 'https://example.com/cover.jpg', // Add a field for this
      description: course.description,
      price: 49.99, // Add to your model
      difficulty: 'Beginner', // Add to your model
      moduleCount: course.modules.length,
    }));
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
