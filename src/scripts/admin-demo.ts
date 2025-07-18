import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminUserService } from '../admin/services/admin-user.service';
import { AdminCourseService } from '../admin/services/admin-course.service';
import { AuthService } from '../auth/services/auth.service';
import { UserService } from '../user/services/user.service';

/**
 * Admin Demo Script
 * 
 * This script demonstrates how to use the admin functionality:
 * 1. Create admin users
 * 2. Create sample courses
 * 3. Generate sample data for testing
 * 
 * Usage: npm run admin:demo
 */
async function runAdminDemo() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const authService = app.get(AuthService);
    const userService = app.get(UserService);
    const adminUserService = app.get(AdminUserService);
    const adminCourseService = app.get(AdminCourseService);
    
    console.log('🔧 Admin Demo Started');
    
    // 1. Create admin user
    console.log('👤 Creating admin user...');
    try {
      const adminUser = await authService.register({
        email: 'admin@uvarsity.com',
        password: 'admin123',
        fullName: 'Platform Administrator',
        phone: '+1234567890',
      });
      
      // Update to admin role
      await adminUserService.updateUser(adminUser.userId, {
        role: 'admin',
        isEmailVerified: true,
      });
      
      console.log('✅ Admin user created: admin@uvarsity.com');
    } catch (error) {
      console.log('⚠️ Admin user might already exist');
    }
    
    // 2. Create instructor user
    console.log('👨‍🏫 Creating instructor user...');
    try {
      const instructorUser = await authService.register({
        email: 'instructor@uvarsity.com',
        password: 'instructor123',
        fullName: 'Course Instructor',
        phone: '+1234567891',
      });
      
      // Update to instructor role
      await adminUserService.updateUser(instructorUser.userId, {
        role: 'instructor',
        isEmailVerified: true,
      });
      
      console.log('✅ Instructor user created: instructor@uvarsity.com');
    } catch (error) {
      console.log('⚠️ Instructor user might already exist');
    }
    
    // 3. Create sample students
    console.log('🎓 Creating sample students...');
    const students = [
      { email: 'student1@uvarsity.com', name: 'Alice Johnson' },
      { email: 'student2@uvarsity.com', name: 'Bob Smith' },
      { email: 'student3@uvarsity.com', name: 'Carol Williams' },
    ];
    
    for (const student of students) {
      try {
        await authService.register({
          email: student.email,
          password: 'student123',
          fullName: student.name,
        });
        console.log(`✅ Student created: ${student.email}`);
      } catch (error) {
        console.log(`⚠️ Student ${student.email} might already exist`);
      }
    }
    
    // 4. Create sample courses
    console.log('📚 Creating sample courses...');
    
    // Get instructor ID
    const instructorUsers = await adminUserService.getUsers({
      role: 'instructor',
      limit: 1,
    });
    
    if (instructorUsers.users.length > 0) {
      const instructorId = instructorUsers.users[0].id;
      
      const sampleCourses = [
        {
          title: 'Introduction to Web Development',
          description: 'Learn the basics of web development with HTML, CSS, and JavaScript',
          summary: 'A comprehensive introduction to web development',
          category: 'Programming',
          tags: ['html', 'css', 'javascript', 'web development'],
          level: 'beginner' as const,
          estimatedDuration: 40,
          language: 'en',
          prerequisites: ['Basic computer skills'],
          learningObjectives: [
            'Understand HTML structure and elements',
            'Style web pages with CSS',
            'Add interactivity with JavaScript',
            'Build responsive web pages'
          ],
          instructorId,
          pricingType: 'free' as const,
          price: 0,
          currency: 'USD',
          autoPublish: true,
        },
        {
          title: 'Advanced JavaScript Programming',
          description: 'Master advanced JavaScript concepts and modern ES6+ features',
          summary: 'Advanced JavaScript concepts for experienced developers',
          category: 'Programming',
          tags: ['javascript', 'es6', 'async', 'programming'],
          level: 'advanced' as const,
          estimatedDuration: 60,
          language: 'en',
          prerequisites: ['Basic JavaScript knowledge', 'HTML/CSS fundamentals'],
          learningObjectives: [
            'Master ES6+ features',
            'Understand asynchronous programming',
            'Learn advanced JavaScript patterns',
            'Build complex applications'
          ],
          instructorId,
          pricingType: 'paid' as const,
          price: 99.99,
          currency: 'USD',
          autoPublish: false,
        },
        {
          title: 'Digital Marketing Fundamentals',
          description: 'Learn the essential concepts of digital marketing',
          summary: 'Comprehensive guide to digital marketing strategies',
          category: 'Marketing',
          tags: ['marketing', 'digital', 'seo', 'social media'],
          level: 'beginner' as const,
          estimatedDuration: 30,
          language: 'en',
          prerequisites: ['Basic business understanding'],
          learningObjectives: [
            'Understand digital marketing channels',
            'Learn SEO fundamentals',
            'Master social media marketing',
            'Create effective marketing campaigns'
          ],
          instructorId,
          pricingType: 'free' as const,
          price: 0,
          currency: 'USD',
          autoPublish: true,
        },
      ];
      
      for (const course of sampleCourses) {
        try {
          const createdCourse = await adminCourseService.createCourse(course);
          console.log(`✅ Course created: ${createdCourse.title}`);
        } catch (error) {
          console.log(`⚠️ Course "${course.title}" might already exist`);
        }
      }
    }
    
    // 5. Display summary
    console.log('\n📊 Admin Demo Summary:');
    
    const userStats = await adminUserService.getUserStatistics({});
    const courseStats = await adminCourseService.getCourseStatisticsForDashboard({});
    
    console.log(`👥 Total Users: ${userStats.totalUsers}`);
    console.log(`🔧 Admin Users: ${userStats.adminUsers}`);
    console.log(`👨‍🏫 Instructor Users: ${userStats.instructorUsers}`);
    console.log(`📚 Total Courses: ${courseStats.totalCourses}`);
    console.log(`📖 Published Courses: ${courseStats.publishedCourses}`);
    console.log(`📝 Draft Courses: ${courseStats.draftCourses}`);
    
    console.log('\n🎉 Admin Demo Completed Successfully!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('Email: admin@uvarsity.com');
    console.log('Password: admin123');
    console.log('\n👨‍🏫 Instructor Login Credentials:');
    console.log('Email: instructor@uvarsity.com');
    console.log('Password: instructor123');
    console.log('\n🎓 Student Login Credentials:');
    console.log('Email: student1@uvarsity.com (password: student123)');
    console.log('Email: student2@uvarsity.com (password: student123)');
    console.log('Email: student3@uvarsity.com (password: student123)');
    
  } catch (error) {
    console.error('❌ Admin Demo Failed:', error.message);
    throw error;
  } finally {
    await app.close();
  }
}

// Run the demo if called directly
if (require.main === module) {
  runAdminDemo()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAdminDemo };