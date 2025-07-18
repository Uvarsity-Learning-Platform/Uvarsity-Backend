import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminCourseService } from '../services/admin-course.service';
import { AdminCourseFilterDto, AdminCreateCourseDto, AdminUpdateCourseDto } from '../dto/admin-course.dto';
import { AdminBulkCourseOperationDto, AdminDashboardStatsDto } from '../dto/admin-dashboard.dto';
import { AdminOnly } from '../decorators/role.decorator';

/**
 * Admin Course Controller
 * 
 * Handles all course management operations for admin panel:
 * - Course listing and filtering
 * - Course creation and updates
 * - Course content management
 * - Bulk course operations
 * - Course statistics and analytics
 */
@ApiTags('Admin - Course Management')
@Controller('admin/courses')
@UseGuards(AdminGuard)
@ApiBearerAuth()
@AdminOnly()
export class AdminCourseController {
  constructor(private readonly adminCourseService: AdminCourseService) {}

  /**
   * Get paginated list of courses with filtering options
   */
  @Get()
  @ApiOperation({ summary: 'Get all courses with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getCourses(@Query() filterDto: AdminCourseFilterDto) {
    return await this.adminCourseService.getCourses(filterDto);
  }

  /**
   * Get detailed course information by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get course details by ID' })
  @ApiResponse({ status: 200, description: 'Course details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseById(@Param('id') id: string) {
    return await this.adminCourseService.getCourseById(id);
  }

  /**
   * Create a new course
   */
  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid course data' })
  @ApiResponse({ status: 409, description: 'Course title already exists' })
  async createCourse(@Body() createCourseDto: AdminCreateCourseDto) {
    return await this.adminCourseService.createCourse(createCourseDto);
  }

  /**
   * Update course information
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update course information' })
  @ApiResponse({ status: 200, description: 'Course updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 409, description: 'Course title already in use' })
  async updateCourse(@Param('id') id: string, @Body() updateCourseDto: AdminUpdateCourseDto) {
    return await this.adminCourseService.updateCourse(id, updateCourseDto);
  }

  /**
   * Delete course
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete course' })
  @ApiResponse({ status: 200, description: 'Course deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async deleteCourse(@Param('id') id: string) {
    return await this.adminCourseService.deleteCourse(id);
  }

  /**
   * Perform bulk operations on courses
   */
  @Post('bulk-operation')
  @ApiOperation({ summary: 'Perform bulk operations on courses' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed successfully' })
  @ApiResponse({ status: 404, description: 'No courses found' })
  async bulkCourseOperation(@Body() bulkOperationDto: AdminBulkCourseOperationDto) {
    return await this.adminCourseService.bulkCourseOperation(bulkOperationDto);
  }

  /**
   * Get course statistics for dashboard
   */
  @Get('stats/overview')
  @ApiOperation({ summary: 'Get course statistics for dashboard' })
  @ApiResponse({ status: 200, description: 'Course statistics retrieved successfully' })
  async getCourseStatistics(@Query() statsDto: AdminDashboardStatsDto) {
    return await this.adminCourseService.getCourseStatisticsForDashboard(statsDto);
  }

  /**
   * Get course categories for filtering
   */
  @Get('categories/list')
  @ApiOperation({ summary: 'Get list of course categories' })
  @ApiResponse({ status: 200, description: 'Course categories retrieved successfully' })
  async getCourseCategories() {
    return await this.adminCourseService.getCourseCategories();
  }

  /**
   * Publish course
   */
  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish course' })
  @ApiResponse({ status: 200, description: 'Course published successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async publishCourse(@Param('id') id: string) {
    return await this.adminCourseService.updateCourse(id, { status: 'published' });
  }

  /**
   * Unpublish course (set to draft)
   */
  @Put(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish course (set to draft)' })
  @ApiResponse({ status: 200, description: 'Course unpublished successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async unpublishCourse(@Param('id') id: string) {
    return await this.adminCourseService.updateCourse(id, { status: 'draft' });
  }

  /**
   * Archive course
   */
  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive course' })
  @ApiResponse({ status: 200, description: 'Course archived successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async archiveCourse(@Param('id') id: string) {
    return await this.adminCourseService.updateCourse(id, { status: 'archived' });
  }

  /**
   * Duplicate course
   */
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate course' })
  @ApiResponse({ status: 201, description: 'Course duplicated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async duplicateCourse(@Param('id') id: string, @Body() duplicateData: { title: string; instructorId?: string }) {
    const originalCourse = await this.adminCourseService.getCourseById(id);
    
    const duplicateDto: AdminCreateCourseDto = {
      title: duplicateData.title,
      description: originalCourse.description,
      summary: originalCourse.summary,
      category: originalCourse.category,
      tags: originalCourse.tags,
      level: originalCourse.level,
      estimatedDuration: originalCourse.estimatedDuration,
      language: originalCourse.language,
      prerequisites: originalCourse.prerequisites,
      learningObjectives: originalCourse.learningObjectives,
      instructorId: duplicateData.instructorId || originalCourse.instructorId,
      pricingType: originalCourse.pricing.type,
      price: originalCourse.pricing.price,
      currency: originalCourse.pricing.currency,
      autoPublish: false,
    };
    
    return await this.adminCourseService.createCourse(duplicateDto);
  }
}