# Stellr-Backend
# 🧠 Stellr Academy - Backend Task Breakdown (MVP)

> Tech Stack: Node.js + Express or NestJS | PostgreSQL | REST APIs | OAuth | Twilio/Nodemailer | JWT

---

## 🏁 Core Microservices Overview

- `auth-service` – User registration, login, token handling
- `user-service` – User profile & onboarding
- `course-service` – Course catalog, lessons, metadata
- `progress-service` – Tracks user progress, completions
- `quiz-service` – Quizzes, submissions, results
- `certificate-service` – Certificate generation
- `notification-service` – Email & in-app notifications
- `media-service` – Video hosting, PDF storage, access control
- `gateway-api` – API Gateway / BFF for frontend consumption

---

## 📌 1. Auth Service (`auth-service`)

Handles registration, login, and secure token management

- [ ] Implement OAuth for email and phone using Google and Twilio (or similar)
- [ ] Email-based signup and login (OAuth or token-based)
- [ ] Phone number-based signup/login (OTP via Twilio)
- [ ] JWT-based token issuance and refresh
- [ ] Token revocation (blacklist/refresh)
- [ ] Basic rate limiting for auth endpoints
- [ ] Role assignment: learner only (for MVP)
- [ ] Expose `/register`, `/login`, `/logout`, `/verify-phone`, `/verify-email`

---

## 🧑‍🎓 2. User Service (`user-service`)

Manages learner profile data and onboarding

- [ ] Create user profile model: name, email, phone, avatar, etc.
- [ ] Endpoint to fetch/update profile
- [ ] Store user onboarding state (first-login, tutorial complete)
- [ ] Track user preferences (language, notifications)
- [ ] Soft delete user account
- [ ] Expose `/me`, `/update-profile`, `/preferences`

---

## 📚 3. Course Service (`course-service`)

Delivers all course and lesson content

- [ ] Define models for `Course`, `Lesson`, `Tag`, `Category`
- [ ] API to list all courses (filter by category/tags)
- [ ] API to fetch course details (with lessons)
- [ ] Create endpoints to add/update course and lesson metadata
- [ ] Tagging system (e.g. Beginner, Design, Web Dev)
- [ ] Expose `/courses`, `/courses/:id`, `/lessons/:id`

---

## ✅ 4. Progress Service (`progress-service`)

Tracks user interaction with lessons

- [ ] Track completed lessons for each user
- [ ] Track quiz completion status per course
- [ ] Endpoint to mark lesson as completed
- [ ] Endpoint to get course progress
- [ ] Expose `/progress/:userId`, `/progress/mark-complete`

---

## ❓ 5. Quiz Service (`quiz-service`)

Handles assessments and grading logic

- [ ] Define models for `Quiz`, `Question`, `UserAnswer`, `Result`
- [ ] Endpoint to fetch quiz for a lesson
- [ ] Endpoint to submit quiz answers
- [ ] Auto-grade based on correct answers
- [ ] Store and return quiz result (score, passed)
- [ ] Expose `/quiz/:lessonId`, `/quiz/:lessonId/submit`

---

## 🧾 6. Certificate Service (`certificate-service`)

Generates certificates for completed courses

- [ ] Track course completion eligibility
- [ ] Generate PDF certificate (using html2pdf or similar)
- [ ] Store certificate in file storage (S3/local)
- [ ] Endpoint to download/view certificate
- [ ] Expose `/certificate/:courseId`, `/certificate/:courseId/download`

---

## 🔔 7. Notification Service (`notification-service`)

Handles user notifications (email & push)

- [ ] Setup email notifications (using Nodemailer + SMTP)
- [ ] Setup push notifications (via OneSignal/Firebase Web Push)
- [ ] Send welcome email on registration
- [ ] Send reminder notifications (lesson not completed, quiz not taken)
- [ ] Create notification preferences (enabled/disabled)
- [ ] Expose `/notify/email`, `/notify/push`, `/preferences`

---

## 🎥 8. Media Service (`media-service`)

Handles media access, linking, and download

- [ ] Upload video via admin dashboard (handled externally; backend stores links)
- [ ] Store/downloadable PDF links per lesson
- [ ] Secure access to video/PDF URLs (signed URLs or token-gated)
- [ ] Track media views (optional)
- [ ] Expose `/media/lesson/:id`, `/media/pdf/:id`

---

## 🧩 9. Gateway API (`gateway-api`)

Unifies services into one client-facing REST API

- [ ] API gateway to forward requests to appropriate services
- [ ] Response formatting & error handling
- [ ] Middleware: authentication, CORS, rate-limiting
- [ ] Service health checks
- [ ] API docs (Swagger or Postman collection)

---

## 🛡️ Common/Shared Tasks

- [ ] Centralized error handling module
- [ ] Logging (Winston or Pino)
- [ ] Environment config (.env + dotenv)
- [ ] Health check endpoints
- [ ] Containerization (Docker)
- [ ] CI/CD pipelines (GitHub Actions or similar)
- [ ] Basic monitoring/stats endpoint (e.g. `/metrics`)

---

## 🧪 Testing & QA

- [ ] Unit tests for each service
- [ ] Integration tests for key workflows (auth → enroll → complete lesson → quiz → cert)
- [ ] Postman API test collection
- [ ] E2E staging server for MVP demo

---

## 📁 Deployment Considerations

- [ ] Use PostgreSQL for all service databases (monolithic or per service DB)
- [ ] Docker-compose or Kubernetes (optional at MVP stage)
- [ ] Cloud storage for media (e.g. S3, Cloudinary)
- [ ] Host on Render, Railway, or custom VPS (Ubuntu + Nginx + PM2)

---

> 📣 Tip: For quick setup, use NestJS monorepo + modular services, or separate Express apps with NGINX reverse proxy.

