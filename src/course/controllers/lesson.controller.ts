import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { LessonService } from '../services/lesson.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { UpdateLessonDto } from '../dto/update-course.dto';

/**
 * Lesson Controller for Stellr Academy Backend
 * 
 * This controller handles lesson-specific HTTP endpoints:
 * - Lesson content access
 * - Lesson management for instructors
 * - Lesson progress tracking
 */
@ApiTags('Lessons')
@Controller('lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  // === PUBLIC LESSON ENDPOINTS ===

  /**
   * Get lesson by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get lesson details',
    description: 'Get detailed information about a specific lesson',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied to lesson',
  })
  async getLesson(@Param('id') lessonId: string, @Request() req) {
    const userId = req.user?.id;
    const lesson = await this.lessonService.getLessonById(lessonId, userId);
    return lesson.getDisplayInfo();
  }

  // === AUTHENTICATED LESSON ENDPOINTS ===

  /**
   * Get lesson content for study
   */
  @Get(':id/content')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lesson content',
    description: 'Get full lesson content for studying (enrolled users only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson content retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - not enrolled in course',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async getLessonContent(@Param('id') lessonId: string, @Request() req) {
    const userId = req.user.id;
    return this.lessonService.getLessonContent(lessonId, userId);
  }

  /**
   * Update lesson
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lesson',
    description: 'Update an existing lesson (instructor only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async updateLesson(
    @Param('id') lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Request() req,
  ) {
    const instructorId = req.user.id;
    return this.lessonService.updateLesson(lessonId, updateLessonDto, instructorId);
  }

  /**
   * Delete lesson
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete lesson',
    description: 'Delete a lesson (instructor only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Lesson deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async deleteLesson(@Param('id') lessonId: string, @Request() req) {
    const instructorId = req.user.id;
    await this.lessonService.deleteLesson(lessonId, instructorId);
  }

  /**
   * Publish lesson
   */
  @Put(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish lesson',
    description: 'Publish a lesson to make it available for students',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson published successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not course owner',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async publishLesson(@Param('id') lessonId: string, @Request() req) {
    const instructorId = req.user.id;
    return this.lessonService.publishLesson(lessonId, instructorId);
  }
}