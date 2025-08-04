# Online Learning Platform Backend README

## Overview
This README provides an exhaustive guide for the backend development of the Online Learning Platform, a scalable microservices-based system designed to support user authentication, course management (with a structured data model for courses, modules, and lessons), progress tracking, certification issuance, payment processing (including Paystack and card payments with coupons and third-party promos), notifications, analytics, course enrollment, and peer reviews. Structuring a course and its materials is mission critical—think of it like building the spine of the entire platform; if the data model is clean, the features will fall into place. Built from the provided workflow and database schema (updated 12:30 PM CEST, Tuesday, July 29, 2025), this document details the architecture, microservice specifications, database design, development process, deployment strategy, operational guidelines, and API request/response types, including analytics and peer review services with their types, data schemas, and relationships, to ensure seamless backend-frontend communication. The target audience is the backend development team, with a focus on delivering a robust, secure, and maintainable application.

## Project Structure
Adopt a clean architecture with a modular file naming convention: `{service}/{entity}/{action}.{type}` (e.g., `auth/user/register.service.js`, `courses/catalog/list.controller.js`, `payment/gateway/process.request.js`). Each microservice should reside in its own directory under the `services/` root folder, with subdirectories for `controllers`, `services`, `models`, and `utils`. Example structure:

- `services/auth/`
  - `controllers/user.controller.js`
  - `services/user.service.js`
  - `models/user.model.js`
  - `utils/auth.utils.js`

Use a consistent RESTful routing structure mirroring the file system (e.g., `/api/auth/user/register`, `/api/courses/catalog/list`, `/api/payment/gateway/status`) to ensure intuitive API navigation. All configuration files (e.g., `.env`, `config.json`) should be placed in a `config/` directory at the root level.

## Architecture
The backend is a distributed microservices architecture, ensuring separation of concerns, scalability, and fault isolation. Services communicate via asynchronous messaging (e.g., RabbitMQ for events like enrollment or payment success) and synchronous RESTful APIs routed through an API Gateway (e.g., Kong or Express Gateway). Each service should be stateless, with state management handled by a centralized database or cache (e.g., Redis).

