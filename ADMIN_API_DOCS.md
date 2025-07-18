# Admin Panel API Documentation

## Overview
The Uvarsity Admin Panel provides comprehensive administrative capabilities for managing users, courses, and platform analytics.

## Authentication
All admin endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- User must have `admin` role

## Admin User Management

### Base URL: `/admin/users`

#### GET /admin/users
Get paginated list of users with filtering options
- **Query Parameters:**
  - `search`: Filter by name or email
  - `role`: Filter by role (user, admin, instructor)
  - `status`: Filter by status (active, suspended, deleted)
  - `isEmailVerified`: Filter by email verification status
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sortBy`: Sort field (default: createdAt)
  - `sortOrder`: Sort order (ASC/DESC, default: DESC)

#### GET /admin/users/:id
Get detailed user information including progress and enrollments

#### POST /admin/users
Create a new user
- **Body:**
  ```json
  {
    "fullName": "User Name",
    "email": "user@example.com",
    "phone": "+1234567890",
    "role": "user",
    "temporaryPassword": "temp123",
    "autoVerifyEmail": false
  }
  ```

#### PUT /admin/users/:id
Update user information
- **Body:**
  ```json
  {
    "fullName": "Updated Name",
    "email": "newemail@example.com",
    "role": "instructor",
    "status": "active",
    "isEmailVerified": true
  }
  ```

#### DELETE /admin/users/:id
Delete (soft delete) user account

#### POST /admin/users/bulk-operation
Perform bulk operations on users
- **Body:**
  ```json
  {
    "userIds": ["user1", "user2", "user3"],
    "operation": "suspend",
    "reason": "Violation of terms"
  }
  ```

#### Quick Actions:
- PUT /admin/users/:id/promote-to-admin
- PUT /admin/users/:id/promote-to-instructor
- PUT /admin/users/:id/demote-to-user
- PUT /admin/users/:id/suspend
- PUT /admin/users/:id/reactivate

## Admin Course Management

### Base URL: `/admin/courses`

#### GET /admin/courses
Get paginated list of courses with filtering options
- **Query Parameters:**
  - `search`: Filter by title or description
  - `category`: Filter by category
  - `level`: Filter by level (beginner, intermediate, advanced)
  - `status`: Filter by status (draft, published, archived)
  - `instructorId`: Filter by instructor
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `sortBy`: Sort field (default: createdAt)
  - `sortOrder`: Sort order (ASC/DESC, default: DESC)

#### GET /admin/courses/:id
Get detailed course information including lessons and statistics

#### POST /admin/courses
Create a new course
- **Body:**
  ```json
  {
    "title": "Course Title",
    "description": "Course description",
    "summary": "Brief summary",
    "category": "Programming",
    "tags": ["javascript", "web development"],
    "level": "beginner",
    "estimatedDuration": 20,
    "language": "en",
    "prerequisites": ["Basic HTML"],
    "learningObjectives": ["Learn JavaScript basics"],
    "instructorId": "instructor-id",
    "pricingType": "free",
    "price": 0,
    "currency": "USD",
    "autoPublish": false
  }
  ```

#### PUT /admin/courses/:id
Update course information

#### DELETE /admin/courses/:id
Delete course (archives if has enrollments)

#### POST /admin/courses/bulk-operation
Perform bulk operations on courses
- **Body:**
  ```json
  {
    "courseIds": ["course1", "course2"],
    "operation": "publish",
    "reason": "Ready for students"
  }
  ```

#### Quick Actions:
- PUT /admin/courses/:id/publish
- PUT /admin/courses/:id/unpublish
- PUT /admin/courses/:id/archive
- POST /admin/courses/:id/duplicate

#### GET /admin/courses/categories/list
Get list of available course categories

## Admin Dashboard & Analytics

### Base URL: `/admin/dashboard`

#### GET /admin/dashboard/stats
Get comprehensive dashboard statistics
- **Query Parameters:**
  - `range`: Time range (7d, 30d, 90d, 1y, all)
  - `startDate`: Custom start date
  - `endDate`: Custom end date

#### GET /admin/dashboard/analytics
Get analytics data for charts
- **Query Parameters:**
  - `metric`: Metric type (users, courses, enrollments, certificates, engagement)
  - `period`: Time period (hour, day, week, month)
  - `lookback`: Number of periods to look back
  - `startDate`: Custom start date
  - `endDate`: Custom end date

#### GET /admin/dashboard/health
Get system health metrics

#### GET /admin/dashboard/overview
Get quick overview stats for dashboard cards

#### GET /admin/dashboard/recent-activity
Get recent activity and popular courses

#### Specific Analytics Endpoints:
- GET /admin/dashboard/analytics/user-growth
- GET /admin/dashboard/analytics/course-creation
- GET /admin/dashboard/analytics/enrollment-trends
- GET /admin/dashboard/analytics/certificate-issuance
- GET /admin/dashboard/analytics/user-engagement

## Response Format

All admin endpoints return responses in this format:

### Success Response:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Paginated Response:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

## Admin Features Summary

### 1. User Management
- View all users with advanced filtering
- Create, update, and delete users
- Manage user roles (user, admin, instructor)
- Bulk operations on multiple users
- User progress and enrollment tracking

### 2. Course Management
- Course creation and content management
- Course publishing and status control
- Bulk course operations
- Course statistics and analytics
- Course duplication and templates

### 3. Dashboard & Analytics
- Real-time platform statistics
- User engagement metrics
- Course performance analytics
- System health monitoring
- Customizable date ranges and filters

### 4. Security & Access Control
- Role-based access control
- Admin-only route protection
- Audit logging for admin actions
- Secure user management operations

## Getting Started

1. Ensure you have admin role assigned to your user account
2. Use the JWT token from login in the Authorization header
3. All admin routes are prefixed with `/admin`
4. Use the Swagger documentation at `/api/docs` for interactive testing

## API Versioning

Current version: v1
Base URL: `/api/v1/admin`