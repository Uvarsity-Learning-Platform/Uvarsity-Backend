import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CourseService } from '../services/course.service';
import { LessonService } from '../services/lesson.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateLessonDto } from '../dto/create-lesson.dto';
import { UpdateCourseDto } from '../dto/update-course.dto';
import { CourseQueryDto, EnrollmentQueryDto } from '../dto/query-course.dto';

/**
 * Course Controller for Uvarsity Backend
 * 
 * This controller handles all course-related HTTP endpoints:
 * - Course catalog and search
 * - Course creation and management
 * - Course enrollment and access
 * - Lesson management within courses
 * - Course progress tracking
 */
@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(
    private readonly courseService: CourseService,
    private readonly lessonService: LessonService,
  ) {}

  // === PUBLIC COURSE ENDPOINTS ===

  /**
   * Get all courses with filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get courses catalog',
    description: 'Get paginated list of courses with filtering and search capabilities',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  async getCourses(@Query() queryDto: CourseQueryDto) {
    return this.courseService.getCourses(queryDto);
  }

  /**
   * Get course by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get course details',
    description: 'Get detailed information about a specific course',
  })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourse(@Param('id') courseId: string) {
    const course = await this.courseService.getCourseById(courseId);
    return course.getDisplayInfo();
  }

  /**
   * Get course categories
   */
  @Get('categories/list')
  @ApiOperation({
    summary: 'Get course categories',
    description: 'Get list of available course categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCourseCategories() {
    return this.courseService.getCourseCategories();
  }

  /**
   * Get course statistics
   */
  @Get('stats/overview')
  @ApiOperation({
    summary: 'Get course statistics',
    description: 'Get overall course platform statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getCourseStats() {
    return this.courseService.getCourseStats();
  }

  // === AUTHENTICATED COURSE ENDPOINTS ===

  /**
   * Create a new course
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new course',
    description: 'Create a new course as an instructor',
  })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createCourse(@Body() createCourseDto: CreateCourseDto, @Request() req) {
    const instructorId = req.user.id;
    return this.courseService.createCourse(createCourseDto, instructorId);
  }

  /**
   * Update course
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update course',
    description: 'Update an existing course (instructor only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async updateCourse(
    @Param('id') courseId: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req,
  ) {
    const instructorId = req.user.id;
    return this.courseService.updateCourse(courseId, updateCourseDto, instructorId);
  }

  /**
   * Delete course
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete course',
    description: 'Delete a course (instructor only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Course deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async deleteCourse(@Param('id') courseId: string, @Request() req) {
    const instructorId = req.user.id;
    await this.courseService.deleteCourse(courseId, instructorId);
  }

  /**
   * Publish course
   */
  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish course',
    description: 'Publish a course to make it available for enrollment',
  })
  @ApiResponse({
    status: 200,
    description: 'Course published successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async publishCourse(@Param('id') courseId: string, @Request() req) {
    const instructorId = req.user.id;
    return this.courseService.publishCourse(courseId, instructorId);
  }

  /**
   * Enroll in course
   */
  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enroll in course',
    description: 'Enroll the current user in a course',
  })
  @ApiResponse({
    status: 201,
    description: 'Enrolled successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Enrollment not allowed or user already enrolled',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async enrollInCourse(@Param('id') courseId: string, @Request() req) {
    const userId = req.user.id;
    return this.courseService.enrollInCourse(courseId, userId);
  }

  /**
   * Get user's enrollments
   */
  @Get('enrollments/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user enrollments',
    description: 'Get current user\'s course enrollments',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
  })
  async getUserEnrollments(@Query() queryDto: EnrollmentQueryDto, @Request() req) {
    const userId = req.user.id;
    return this.courseService.getUserEnrollments(userId, queryDto);
  }

  // === LESSON ENDPOINTS ===

  /**
   * Get course lessons
   */
  @Get(':id/lessons')
  @ApiOperation({
    summary: 'Get course lessons',
    description: 'Get lessons for a specific course',
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseLessons(@Param('id') courseId: string, @Request() req) {
    const userId = req.user?.id;
    const lessons = await this.lessonService.getCourseLessons(courseId, userId);
    return lessons.map(lesson => lesson.getDisplayInfo());
  }

  /**
   * Create lesson
   */
  @Post(':id/lessons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create lesson',
    description: 'Create a new lesson in a course (instructor only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Lesson created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async createLesson(
    @Param('id') courseId: string,
    @Body() createLessonDto: CreateLessonDto,
    @Request() req,
  ) {
    const instructorId = req.user.id;
    return this.lessonService.createLesson(courseId, createLessonDto, instructorId);
  }

  /**
   * Reorder lessons
   */
  @Put(':id/lessons/reorder')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reorder lessons',
    description: 'Reorder lessons in a course (instructor only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons reordered successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async reorderLessons(
    @Param('id') courseId: string,
    @Body() lessonOrders: { lessonId: string; order: number }[],
    @Request() req,
  ) {
    const instructorId = req.user.id;
    await this.lessonService.reorderLessons(courseId, lessonOrders, instructorId);
    return { message: 'Lessons reordered successfully' };
  }
}