## Microservices
1. **Auth Service**
   - **Purpose**: Manages user lifecycle, including registration, login, OAuth, and profile management.
   - **Entities**: Users, User Accounts.
   - **Responsibilities**:
     - Validate and store user credentials (email/phone, password hash).
     - Implement OAuth flows (e.g., Google, Facebook) with token management.
     - Handle session expiration and re-authentication.
     - Update user profiles (name, avatar).
   - **Endpoints**:
     - `POST /api/auth/user/register`
       - **Request**: `{ "email": "string", "phone": "string", "password": "string", "name": "string", "avatarUrl": "string" }`
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "userId": 1, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "message": "User registered successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (500 Internal Server Error): `{ "status": "error", "data": null, "error": { "errorCode": 500, "message": "Server error occurred" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/auth/user/login`
       - **Request**: `{ "email": "string", "password": "string" }` or `{ "provider": "string", "providerUserId": "string", "accessToken": "string" }`
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "userId": 1, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "message": "Login successful" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (401 Unauthorized): `{ "status": "error", "data": null, "error": { "errorCode": 401, "message": "Invalid credentials" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/auth/user/profile`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "userId": 1, "username": "john_doe", "email": "john@example.com", "name": "John Doe", "avatarUrl": "https://example.com/avatar.jpg", "role": "student" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "User not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `PUT /api/auth/user/profile`
       - **Request**: `{ "name": "string", "avatarUrl": "string" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "userId": 1, "message": "Profile updated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: OAuth providers, JWT library.

2. **Course Service**
   - **Purpose**: Oversees course creation, catalog management, and structured course materials (modules and lessons).
   - **Entities**: Courses, Course Catalog, Media Repository, Modules, Lessons.
   - **Responsibilities**:
     - Create, update, and delete course metadata (title, instructor, price) and structure with ordered modules and lessons.
     - Manage course availability via catalog.
     - Store and serve course media (videos, PDFs, quizzes) uploaded by instructors with indexed retrieval.
   - **Endpoints**:
     - `GET /api/courses/catalog/list`
       - **Request**: `{ "category": "string", "difficulty": "string", "duration": "number" }` (Query params)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "courses": [{ "courseId": 1, "title": "Introduction to Python", "instructor": "Jane Smith", "rating": 4.5, "duration": 120, "category": "Programming", "coverImageUrl": "https://example.com/cover.jpg", "description": "Learn Python basics", "price": 49.99, "difficulty": "Beginner", "moduleCount": 3 }, { "courseId": 2, "title": "Advanced JavaScript", "instructor": "John Doe", "rating": 4.7, "duration": 180, "category": "Programming", "coverImageUrl": "https://example.com/cover2.jpg", "description": "Master JavaScript", "price": 79.99, "difficulty": "Advanced", "moduleCount": 4 }] }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (500 Internal Server Error): `{ "status": "error", "data": null, "error": { "errorCode": 500, "message": "Server error occurred" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/courses/{id}/structure`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "courseId": 1, "title": "Introduction to Python", "modules": [{ "id": "mod_1", "title": "Module 1", "order": 1, "lessons": [{ "id": "les_1", "title": "Lesson 1", "type": "VIDEO", "url": "https://example.com/video1.mp4", "order": 1 }, { "id": "les_2", "title": "Lesson 2", "type": "PDF", "url": "https://example.com/doc1.pdf", "order": 2 }] }, { "id": "mod_2", "title": "Module 2", "order": 2, "lessons": [{ "id": "les_3", "title": "Lesson 3", "type": "QUIZ", "url": "https://example.com/quiz1", "order": 1 }] }] }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "Course not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: File storage (e.g., AWS S3), media processing tools.

3. **Payment Service**
   - **Purpose**: Handles payment transactions via Paystack and card payments, including coupons and third-party promos.
   - **Entities**: Payment Gateway, Coupons.
   - **Responsibilities**:
     - Initiate payment requests with Paystack and card gateways, applying coupons or promo codes.
     - Verify transaction status, coupon validity, and update records.
     - Notify users of payment success, failure, or promo application.
     - Integrate with third-party APIs for dynamic promo codes.
   - **Endpoints**:
     - `POST /api/payments/initiate`
       - **Request**: `{ "userId": "number", "courseId": "number", "amount": "number", "method": "string" (e.g., "card" or "paystack"), "cardDetails": { "number": "string", "expiryMonth": "string", "expiryYear": "string", "cvv": "string" } (for card method), "paystackEmail": "string" (for paystack method), "couponCode": "string" (optional), "promoCode": "string" (optional, from third-party or promo) }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (201 Created, Paystack with Coupon): `{ "status": "success", "data": { "paymentId": 1, "transactionId": "tx_123456789", "accessCode": "ac_123456789", "status": "pending", "message": "Payment initialized successfully with Paystack and coupon applied", "originalAmount": 5000, "discountedAmount": 4500, "currency": "NGN", "couponCode": "SAVE10", "promoCode": "PROMO2025" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Success (201 Created, Card): `{ "status": "success", "data": { "paymentId": 1, "transactionId": "tx_987654321", "status": "success", "message": "Card payment processed successfully", "amount": 5000, "currency": "NGN" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid payment or coupon details" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (402 Payment Required): `{ "status": "error", "data": null, "error": { "errorCode": 402, "message": "Payment declined or invalid promo" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/payments/status/{transactionId}`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK, Paystack with Coupon): `{ "status": "success", "data": { "paymentId": 1, "transactionId": "tx_123456789", "status": "success", "originalAmount": 5000, "discountedAmount": 4500, "currency": "NGN", "paymentDate": "2025-07-29T12:30:00Z", "method": "paystack", "couponCode": "SAVE10", "promoCode": "PROMO2025" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Success (200 OK, Card): `{ "status": "success", "data": { "paymentId": 1, "transactionId": "tx_987654321", "status": "success", "amount": 5000, "currency": "NGN", "paymentDate": "2025-07-29T12:30:00Z", "method": "card" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "Transaction not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/payments/validate-coupon`
       - **Request**: `{ "couponCode": "string", "courseId": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "valid": true, "discountPercentage": 10, "message": "Coupon validated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid coupon code" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/payments/validate-promo`
       - **Request**: `{ "promoCode": "string", "courseId": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "valid": true, "discountPercentage": 15, "message": "Promo validated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid promo code" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Paystack API, card payment processor, Notification Service, third-party promo API.

4. **Notification Service**
   - **Purpose**: Manages all user notifications across email, in-app, and push channels.
   - **Entities**: Notifications, Notification Log.
   - **Responsibilities**:
     - Send enrollment confirmations, course reminders, certificate alerts, and payment promo notifications.
     - Log delivery status for auditing.
     - Support optional PWA push notifications.
   - **Endpoints**:
     - `POST /api/notifications/send`
       - **Request**: `{ "userId": "number", "type": "string", "message": "string" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (201 Created): `{ "status": "success", "data": { "notificationId": 1, "message": "Notification sent successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/notifications/log`
       - **Request**: `{ "userId": "number" }` (Query param, Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "logs": [{ "logId": 1, "notificationId": 1, "deliveryStatus": "sent", "deliveredAt": "2025-07-29T12:30:00Z" }, { "logId": 2, "notificationId": 2, "deliveryStatus": "pending", "deliveredAt": null }] }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "No logs found" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: SMTP server, push notification service (e.g., Firebase).

5. **Certificate Service**
   - **Purpose**: Generates and delivers certificates upon course completion.
   - **Entities**: Certificates.
   - **Responsibilities**:
     - Verify completion criteria (100% progress, optional quizzes).
     - Generate PDF certificates with user details and unique IDs.
     - Provide downloadable links and verification URLs.
   - **Endpoints**:
     - `POST /api/certificates/generate`
       - **Request**: `{ "userId": "number", "courseId": "number" }` (Requires Authorization header with JWT and payment verification)
       - **Response**:
         - Success (201 Created): `{ "status": "success", "data": { "certificateId": 1, "certificateUrl": "https://example.com/certificate.pdf", "message": "Certificate generated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data or incomplete course" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/certificates/{id}/download`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): File stream with headers `{ "Content-Type": "application/pdf", "Content-Disposition": "attachment; filename=certificate.pdf" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "Certificate not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Payment Service (for payment verification).

6. **Analytics Service**
   - **Purpose**: Collects and analyzes usage data for courses, users, and payments with integrated analysis tools.
   - **Entities**: Analytics, Analytics Reports.
   - **Responsibilities**:
     - Track popular courses, user progress, and transaction metrics, including coupon usage.
     - Generate reports for admin dashboard using visualization tools.
     - Store events in a time-series format.
   - **Endpoints**:
     - `GET /api/analytics/courses`
       - **Request**: `{ "startDate": "string", "endDate": "string", "category": "string" }` (Query params, Requires Admin role)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "courses": [{ "courseId": 1, "title": "Introduction to Python", "popularity": 0.85, "enrollments": 150, "averageRating": 4.5, "couponUsage": 20 }, { "courseId": 2, "title": "Advanced JavaScript", "popularity": 0.92, "enrollments": 200, "averageRating": 4.7, "couponUsage": 15 }], "totalEnrollments": 350 }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (403 Forbidden): `{ "status": "error", "data": null, "error": { "errorCode": 403, "message": "Access denied" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/analytics/users`
       - **Request**: `{ "startDate": "string", "endDate": "string", "role": "string" }` (Query params, Requires Admin role)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "users": [{ "userId": 1, "name": "John Doe", "progress": 0.75, "certificates": 2, "enrollments": 3 }, { "userId": 2, "name": "Jane Smith", "progress": 0.90, "certificates": 3, "enrollments": 4 }], "totalUsers": 500 }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (403 Forbidden): `{ "status": "error", "data": null, "error": { "errorCode": 403, "message": "Access denied" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/analytics/report`
       - **Request**: `{ "type": "string" (e.g., "coursePopularity", "userProgress"), "parameters": { "startDate": "string", "endDate": "string" } }` (Requires Admin role)
       - **Response**:
         - Success (201 Created): `{ "status": "success", "data": { "reportId": 1, "reportUrl": "https://example.com/report.pdf", "message": "Report generated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid report type" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Data warehouse (e.g., Elasticsearch), visualization tools (e.g., Grafana).

7. **Progress Service**
   - **Purpose**: Tracks and manages user progress through course modules and lessons.
   - **Entities**: Progress Tracking.
   - **Responsibilities**:
     - Record module and lesson completion and progress percentage.
     - Support resume functionality with last accessed timestamp.
     - Track optional time spent per module or lesson.
   - **Endpoints**:
     - `GET /api/progress/{enrollmentId}`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "progressId": 1, "enrollmentId": 1, "moduleId": "mod_1", "lessonId": "les_2", "progress": 0.75, "lastAccessed": "2025-07-29T12:30:00Z", "timeSpent": 3600 }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "Progress not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/progress/update`
       - **Request**: `{ "enrollmentId": "number", "moduleId": "string", "lessonId": "string", "progress": "number", "timeSpent": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "progressId": 1, "message": "Progress updated successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Enrollment Service.

8. **Enrollment Service**
   - **Purpose**: Processes user enrollments and integrates with payment.
   - **Entities**: Enrollments.
   - **Responsibilities**:
     - Validate enrollment requests and prevent duplicates.
     - Create enrollment records and link to payment transactions.
     - Track user progress with currentLessonId or percentage.
     - Trigger welcome notifications upon successful enrollment.
   - **Endpoints**:
     - `POST /api/enrollments/enroll`
       - **Request**: `{ "courseId": "number", "userId": "number", "paymentId": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (201 Created): `{ "status": "success", "data": { "enrollmentId": 1, "message": "Enrollment successful" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (409 Conflict): `{ "status": "error", "data": null, "error": { "errorCode": 409, "message": "User already enrolled" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/enrollments/{id}`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "enrollmentId": 1, "userId": 1, "courseId": 1, "enrollmentDate": "2025-07-29T12:30:00Z", "status": "in_progress", "progress": 0.75, "currentLessonId": "les_2" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "Enrollment not found" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Payment Service, Notification Service.

9. **Peer Review Service**
   - **Purpose**: Facilitates peer reviews and feedback on course submissions.
   - **Entities**: Peer Reviews, Review Assignments.
   - **Responsibilities**:
     - Assign peer review tasks to enrolled users.
     - Collect and store peer review feedback.
     - Provide aggregated feedback to users.
   - **Endpoints**:
     - `POST /api/peer-reviews/assign`
       - **Request**: `{ "courseId": "number", "moduleId": "string", "reviewerId": "number", "submitterId": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (201 Created): `{ "status": "success", "data": { "assignmentId": 1, "message": "Review assignment created successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `POST /api/peer-reviews/submit`
       - **Request**: `{ "assignmentId": "number", "reviewerId": "number", "feedback": "string", "rating": "number" }` (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "reviewId": 1, "message": "Review submitted successfully" }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (400 Bad Request): `{ "status": "error", "data": null, "error": { "errorCode": 400, "message": "Invalid input data" }, "timestamp": "2025-07-29T12:30:00Z" }`
     - `GET /api/peer-reviews/{submitterId}`
       - **Request**: (Requires Authorization header with JWT)
       - **Response**:
         - Success (200 OK): `{ "status": "success", "data": { "reviews": [{ "reviewId": 1, "reviewerId": 2, "feedback": "Good effort!", "rating": 4.5, "submittedAt": "2025-07-29T12:30:00Z" }, { "reviewId": 2, "reviewerId": 3, "feedback": "Needs improvement", "rating": 3.0, "submittedAt": "2025-07-29T12:30:00Z" }], "averageRating": 3.75 }, "timestamp": "2025-07-29T12:30:00Z" }`
         - Error (404 Not Found): `{ "status": "error", "data": null, "error": { "errorCode": 404, "message": "No reviews found" }, "timestamp": "2025-07-29T12:30:00Z" }`
   - **Dependencies**: Enrollment Service, Notification Service.

10. **Admin Service**
    - **Purpose**: Provides administrative control over users, courses, and certificates.
    - **Entities**: Users (for management), Courses, Certificates.
    - **Responsibilities**:
      - View, block, or unblock users and assign roles.
      - Create, edit, or delete courses and upload media.
      - Design certificate templates and manually issue/revoke certificates.
    - **Endpoints**:
      - `GET /api/admin/users` - List all users.
      - `POST /api/admin/courses` - Create course.
      - `POST /api/admin/certificates/issue` - Issue certificate manually.
    - **Dependencies**: Auth Service (for role validation), Course Service, Certificate Service.

11. **User Service**
    - **Purpose**: Manages user profiles, preferences, and dashboard data.
    - **Entities**: Users.
    - **Responsibilities**:
      - Retrieve and update user preferences.
      - Display active/completed courses and progress stats.
      - Facilitate certificate downloads and notification settings.
    - **Endpoints**:
      - `GET /api/user/dashboard` - Fetch user dashboard data.
      - `PUT /api/user/preferences` - Update user preferences.
      - `GET /api/user/certificates` - List downloadable certificates.
    - **Dependencies**: Progress Service, Certificate Service, Notification Service.

## Database Schema
The system utilizes a relational database with the following detailed entities and relationships, designed to support a clean and flexible course structure:

### 🧠 What Does a "Course" Need?
A course typically includes:
- Title, description, cover image, category
- Instructor (creator)
- Ordered list of **modules or sections**
- Each module has **videos, PDFs, quizzes, etc.**
- Enrollments (users who take the course)
- Progress tracking (optional but good)

### 🧱 Entity Relationships (Conceptual)
- **Course**
  - **Attributes**:
    - `id` (String, Primary Key, UUID)
    - `title` (String)
    - `description` (String)
    - `category` (String)
    - `instructorId` (String, Foreign Key to Users)
    - `createdAt` (DateTime)
    - `updatedAt` (DateTime)
    - `status` (String, e.g., "draft", "published", optional)
  - **Relationships**: Links to Modules, Enrollments, Certificates, Media Repository, Analytics, Peer Reviews.

- **Module** (aka Section or Chapter)
  - **Attributes**:
    - `id` (String, Primary Key, UUID)
    - `title` (String)
    - `courseId` (String, Foreign Key to Courses)
    - `order` (Int, for sequencing)
    - `status` (String, e.g., "draft", "published", optional)
  - **Relationships**: Linked to Lessons, Courses.

- **Lesson** (video, article, file, etc.)
  - **Attributes**:
    - `id` (String, Primary Key, UUID)
    - `title` (String)
    - `type` (Enum: VIDEO, PDF, QUIZ, ARTICLE, LIVE_SESSION, CODE_SANDBOX, etc.)
    - `url` (String) or `content` (Text, optional)
    - `moduleId` (String, Foreign Key to Modules)
    - `order` (Int, for sequencing)
    - `status` (String, e.g., "draft", "published", optional)
  - **Relationships**: Linked to Modules.

- **Users**
  - **Attributes**:
    - `id` (String, Primary Key, UUID)
    - `name` (String)
    - `email` (String, Unique)
    - `phone` (String)
    - `password_hash` (String, Encrypted)
    - `role` (Enum: student, admin, instructor)
    - `avatar_url` (String)
    - `created_at` (DateTime)
    - `updated_at` (DateTime)
  - **Relationships**: Links to User Accounts, Enrollments, Certificates, Payments, Notifications, Peer Reviews.

- **User Accounts**
  - **Attributes**:
    - `account_id` (String, Primary Key, UUID)
    - `user_id` (String, Foreign Key to Users, Links to user)
    - `provider` (String, OAuth provider, e.g., Google)
    - `provider_user_id` (String, External user ID)
    - `access_token` (String, OAuth access token)
    - `refresh_token` (String, Token for refresh)
  - **Relationships**: Associated with a single User.

- **Enrollment**
  - **Attributes**:
    - `id` (String, Primary Key, UUID)
    - `userId` (String, Foreign Key to Users)
    - `courseId` (String, Foreign Key to Courses)
    - `paymentId` (String, Foreign Key to Payment Gateway)
    - `enrollmentDate` (DateTime)
    - `status` (String, e.g., in_progress, completed, dropped)
    - `progress` (Decimal, optional percentage)
    - `currentLessonId` (String, Foreign Key to Lessons, optional)
  - **Relationships**: Connects Users to Courses, links to Progress Tracking, Payments, Peer Reviews.

- **Progress Tracking**
  - **Attributes**:
    - `progress_id` (String, Primary Key, UUID)
    - `enrollment_id` (String, Foreign Key to Enrollments)
    - `module_id` (String, Foreign Key to Modules)
    - `lesson_id` (String, Foreign Key to Lessons)
    - `progress` (Decimal(5,2), Progress percentage)
    - `last_accessed` (DateTime, Last access timestamp)
    - `time_spent` (Int, Time spent in seconds)
  - **Relationships**: Associated with Enrollments.

- **Certificates**
  - **Attributes**:
    - `certificate_id` (String, Primary Key, UUID)
    - `user_id` (String, Foreign Key to Users)
    - `course_id` (String, Foreign Key to Courses)
    - `certificate_url` (String)
    - `issue_date` (DateTime)
    - `unique_id` (String)
    - `verification_url` (String)
  - **Relationships**: Connects Users to Courses, requires Payments.

- **Payment Gateway**
  - **Attributes**:
    - `payment_id` (String, Primary Key, UUID)
    - `user_id` (String, Foreign Key to Users)
    - `course_id` (String, Foreign Key to Courses)
    - `amount` (Decimal(10,2))
    - `original_amount` (Decimal(10,2), Original amount before discount)
    - `discounted_amount` (Decimal(10,2), Amount after applying coupon/promo)
    - `transaction_id` (String)
    - `payment_status` (String, e.g., pending, completed, failed)
    - `payment_date` (DateTime)
    - `method` (String, e.g., card, paystack)
    - `card_details` (JSON, Encrypted card data for card method)
    - `paystack_reference` (String, Paystack transaction reference for paystack method)
    - `coupon_code` (String, optional)
    - `promo_code` (String, optional, from third-party or promo)
  - **Relationships**: Links to Users, Courses, Enrollments, Certificates, Notifications, Analytics.

- **Coupons**
  - **Attributes**:
    - `coupon_id` (String, Primary Key, UUID)
    - `code` (String, Unique)
    - `discount_percentage` (Decimal(5,2))
    - `valid_from` (DateTime)
    - `valid_to` (DateTime)
    - `is_active` (Boolean)
    - `course_id` (String, Foreign Key to Courses, optional)
  - **Relationships**: Linked to Courses, Payments.

- **Notifications**
  - **Attributes**:
    - `notification_id` (String, Primary Key, UUID)
    - `user_id` (String, Foreign Key to Users)
    - `type` (Enum: email, in_app, push)
    - `message` (Text)
    - `status` (String, e.g., pending, sent)
    - `created_at` (DateTime)
  - **Relationships**: Links to Notification Log, Users.

- **Notification Log**
  - **Attributes**:
    - `log_id` (String, Primary Key, UUID)
    - `notification_id` (String, Foreign Key to Notifications)
    - `delivery_status` (String)
    - `delivered_at` (DateTime)
  - **Relationships**: Associated with Notifications.

- **Media Repository**
  - **Attributes**:
    - `media_id` (String, Primary Key, UUID)
    - `course_id` (String, Foreign Key to Courses)
    - `instructor_id` (String, Foreign Key to Users)
    - `media_type` (Enum: video, image, document)
    - `media_url` (String)
    - `index` (Int, Sequential index for time-based retrieval)
    - `uploaded_at` (DateTime)
  - **Relationships**: Linked to Courses and Users (instructors), with `index` enabling ordered retrieval by upload time.

- **Analytics**
  - **Attributes**:
    - `analytic_id` (String, Primary Key, UUID)
    - `course_id` (String, Foreign Key to Courses)
    - `user_id` (String, Foreign Key to Users)
    - `event_type` (String, e.g., "enrollment", "progress_update", "coupon_used")
    - `event_data` (JSON)
    - `recorded_at` (DateTime)
  - **Relationships**: Optionally linked to Courses, Users, Payments.

- **Analytics Reports**
  - **Attributes**:
    - `report_id` (String, Primary Key, UUID)
    - `type` (String, e.g., "coursePopularity", "userProgress")
    - `parameters` (JSON, e.g., {"startDate": "2025-07-01", "endDate": "2025-07-29"})
    - `report_url` (String)
    - `generated_at` (DateTime)
  - **Relationships**: Associated with Analytics data.

- **Peer Reviews**
  - **Attributes**:
    - `review_id` (String, Primary Key, UUID)
    - `assignment_id` (String, Foreign Key to Review Assignments)
    - `reviewer_id` (String, Foreign Key to Users)
    - `feedback` (Text)
    - `rating` (Decimal(3,2))
    - `submitted_at` (DateTime)
  - **Relationships**: Links to Review Assignments, Users.

- **Review Assignments**
  - **Attributes**:
    - `assignment_id` (String, Primary Key, UUID)
    - `course_id` (String, Foreign Key to Courses)
    - `module_id` (String, Foreign Key to Modules)
    - `reviewer_id` (String, Foreign Key to Users)
    - `submitter_id` (String, Foreign Key to Users)
    - `assigned_at` (DateTime)
    - `status` (String, e.g., "pending", "completed")
  - **Relationships**: Connects Courses, Modules, and Users for peer review tasks.

### 🧭 Ordering the Videos
Ordering is handled using the `order` field in both `Module` and `Lesson`. So:
- Module 1 → Lesson 1, 2, 3...
- Module 2 → Lesson 1, 2, 3...

NestJS should sort by `order` when querying.
```ts
// Get lessons in a course
await this.prisma.course.findUnique({
  where: { id: courseId },
  include: {
    modules: {
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' }
        }
      }
    }
  }
});
```

### 🔁 Example NestJS + Prisma Schema
```prisma
model Course {
  id          String   @id @default(uuid())
  title       String
  description String
  instructor  User     @relation(fields: [instructorId], references: [id])
  instructorId String
  modules     Module[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  status      String?  @default("draft")
}

model Module {
  id        String   @id @default(uuid())
  title     String
  course    Course   @relation(fields: [courseId], references: [id])
  courseId  String
  order     Int
  lessons   Lesson[]
  status    String?  @default("draft")
}

model Lesson {
  id        String    @id @default(uuid())
  title     String
  type      LessonType
  url       String?
  content   String?
  module    Module    @relation(fields: [moduleId], references: [id])
  moduleId  String
  order     Int
  status    String?   @default("draft")
}

model Enrollment {
  id              String    @id @default(uuid())
  userId          String    @relation(fields: [userId], references: [id])
  courseId        String    @relation(fields: [courseId], references: [id])
  paymentId       String    @relation(fields: [paymentId], references: [id])
  enrollmentDate  DateTime  @default(now())
  status          String    @default("in_progress")
  progress        Decimal?  @db.Decimal(5,2)
  currentLessonId String?   @relation(fields: [currentLessonId], references: [id])
  user            User      @relation(fields: [userId], references: [id])
  course          Course    @relation(fields: [courseId], references: [id])
  payment         PaymentGateway @relation(fields: [paymentId], references: [id])
  currentLesson   Lesson?   @relation(fields: [currentLessonId], references: [id])
}

model PaymentGateway {
  payment_id        String   @id @default(uuid())
  user_id           String   @relation(fields: [userId], references: [id])
  course_id         String   @relation(fields: [courseId], references: [id])
  amount            Decimal  @db.Decimal(10,2)
  original_amount   Decimal  @db.Decimal(10,2)
  discounted_amount Decimal  @db.Decimal(10,2)
  transaction_id    String
  payment_status    String
  payment_date      DateTime
  method            String
  card_details      Json?
  paystack_reference String?
  coupon_code       String?
  promo_code        String?
  user              User     @relation(fields: [userId], references: [id])
  course            Course   @relation(fields: [courseId], references: [id])
}

model Coupons {
  coupon_id          String   @id @default(uuid())
  code               String   @unique
  discount_percentage Decimal @db.Decimal(5,2)
  valid_from         DateTime
  valid_to           DateTime
  is_active          Boolean  @default(true)
  course_id          String?  @relation(fields: [courseId], references: [id])
  course             Course?  @relation(fields: [courseId], references: [id])
}

enum LessonType {
  VIDEO
  PDF
  QUIZ
  ARTICLE
  LIVE_SESSION
  CODE_SANDBOX
}
```

### 🛡 Tips for Long-Term Flexibility
- Add a `type` field for lessons to support live sessions, code sandboxes, etc.
- Track user progress using an `Enrollment` model with a `currentLessonId` or percentage.
- Allow drafts/published states for courses and lessons.
- Support dynamic coupon and promo integration with third-party APIs.

## Development Process & Compliance
- **Chosen Process**: Implement Scrum with 5-day sprints for iterative development and Kanban with WIP limits (e.g., 3 tasks per developer) for task flow optimization. This aligns with Pressman Chapters 2-3, supporting rapid prototyping and continuous improvement for a team collaboration project.
- **DevSecOps Guard-rails**:
  - **Branch Protection**: Protect `main`, `develop`, and `release/*` branches, requiring two approvals and passing CI checks.
  - **CI Test Coverage Gate**: Enforce 80% unit test coverage, integrated with Jenkins or GitHub Actions.
  - **Secret Scanning**: Use tools like TruffleHog to detect and block secrets in commits.
- **Gen-AI Usage**: Permit AI for boilerplate (e.g., API controllers), documentation, and initial schemas, but all artifacts must be reviewed and explained by developers during bi-weekly audits to ensure ownership and quality.

## Implementation Guidelines
- **Performance Considerations**: Design APIs with O(n) time complexity for operations like enrollment validation (linear search for duplicates) and O(1) for certificate retrieval (hashed lookups). For Media Repository, use `index` for O(log n) retrieval with a B-tree index. Space complexity is O(n) for scalable data, optimized with indexing and caching (e.g., Redis).
- **Error Handling**: Standardize error responses (e.g., 400 Bad Request, 500 Internal Server Error) with JSON payloads containing `status`, `data`, `error`, and `timestamp`. Implement global exception handling per service.
- **Logging**: Use a centralized logging solution (e.g., ELK Stack) to capture request logs, errors, and analytics events with timestamps and correlation IDs.
- **Security**: Enforce HTTPS with TLS 1.3, JWT-based authentication with refresh tokens, input validation (e.g., Joi), and rate limiting (e.g., 100 requests/min/user) to mitigate attacks. Secure Paystack, card transactions, and coupon data with encryption.
- **Data Integrity**: Use transactions for enrollment, payment, media upload, peer review, course structure, and coupon validation operations to ensure consistency.

## Deployment
- **Environment Setup**:
  - **Development**: Local Docker Compose setup with mock services.
  - **Staging**: AWS EC2 with Kubernetes for testing.
  - **Production**: AWS EKS with auto-scaling groups.
- **Containerization**: Dockerize each microservice with a `Dockerfile` and use `docker-compose.yml` for local development. Include health checks and resource limits.
- **Orchestration**: Deploy with Kubernetes, using Helm charts for configuration. Configure Horizontal Pod Autoscaling based on CPU/memory usage.
- **Monitoring**: Integrate Prometheus for metrics, Grafana for dashboards, and Alertmanager for notifications (e.g., downtime alerts).
- **CI/CD**: Set up Jenkins or GitHub Actions with pipelines for build, test, and deploy stages. Include linting (e.g., ESLint) and security scans (e.g., Snyk).

## Collaboration
- **Team Workflow**: Use Git with a branching strategy: `main` for production, `develop` for integration, `feature/{task}` for development (e.g., `feature/auth-login`). Conduct daily 15-minute stand-ups and bi-weekly 1-hour retrospectives.
- **Documentation**: Maintain API specifications with OpenAPI 3.0 in `docs/api-spec.yaml`. Update this README with version history and change logs.
- **Communication**: Use Slack for real-time coordination and Jira for task tracking, with epics for each microservice.

## Operational Guidelines
- **Backup Strategy**: Schedule daily database backups to AWS S3 with 30-day retention.
- **Disaster Recovery**: Implement a multi-region deployment with failover to a secondary AWS region.
- **Incident Response**: Define an on-call rotation with a 15-minute SLA for critical issues, logged in PagerDuty.

## Next Steps
1. Initialize the Git repository with the proposed structure by 12:45 PM CEST, July 29, 2025.
2. Set up the relational database schema with appropriate indexes and foreign keys, including a B-tree index on `Media Repository.index`, ensuring referential integrity, by July 30, 2025.
3. Develop the Auth Service first, including user registration and login endpoints, targeting completion by August 1, 2025.
4. Implement Course Service with structured course data (Courses, Modules, Lessons), Enrollment, and Progress Services, ensuring payment and media integration, with a milestone by August 6, 2025.
5. Develop Payment Service with coupon and promo support, Certificate, Notification, Analytics, and Peer Review Services, targeting completion by August 12, 2025.
6. Implement Admin and User Services, with a milestone by August 17, 2025.
7. Configure CI/CD pipelines with DevSecOps guard-rails, aiming for readiness by August 19, 2025.
8. Conduct a team kickoff meeting at 1:00 PM CEST, July 29, 2025, to assign initial tasks and review this README.

## Contact
For queries, contact the lead developer via the `#backend-team` Slack channel or email at `lead.developer@learningplatform.com`. All updates to this README will be versioned (e.g., `v1.0`, `v1.1`) and committed to the repository.