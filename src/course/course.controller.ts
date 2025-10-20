import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { MediaService } from '../media/services/media.service';

@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly mediaService: MediaService,
  ) {}

  // ================== PUBLIC COURSE ENDPOINTS ==================

  @Get()
  async getAllCourses(
    @Res() response: Response,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('category') category?: string,
    @Query('level') level?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    try {
      const result = await this.courseService.findAllCourses(
        parseInt(page),
        parseInt(limit),
        category,
        level,
        search,
        minPrice ? parseFloat(minPrice) : undefined,
        maxPrice ? parseFloat(maxPrice) : undefined,
      );

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: error.message || 'Failed to fetch courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('categories')
  async getCourseCategories(@Res() response: Response) {
    try {
      const categories = await this.courseService.getCourseCategories();

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: { categories },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: 'Failed to fetch categories',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('levels')
  async getCourseLevels(@Res() response: Response) {
    try {
      const levels = await this.courseService.getCourseLevels();

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: { levels },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: 'Failed to fetch levels',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get(':id')
  async getCourseById(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const userId = (request.user as any)?.userId; // Optional user for enrollment check
      const course = await this.courseService.findCourseById(id, userId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: { course },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to fetch course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ================== INSTRUCTOR COURSE MANAGEMENT ==================

  @Post()
  @UseGuards(JwtAuthGuard)
  async createCourse(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.createCourse(instructorId, createCourseDto);

      return response.status(HttpStatus.CREATED).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to create course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('thumbnail'))
  async uploadCourseThumbnail(
    @Param('id') courseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      
      if (!file) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          status: 'error',
          data: null,
          error: {
            errorCode: 400,
            message: 'No file provided',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Upload to cloudinary
      const uploadResult = await this.mediaService.uploadFile(file, `courses/${courseId}/thumbnail`, instructorId);
      
      // Update course with thumbnail URL
      const result = await this.courseService.updateCourse(courseId, instructorId, {
        thumbnail: uploadResult.url,
      });

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          message: 'Thumbnail uploaded successfully',
          thumbnailUrl: uploadResult.url,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to upload thumbnail',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateCourse(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.updateCourse(id, instructorId, updateCourseDto);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to update course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publishCourse(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.publishCourse(id, instructorId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to publish course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteCourse(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.deleteCourse(id, instructorId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to delete course',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('instructor/my-courses')
  @UseGuards(JwtAuthGuard)
  async getInstructorCourses(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.getCoursesByInstructor(
        instructorId,
        parseInt(page),
        parseInt(limit),
      );

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        data: null,
        error: {
          errorCode: 500,
          message: error.message || 'Failed to fetch instructor courses',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ================== MODULE MANAGEMENT ==================

  @Post(':courseId/modules')
  @UseGuards(JwtAuthGuard)
  async createModule(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: CreateModuleDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.createModule(courseId, instructorId, createModuleDto);

      return response.status(HttpStatus.CREATED).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to create module',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Patch('modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() updateData: Partial<CreateModuleDto>,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.updateModule(moduleId, instructorId, updateData);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to update module',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete('modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  async deleteModule(
    @Param('moduleId') moduleId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.deleteModule(moduleId, instructorId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to delete module',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ================== LESSON MANAGEMENT ==================

  @Post('modules/:moduleId/lessons')
  @UseGuards(JwtAuthGuard)
  async createLesson(
    @Param('moduleId') moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.createLesson(moduleId, instructorId, createLessonDto);

      return response.status(HttpStatus.CREATED).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to create lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('lessons/:lessonId/video')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('video'))
  async uploadLessonVideo(
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;

      if (!file) {
        return response.status(HttpStatus.BAD_REQUEST).json({
          status: 'error',
          data: null,
          error: {
            errorCode: 400,
            message: 'No video file provided',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Upload video to cloudinary
      const uploadResult = await this.mediaService.uploadFile(file, `lessons/${lessonId}/video`, instructorId);

      // Update lesson with video URL
      const result = await this.courseService.updateLesson(lessonId, instructorId, {
        videoUrl: uploadResult.url,
      });

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          message: 'Video uploaded successfully',
          videoUrl: uploadResult.url,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to upload video',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Patch('lessons/:lessonId')
  @UseGuards(JwtAuthGuard)
  async updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() updateData: Partial<CreateLessonDto>,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.updateLesson(lessonId, instructorId, updateData);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to update lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Delete('lessons/:lessonId')
  @UseGuards(JwtAuthGuard)
  async deleteLesson(
    @Param('lessonId') lessonId: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    try {
      const instructorId = (request.user as { userId: string }).userId;
      const result = await this.courseService.deleteLesson(lessonId, instructorId);

      return response.status(HttpStatus.OK).json({
        status: 'success',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      return response.status(statusCode).json({
        status: 'error',
        data: null,
        error: {
          errorCode: statusCode,
          message: error.message || 'Failed to delete lesson',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
