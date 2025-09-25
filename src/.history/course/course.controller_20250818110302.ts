import {
  Get
  Controller,
  Get,
  Body,
  Query,
  InternalServerErrorException,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseCatalogQueryDto } from './dto/get-catalog.dto';

@Controller('courses/catalog')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('list')
  async getCatalog(@Query() query: CourseCatalogQueryDto) {
    try {
      const courses = await this.courseService.getFilteredCatalog(query);

      return {
        status: 'success',
        data: { courses },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Handle error
      console.error('Server error:', error);

      throw new InternalServerErrorException({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: 'Sever error occurred',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
