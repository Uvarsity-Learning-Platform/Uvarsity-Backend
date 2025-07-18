import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { CourseEnrollment } from '../../course/entities/course-enrollment.entity';
import { AdminDashboardStatsDto, AdminAnalyticsQueryDto } from '../dto/admin-dashboard.dto';
import { LoggerService } from '../../common/services/logger.service';

/**
 * Admin Dashboard Service
 * 
 * Provides analytics and statistics for the admin dashboard:
 * - Overall platform statistics
 * - User engagement metrics
 * - Course performance analytics
 * - Revenue and enrollment trends
 * - Real-time dashboard data
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(statsDto: AdminDashboardStatsDto) {
    const { range = '30d', startDate, endDate } = statsDto;
    
    const dateRange = this.getDateRange(range, startDate, endDate);
    
    // Get overall platform statistics
    const totalUsers = await this.userRepository.count();
    const totalCourses = await this.courseRepository.count();
    const totalEnrollments = await this.enrollmentRepository.count();
    const totalCertificates = await this.enrollmentRepository.count({
      where: { certificateIssuedAt: Not(IsNull()) },
    });
    
    // Get active users (users who logged in within the last 30 days)
    const activeUsersCount = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastActiveAt >= :thirtyDaysAgo', { thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
      .getCount();
    
    // Get new users in the specified period
    const newUsersQuery = this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :startDate', { startDate: dateRange.start });
    
    if (dateRange.end) {
      newUsersQuery.andWhere('user.createdAt <= :endDate', { endDate: dateRange.end });
    }
    
    const newUsers = await newUsersQuery.getCount();
    
    // Get new courses in the specified period
    const newCoursesQuery = this.courseRepository
      .createQueryBuilder('course')
      .where('course.createdAt >= :startDate', { startDate: dateRange.start });
    
    if (dateRange.end) {
      newCoursesQuery.andWhere('course.createdAt <= :endDate', { endDate: dateRange.end });
    }
    
    const newCourses = await newCoursesQuery.getCount();
    
    // Get new enrollments in the specified period
    const newEnrollmentsQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.createdAt >= :startDate', { startDate: dateRange.start });
    
    if (dateRange.end) {
      newEnrollmentsQuery.andWhere('enrollment.createdAt <= :endDate', { endDate: dateRange.end });
    }
    
    const newEnrollments = await newEnrollmentsQuery.getCount();
    
    // Get certificates issued in the specified period
    const newCertificatesQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('enrollment.certificateIssuedAt >= :startDate', { startDate: dateRange.start });
    
    if (dateRange.end) {
      newCertificatesQuery.andWhere('enrollment.certificateIssuedAt <= :endDate', { endDate: dateRange.end });
    }
    
    const newCertificates = await newCertificatesQuery.getCount();
    
    // Get completion statistics
    const completedEnrollments = await this.enrollmentRepository.count({
      where: { isCompleted: true },
    });
    
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    
    // Get user distribution by role
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role, COUNT(*) as count')
      .groupBy('user.role')
      .getRawMany();
    
    // Get course distribution by status
    const coursesByStatus = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.status, COUNT(*) as count')
      .groupBy('course.status')
      .getRawMany();
    
    // Get most popular courses
    const popularCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .orderBy('course.enrollmentCount', 'DESC')
      .limit(5)
      .getMany();
    
    // Get recent activity
    const recentEnrollments = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .leftJoinAndSelect('enrollment.course', 'course')
      .orderBy('enrollment.createdAt', 'DESC')
      .limit(10)
      .getMany();
    
    return {
      overview: {
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalCertificates,
        activeUsers: activeUsersCount,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      period: {
        newUsers,
        newCourses,
        newEnrollments,
        newCertificates,
        range: range,
        startDate: dateRange.start,
        endDate: dateRange.end,
      },
      distributions: {
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.user_role] = parseInt(item.count);
          return acc;
        }, {}),
        coursesByStatus: coursesByStatus.reduce((acc, item) => {
          acc[item.course_status] = parseInt(item.count);
          return acc;
        }, {}),
      },
      popularCourses: popularCourses.map(course => ({
        id: course.id,
        title: course.title,
        instructor: course.instructor.fullName,
        enrollmentCount: course.enrollmentCount,
        averageRating: course.averageRating,
        completionRate: course.completionRate,
      })),
      recentActivity: recentEnrollments.map(enrollment => ({
        id: enrollment.id,
        user: enrollment.user.fullName,
        course: enrollment.course.title,
        enrolledAt: enrollment.createdAt,
        status: enrollment.status,
        progress: enrollment.progressPercentage,
      })),
    };
  }

  /**
   * Get analytics data for charts and graphs
   */
  async getAnalytics(queryDto: AdminAnalyticsQueryDto) {
    const { metric, period = 'day', lookback = 30, startDate, endDate } = queryDto;
    
    const dateRange = this.getDateRange(`${lookback}d`, startDate, endDate);
    
    switch (metric) {
      case 'users':
        return await this.getUserAnalytics(period, dateRange);
      case 'courses':
        return await this.getCourseAnalytics(period, dateRange);
      case 'enrollments':
        return await this.getEnrollmentAnalytics(period, dateRange);
      case 'certificates':
        return await this.getCertificateAnalytics(period, dateRange);
      case 'engagement':
        return await this.getEngagementAnalytics(period, dateRange);
      default:
        throw new Error(`Unsupported metric: ${metric}`);
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { status: 'active' } });
    const suspendedUsers = await this.userRepository.count({ where: { status: 'suspended' } });
    
    const totalCourses = await this.courseRepository.count();
    const publishedCourses = await this.courseRepository.count({ where: { status: 'published' } });
    
    const totalEnrollments = await this.enrollmentRepository.count();
    const activeEnrollments = await this.enrollmentRepository.count({ where: { status: 'active' } });
    
    // Calculate health scores
    const userHealthScore = activeUsers / totalUsers * 100;
    const courseHealthScore = publishedCourses / totalCourses * 100;
    const enrollmentHealthScore = activeEnrollments / totalEnrollments * 100;
    
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        healthScore: Math.round(userHealthScore),
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        healthScore: Math.round(courseHealthScore),
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        healthScore: Math.round(enrollmentHealthScore),
      },
      overall: {
        healthScore: Math.round((userHealthScore + courseHealthScore + enrollmentHealthScore) / 3),
      },
    };
  }

  // Private helper methods
  private getDateRange(range: string, startDate?: Date, endDate?: Date) {
    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    
    const now = new Date();
    const daysBack = this.getRangeInDays(range);
    const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    return { start, end: now };
  }

  private getRangeInDays(range: string): number {
    switch (range) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private async getUserAnalytics(period: string, dateRange: { start: Date; end: Date }) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .select(`DATE_TRUNC('${period}', user.createdAt) as date, COUNT(*) as count`)
      .where('user.createdAt >= :startDate', { startDate: dateRange.start })
      .andWhere('user.createdAt <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${period}', user.createdAt)`)
      .orderBy(`DATE_TRUNC('${period}', user.createdAt)`, 'ASC');
    
    const result = await query.getRawMany();
    
    return {
      labels: result.map(r => r.date),
      data: result.map(r => parseInt(r.count)),
      total: result.reduce((sum, r) => sum + parseInt(r.count), 0),
    };
  }

  private async getCourseAnalytics(period: string, dateRange: { start: Date; end: Date }) {
    const query = this.courseRepository
      .createQueryBuilder('course')
      .select(`DATE_TRUNC('${period}', course.createdAt) as date, COUNT(*) as count`)
      .where('course.createdAt >= :startDate', { startDate: dateRange.start })
      .andWhere('course.createdAt <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${period}', course.createdAt)`)
      .orderBy(`DATE_TRUNC('${period}', course.createdAt)`, 'ASC');
    
    const result = await query.getRawMany();
    
    return {
      labels: result.map(r => r.date),
      data: result.map(r => parseInt(r.count)),
      total: result.reduce((sum, r) => sum + parseInt(r.count), 0),
    };
  }

  private async getEnrollmentAnalytics(period: string, dateRange: { start: Date; end: Date }) {
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select(`DATE_TRUNC('${period}', enrollment.createdAt) as date, COUNT(*) as count`)
      .where('enrollment.createdAt >= :startDate', { startDate: dateRange.start })
      .andWhere('enrollment.createdAt <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${period}', enrollment.createdAt)`)
      .orderBy(`DATE_TRUNC('${period}', enrollment.createdAt)`, 'ASC');
    
    const result = await query.getRawMany();
    
    return {
      labels: result.map(r => r.date),
      data: result.map(r => parseInt(r.count)),
      total: result.reduce((sum, r) => sum + parseInt(r.count), 0),
    };
  }

  private async getCertificateAnalytics(period: string, dateRange: { start: Date; end: Date }) {
    const query = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select(`DATE_TRUNC('${period}', enrollment.certificateIssuedAt) as date, COUNT(*) as count`)
      .where('enrollment.certificateIssuedAt >= :startDate', { startDate: dateRange.start })
      .andWhere('enrollment.certificateIssuedAt <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${period}', enrollment.certificateIssuedAt)`)
      .orderBy(`DATE_TRUNC('${period}', enrollment.certificateIssuedAt)`, 'ASC');
    
    const result = await query.getRawMany();
    
    return {
      labels: result.map(r => r.date),
      data: result.map(r => parseInt(r.count)),
      total: result.reduce((sum, r) => sum + parseInt(r.count), 0),
    };
  }

  private async getEngagementAnalytics(period: string, dateRange: { start: Date; end: Date }) {
    // Get average time spent per day
    const timeSpentQuery = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select(`DATE_TRUNC('${period}', enrollment.lastActivityAt) as date, AVG(enrollment.timeSpentMinutes) as avgTimeSpent`)
      .where('enrollment.lastActivityAt >= :startDate', { startDate: dateRange.start })
      .andWhere('enrollment.lastActivityAt <= :endDate', { endDate: dateRange.end })
      .groupBy(`DATE_TRUNC('${period}', enrollment.lastActivityAt)`)
      .orderBy(`DATE_TRUNC('${period}', enrollment.lastActivityAt)`, 'ASC');
    
    const result = await timeSpentQuery.getRawMany();
    
    return {
      labels: result.map(r => r.date),
      data: result.map(r => Math.round(parseFloat(r.avgTimeSpent) || 0)),
      total: Math.round(result.reduce((sum, r) => sum + (parseFloat(r.avgTimeSpent) || 0), 0)),
    };
  }
}