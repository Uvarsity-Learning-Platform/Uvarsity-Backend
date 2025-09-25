import {
  Controller,
  Get,
  Body,
  Query,
  InternalServerErrorException,
  Param,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseCatalogQueryDto } from './dto/get-catalog.dto';
import { error, time } from 'console';

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

  @Get(':id/structure')
  async getCourseStructure(@Param('id') courseId: string) {
    try {
      return await this.courseService.getStructure(courseId);
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw new HttpException(
          {
            status: 'error',
            data: null,
            error: {
              errorCode: 404,
              message: 'Course not found',
            },
            timestamp: new Date().toISOString(),
          },
          HttpStatus.NOT_FOUND,
        );
      }
    }
    throw error;
  }
}
