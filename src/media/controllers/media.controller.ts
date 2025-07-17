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
  Response,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';

import { MediaService } from '../services/media.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Media Controller for Stellr Academy Backend
 * 
 * This controller handles all media-related HTTP endpoints:
 * - Media upload and processing
 * - Secure media streaming
 * - Media download and access
 * - Media analytics and management
 * - File organization and search
 */
@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // === MEDIA UPLOAD ENDPOINTS ===

  /**
   * Upload media file
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload media file',
    description: 'Upload a video, PDF, or image file',
  })
  @ApiResponse({
    status: 201,
    description: 'Media uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or file too large',
  })
  async uploadMedia(
    @UploadedFile() file: any, // Express.Multer.File
    @Body() uploadData: {
      lessonId?: string;
      title?: string;
      description?: string;
      accessControl?: any;
    },
    @Request() req,
  ) {
    const uploadedBy = req.user.id;
    const media = await this.mediaService.uploadMedia(file, uploadedBy, uploadData);
    return media.getDisplayInfo();
  }

  /**
   * Get media by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get media details',
    description: 'Get media information by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Media retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async getMedia(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id;
    const media = await this.mediaService.getMediaById(id, userId);
    return media.getAccessInfo(userId);
  }

  /**
   * Stream media file
   */
  @Get(':id/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Stream media file',
    description: 'Stream video or audio file',
  })
  @ApiResponse({
    status: 200,
    description: 'Media streamed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async streamMedia(
    @Param('id') id: string,
    @Request() req,
    @Response() res: ExpressResponse,
  ) {
    const userId = req.user?.id;
    const { stream, media } = await this.mediaService.streamMedia(id, userId);
    
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', stream.length);
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(stream);
  }

  /**
   * Download media file
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download media file',
    description: 'Download media file',
  })
  @ApiResponse({
    status: 200,
    description: 'Media downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async downloadMedia(
    @Param('id') id: string,
    @Request() req,
    @Response() res: ExpressResponse,
  ) {
    const userId = req.user?.id;
    const { buffer, media } = await this.mediaService.downloadMedia(id, userId);
    
    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${media.originalFilename}"`);
    res.send(buffer);
  }

  /**
   * Get lesson media
   */
  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get lesson media',
    description: 'Get all media files for a lesson',
  })
  @ApiResponse({
    status: 200,
    description: 'Media retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async getLessonMedia(@Param('lessonId') lessonId: string, @Request() req) {
    const userId = req.user?.id;
    const media = await this.mediaService.getLessonMedia(lessonId, userId);
    return media.map(m => m.getDisplayInfo());
  }

  /**
   * Update media information
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update media',
    description: 'Update media information (uploader only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Media updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not media uploader',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async updateMedia(
    @Param('id') id: string,
    @Body() updateData: any,
    @Request() req,
  ) {
    const userId = req.user.id;
    const media = await this.mediaService.updateMedia(id, updateData, userId);
    return media.getDisplayInfo();
  }

  /**
   * Delete media
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete media',
    description: 'Delete media file (uploader only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Media deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not media uploader',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async deleteMedia(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    await this.mediaService.deleteMedia(id, userId);
  }

  /**
   * Get media analytics
   */
  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get media analytics',
    description: 'Get media usage analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Media not found',
  })
  async getMediaAnalytics(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    return this.mediaService.getMediaAnalytics(id, userId);
  }

  /**
   * Search media
   */
  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search media',
    description: 'Search media files by title or description',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
  })
  async searchMedia(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('lessonId') lessonId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Request() req,
  ) {
    const userId = req.user?.id;
    const media = await this.mediaService.searchMedia(query, {
      type,
      lessonId,
      userId,
      limit,
      offset,
    });
    return media.map(m => m.getDisplayInfo());
  }

  /**
   * Get user's media
   */
  @Get('user/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user media',
    description: 'Get current user\'s uploaded media',
  })
  @ApiResponse({
    status: 200,
    description: 'Media retrieved successfully',
  })
  async getUserMedia(@Request() req, @Query('type') type?: string) {
    const userId = req.user.id;
    const media = await this.mediaService.getUserMedia(userId, type);
    return media.map(m => m.getDisplayInfo());
  }
}