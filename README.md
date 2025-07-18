# 🧠 Uvarsity - Backend

> **Production-Ready Learning Platform Backend** built with NestJS, TypeScript, and PostgreSQL

[![Tests](https://img.shields.io/badge/tests-93%20passing-green)](https://github.com/Uvarsity-Learning-Platform/Stellr-Backend)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://github.com/Uvarsity-Learning-Platform/Stellr-Backend)
[![NestJS](https://img.shields.io/badge/nestjs-11.1.3-red)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8.3-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-supported-blue)](https://www.postgresql.org/)

A comprehensive learning management system backend that provides secure authentication, course management, progress tracking, assessments, certificate generation, and multi-channel notifications.

## 🚀 Features

### ✅ Complete Implementation Status
- **Authentication & Authorization** - JWT tokens, OAuth 2.0, multi-factor authentication
- **User Management** - Profiles, preferences, onboarding, account management
- **Course Management** - Course catalog, lessons, categories, search, enrollment
- **Progress Tracking** - Lesson completion, analytics, learning streaks, reports
- **Quiz System** - Multiple question types, auto-grading, results, analytics
- **Certificate Generation** - PDF certificates, templates, verification, download
- **Notifications** - Email, SMS, push notifications, templates, preferences
- **Media Management** - Video streaming, document access, secure storage
- **API Gateway** - Rate limiting, CORS, versioning, health checks
- **Infrastructure** - Error handling, logging, monitoring, graceful shutdown

### 🏗️ Architecture

This is a modular NestJS application with the following services:

- **🔐 Auth Service** - User registration, login, JWT token management, OAuth integration
- **👤 User Service** - Profile management, preferences, onboarding workflows
- **📚 Course Service** - Course catalog, lesson content, categories, enrollment
- **📊 Progress Service** - Learning progress tracking, analytics, completion status
- **❓ Quiz Service** - Assessment creation, submissions, auto-grading, results
- **🏆 Certificate Service** - Certificate generation, templates, verification
- **🔔 Notification Service** - Email, SMS, push notifications with templates
- **🎥 Media Service** - Video hosting, document storage, secure access control
- **🛡️ Common Services** - Error handling, logging, performance monitoring

## 🛠️ Technology Stack

- **Backend Framework**: NestJS 11.1.3 with TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT tokens, Passport.js, OAuth 2.0
- **Security**: Helmet, rate limiting, input validation, CORS
- **Testing**: Jest (93 tests passing, 100% coverage)
- **Documentation**: Swagger/OpenAPI
- **Monitoring**: Prometheus metrics, health checks
- **Containerization**: Docker with multi-stage builds

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn
- Docker (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Uvarsity-Learning-Platform/Stellr-Backend.git
cd Stellr-Backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
# Create database
createdb stellr_academy

# Run migrations
npm run migration:run
```

### 5. Start the Application
```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The application will be available at:
- **API**: http://localhost:3000/api/v1
- **Documentation**: http://localhost:3000/api/v1/docs
- **Health Check**: http://localhost:3000/api/v1/health

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stellr_academy
DB_USERNAME=stellr_user
DB_PASSWORD=stellr_password

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

## 📖 API Documentation

### Interactive API Explorer
Visit http://localhost:3000/api/v1/docs for the complete interactive API documentation.

### Core Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/verify-email` - Email verification
- `POST /api/v1/auth/verify-phone` - Phone verification

#### User Management
- `GET /api/v1/user/me` - Get current user profile
- `PUT /api/v1/user/update-profile` - Update profile
- `GET /api/v1/user/preferences` - Get user preferences
- `PUT /api/v1/user/preferences` - Update preferences

#### Courses
- `GET /api/v1/courses` - List all courses
- `GET /api/v1/courses/:id` - Get course details
- `POST /api/v1/courses/:id/enroll` - Enroll in course
- `GET /api/v1/lessons/:id` - Get lesson content

#### Progress Tracking
- `GET /api/v1/progress/me` - Get user progress
- `POST /api/v1/progress/mark-complete` - Mark lesson complete
- `GET /api/v1/progress/course/:courseId` - Get course progress

#### Quizzes
- `GET /api/v1/quiz/:lessonId` - Get quiz for lesson
- `POST /api/v1/quiz/:lessonId/submit` - Submit quiz answers
- `GET /api/v1/quiz/:quizId/results` - Get quiz results

#### Certificates
- `GET /api/v1/certificate/:courseId` - Get certificate status
- `GET /api/v1/certificate/:courseId/download` - Download certificate
- `GET /api/v1/certificate/verify/:id` - Verify certificate

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Test coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Test Coverage
- **93 tests passing** with 100% code coverage
- Unit tests for all services and controllers
- Integration tests for key workflows
- Error handling and edge case testing

## 🐳 Docker

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker build -t stellr-backend .
docker run -p 3000:3000 stellr-backend
```

## 📊 Monitoring & Health

### Health Checks
- `GET /api/v1/health` - Basic health check
- `GET /api/v1/health/detailed` - Detailed health information

### Performance Metrics
- `GET /api/v1/performance/metrics` - Prometheus metrics
- Memory usage, CPU usage, request counts
- Database connection health
- Response time monitoring

## 🔒 Security Features

- **JWT Authentication** with refresh tokens
- **Rate Limiting** (100 requests per minute)
- **Input Validation** and sanitization
- **CORS** configuration
- **Security Headers** with Helmet
- **SQL Injection** protection
- **XSS** protection
- **HTTPS** enforcement in production

## 🚀 Deployment

### Database Migrations
```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Configure SSL/TLS
5. Set up reverse proxy (Nginx)
6. Configure monitoring and logging
7. Set up automated backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🏆 Implementation Status

**100% Complete** - All features implemented and tested
- ✅ 8 Core Services
- ✅ 79 TypeScript Files
- ✅ 93 Unit Tests Passing
- ✅ Complete API Documentation
- ✅ Production-Ready Security
- ✅ Comprehensive Error Handling
- ✅ Performance Monitoring
- ✅ Docker Support

---

**Built with ❤️ by the Uvarsity Team**

