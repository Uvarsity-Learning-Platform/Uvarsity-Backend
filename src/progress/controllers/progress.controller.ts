import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ProgressService } from '../services/progress.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Progress Controller for Uvarsity Backend
 * 
 * This controller handles learning progress tracking:
 * - Lesson progress tracking
 * - Course completion tracking
 * - Learning analytics
 * - Progress reporting
 */
@ApiTags('Progress')
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * Start lesson progress tracking
   */
  @Post('lessons/:lessonId/start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Start lesson progress',
    description: 'Start tracking progress for a lesson',
  })
  @ApiResponse({
    status: 201,
    description: 'Progress tracking started',
  })
  async startLesson(@Param('lessonId') lessonId: string, @Request() req) {
    const userId = req.user.id;
    return this.progressService.startLesson(userId, lessonId);
  }

  /**
   * Update lesson progress
   */
  @Put('lessons/:lessonId/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update lesson progress',
    description: 'Update progress for a lesson',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress updated',
  })
  async updateProgress(
    @Param('lessonId') lessonId: string,
    @Body() updateData: {
      position: number;
      progressPercentage: number;
      timeSpent?: number;
    },
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.progressService.updateProgress(
      userId,
      lessonId,
      updateData.position,
      updateData.progressPercentage,
      updateData.timeSpent,
    );
  }

  /**
   * Mark lesson as completed
   */
  @Post('lessons/:lessonId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete lesson',
    description: 'Mark a lesson as completed',
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson marked as completed',
  })
  async completeLesson(@Param('lessonId') lessonId: string, @Request() req) {
    const userId = req.user.id;
    return this.progressService.completeLesson(userId, lessonId);
  }

  /**
   * Get course progress
   */
  @Get('courses/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get course progress',
    description: 'Get user progress for a specific course',
  })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved',
  })
  async getCourseProgress(@Param('courseId') courseId: string, @Request() req) {
    const userId = req.user.id;
    return this.progressService.getCourseProgress(userId, courseId);
  }

  /**
   * Get user learning analytics
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get learning analytics',
    description: 'Get comprehensive learning analytics for the user',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved',
  })
  async getUserAnalytics(@Request() req) {
    const userId = req.user.id;
    return this.progressService.getUserAnalytics(userId);
  }
}