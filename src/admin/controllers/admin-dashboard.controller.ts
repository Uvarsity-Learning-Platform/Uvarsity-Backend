import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../guards/admin.guard';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { AdminDashboardStatsDto, AdminAnalyticsQueryDto } from '../dto/admin-dashboard.dto';
import { AdminOnly } from '../decorators/role.decorator';

/**
 * Admin Dashboard Controller
 * 
 * Provides dashboard analytics and statistics for admin panel:
 * - Overall platform statistics
 * - User engagement metrics
 * - Course performance analytics
 * - Revenue and enrollment trends
 * - System health monitoring
 */
@ApiTags('Admin - Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminGuard)
@ApiBearerAuth()
@AdminOnly()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /**
   * Get comprehensive dashboard statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats(@Query() statsDto: AdminDashboardStatsDto) {
    return await this.adminDashboardService.getDashboardStats(statsDto);
  }

  /**
   * Get analytics data for charts and graphs
   */
  @Get('analytics')
  @ApiOperation({ summary: 'Get analytics data for charts and graphs' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved successfully' })
  async getAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics(queryDto);
  }

  /**
   * Get system health metrics
   */
  @Get('health')
  @ApiOperation({ summary: 'Get system health metrics' })
  @ApiResponse({ status: 200, description: 'System health metrics retrieved successfully' })
  async getSystemHealth() {
    return await this.adminDashboardService.getSystemHealth();
  }

  /**
   * Get user growth analytics
   */
  @Get('analytics/user-growth')
  @ApiOperation({ summary: 'Get user growth analytics' })
  @ApiResponse({ status: 200, description: 'User growth analytics retrieved successfully' })
  async getUserGrowthAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics({
      ...queryDto,
      metric: 'users',
    });
  }

  /**
   * Get course creation analytics
   */
  @Get('analytics/course-creation')
  @ApiOperation({ summary: 'Get course creation analytics' })
  @ApiResponse({ status: 200, description: 'Course creation analytics retrieved successfully' })
  async getCourseCreationAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics({
      ...queryDto,
      metric: 'courses',
    });
  }

  /**
   * Get enrollment trends analytics
   */
  @Get('analytics/enrollment-trends')
  @ApiOperation({ summary: 'Get enrollment trends analytics' })
  @ApiResponse({ status: 200, description: 'Enrollment trends analytics retrieved successfully' })
  async getEnrollmentTrendsAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics({
      ...queryDto,
      metric: 'enrollments',
    });
  }

  /**
   * Get certificate issuance analytics
   */
  @Get('analytics/certificate-issuance')
  @ApiOperation({ summary: 'Get certificate issuance analytics' })
  @ApiResponse({ status: 200, description: 'Certificate issuance analytics retrieved successfully' })
  async getCertificateIssuanceAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics({
      ...queryDto,
      metric: 'certificates',
    });
  }

  /**
   * Get user engagement analytics
   */
  @Get('analytics/user-engagement')
  @ApiOperation({ summary: 'Get user engagement analytics' })
  @ApiResponse({ status: 200, description: 'User engagement analytics retrieved successfully' })
  async getUserEngagementAnalytics(@Query() queryDto: AdminAnalyticsQueryDto) {
    return await this.adminDashboardService.getAnalytics({
      ...queryDto,
      metric: 'engagement',
    });
  }

  /**
   * Get quick overview stats for dashboard cards
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get quick overview stats for dashboard cards' })
  @ApiResponse({ status: 200, description: 'Overview stats retrieved successfully' })
  async getOverviewStats(@Query() statsDto: AdminDashboardStatsDto) {
    const stats = await this.adminDashboardService.getDashboardStats(statsDto);
    
    return {
      totalUsers: stats.overview.totalUsers,
      totalCourses: stats.overview.totalCourses,
      totalEnrollments: stats.overview.totalEnrollments,
      totalCertificates: stats.overview.totalCertificates,
      activeUsers: stats.overview.activeUsers,
      completionRate: stats.overview.completionRate,
      newUsers: stats.period.newUsers,
      newCourses: stats.period.newCourses,
      newEnrollments: stats.period.newEnrollments,
      newCertificates: stats.period.newCertificates,
    };
  }

  /**
   * Get recent activity for dashboard
   */
  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity for dashboard' })
  @ApiResponse({ status: 200, description: 'Recent activity retrieved successfully' })
  async getRecentActivity(@Query() statsDto: AdminDashboardStatsDto) {
    const stats = await this.adminDashboardService.getDashboardStats(statsDto);
    
    return {
      recentActivity: stats.recentActivity,
      popularCourses: stats.popularCourses,
    };
  }
}