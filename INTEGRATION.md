# 🚀 Frontend Integration Guide - Uvarsity Backend API

> **Complete integration guide for frontend developers working with the Uvarsity Learning Platform Backend**

## 📋 Overview

This guide provides everything frontend developers need to integrate with the Uvarsity Backend API. The backend is **100% complete** with all 8 core services implemented and tested, ready for production use.

### 🎯 What You'll Learn
- How to authenticate users and manage JWT tokens
- Complete API endpoints for all services
- Frontend-specific integration patterns
- Error handling and security best practices
- TypeScript interfaces and data structures
- Real-world code examples

## 🏗️ Backend Services Overview

The Uvarsity Backend provides 8 fully implemented services:

| Service | Status | Description |
|---------|--------|-------------|
| 🔐 **Authentication** | ✅ Complete | JWT auth, OAuth, email/phone verification, password reset |
| 👤 **User Management** | ✅ Complete | Profile management, preferences, onboarding |
| 📚 **Course Management** | ✅ Complete | Course catalog, lessons, enrollment, categories |
| ✅ **Progress Tracking** | ✅ Complete | Learning progress, completion tracking, analytics |
| ❓ **Quiz System** | ✅ Complete | Quiz creation, submissions, auto-grading, attempts |
| 🏆 **Certificate System** | ✅ Complete | PDF generation, verification, templates |
| 🔔 **Notification System** | ✅ Complete | Email, SMS, push notifications, preferences |
| 🎥 **Media Management** | ✅ Complete | File upload, streaming, access control |

## 🚀 Quick Start

### 1. Backend Setup
```bash
# Clone and start the backend
git clone https://github.com/Uvarsity-Learning-Platform/Uvarsity-Backend.git
cd Uvarsity-Backend
npm install
cp .env.example .env
# Configure your .env file
npm run start:dev
```

### 2. API Base Configuration
```javascript
// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api/v1',
  DOCS_URL: 'http://localhost:3000/api/v1/docs',
  TIMEOUT: 10000,
  VERSION: 'v1'
};

// Default headers for API requests
const getHeaders = (includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (includeAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  return headers;
};
```

### 3. API Client Setup
```javascript
// Create a reusable API client
class UvarsityAPI {
  constructor(baseURL = API_CONFIG.BASE_URL) {
    this.baseURL = baseURL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: this.timeout,
      headers: getHeaders(options.auth !== false),
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        await this.handleError(response);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Error handling
  async handleError(response) {
    const error = await response.json();
    
    if (response.status === 401) {
      // Token expired, attempt refresh
      await this.refreshToken();
      throw new Error('Token expired, please retry');
    } else if (response.status === 403) {
      throw new Error('Access denied');
    } else if (response.status === 404) {
      throw new Error('Resource not found');
    } else if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    } else {
      throw new Error(error.message || 'API request failed');
    }
  }

  // Token refresh logic
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (response.ok) {
      const tokens = await response.json();
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      return tokens;
    } else {
      // Refresh failed, redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  }
}

// Create API instance
const api = new UvarsityAPI();
```

## 🔐 Authentication Integration

### User Registration
```javascript
// Register new user
async function registerUser(userData) {
  try {
    const response = await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        fullName: userData.fullName,
        password: userData.password,
        phone: userData.phone, // optional
        preferredLanguage: userData.language || 'en', // optional
        timezone: userData.timezone || 'UTC' // optional
      }),
      auth: false // No auth needed for registration
    });

    return {
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      user: response.user
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const registrationData = {
  email: 'user@example.com',
  fullName: 'John Doe',
  password: 'securePassword123',
  phone: '+1234567890',
  language: 'en',
  timezone: 'America/New_York'
};

const result = await registerUser(registrationData);
if (result.success) {
  console.log('User registered successfully');
  // Show success message to user
} else {
  console.error('Registration failed:', result.message);
  // Show error message to user
}
```

### User Login
```javascript
// Login user
async function loginUser(credentials) {
  try {
    const response = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      }),
      auth: false // No auth needed for login
    });

    // Store tokens securely
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    
    // Store user data
    localStorage.setItem('user', JSON.stringify(response.user));

    return {
      success: true,
      user: response.user,
      tokens: {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const loginData = {
  email: 'user@example.com',
  password: 'securePassword123'
};

const loginResult = await loginUser(loginData);
if (loginResult.success) {
  console.log('Login successful');
  // Redirect to dashboard
  window.location.href = '/dashboard';
} else {
  console.error('Login failed:', loginResult.message);
  // Show error message
}
```

### Email Verification
```javascript
// Verify email address
async function verifyEmail(verificationToken) {
  try {
    const response = await api.request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({
        verificationToken
      }),
      auth: false
    });

    return {
      success: true,
      message: 'Email verified successfully',
      user: response.user
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example (typically called from email link)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  const verificationResult = await verifyEmail(token);
  if (verificationResult.success) {
    console.log('Email verified successfully');
    // Show success message and redirect
  } else {
    console.error('Email verification failed');
    // Show error message
  }
}
```

### Password Reset
```javascript
// Request password reset
async function requestPasswordReset(email) {
  try {
    const response = await api.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false
    });

    return {
      success: true,
      message: 'Password reset email sent'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Reset password with token
async function resetPassword(resetToken, newPassword) {
  try {
    const response = await api.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        resetToken,
        newPassword
      }),
      auth: false
    });

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}
```

### Logout
```javascript
// Logout user
async function logoutUser() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
      await api.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless of API success
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Redirect to login
    window.location.href = '/login';
  }
}
```

## 👤 User Management

### Get User Profile
```javascript
// Get current user profile
async function getUserProfile() {
  try {
    const response = await api.request('/users/me');
    return {
      success: true,
      user: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Update user profile
async function updateUserProfile(profileData) {
  try {
    const response = await api.request('/users/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });

    return {
      success: true,
      user: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const profileUpdate = {
  fullName: 'John Smith',
  phone: '+1234567890',
  preferredLanguage: 'en',
  timezone: 'America/New_York'
};

const updateResult = await updateUserProfile(profileUpdate);
if (updateResult.success) {
  console.log('Profile updated successfully');
  // Update UI with new profile data
} else {
  console.error('Profile update failed:', updateResult.message);
}
```

### User Preferences
```javascript
// Get user preferences
async function getUserPreferences() {
  try {
    const response = await api.request('/users/preferences');
    return {
      success: true,
      preferences: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Update user preferences
async function updateUserPreferences(preferences) {
  try {
    const response = await api.request('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });

    return {
      success: true,
      preferences: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const newPreferences = {
  notificationPreferences: {
    email: true,
    sms: false,
    push: true,
    marketing: false
  },
  preferredLanguage: 'en',
  timezone: 'America/New_York'
};

const prefResult = await updateUserPreferences(newPreferences);
if (prefResult.success) {
  console.log('Preferences updated successfully');
}
```

## 📚 Course Management

### Get Courses
```javascript
// Get courses with filtering
async function getCourses(filters = {}) {
  try {
    const params = new URLSearchParams();
    
    // Add filters
    if (filters.search) params.append('search', filters.search);
    if (filters.category) params.append('category', filters.category);
    if (filters.level) params.append('level', filters.level);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.request(`/courses?${params}`, {
      auth: false // Public endpoint
    });

    return {
      success: true,
      courses: response.courses,
      total: response.total,
      hasMore: response.hasMore
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get specific course
async function getCourse(courseId) {
  try {
    const response = await api.request(`/courses/${courseId}`, {
      auth: false // Public endpoint
    });

    return {
      success: true,
      course: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const courseFilters = {
  search: 'javascript',
  category: 'programming',
  level: 'beginner',
  limit: 10,
  offset: 0
};

const coursesResult = await getCourses(courseFilters);
if (coursesResult.success) {
  console.log('Found courses:', coursesResult.courses);
  // Display courses in UI
} else {
  console.error('Failed to fetch courses:', coursesResult.message);
}
```

### Course Enrollment
```javascript
// Enroll in a course
async function enrollInCourse(courseId) {
  try {
    const response = await api.request(`/courses/${courseId}/enroll`, {
      method: 'POST'
    });

    return {
      success: true,
      enrollment: response.enrollment,
      message: 'Successfully enrolled in course'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get user's enrollments
async function getUserEnrollments(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await api.request(`/courses/enrollments/my?${params}`);

    return {
      success: true,
      enrollments: response.enrollments
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const enrollmentResult = await enrollInCourse('course-123');
if (enrollmentResult.success) {
  console.log('Enrolled successfully');
  // Update UI to show enrolled status
} else {
  console.error('Enrollment failed:', enrollmentResult.message);
}
```

### Course Lessons
```javascript
// Get course lessons
async function getCourseLessons(courseId) {
  try {
    const response = await api.request(`/courses/${courseId}/lessons`);

    return {
      success: true,
      lessons: response.lessons
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const lessonsResult = await getCourseLessons('course-123');
if (lessonsResult.success) {
  console.log('Course lessons:', lessonsResult.lessons);
  // Display lessons in UI
}
```

## ✅ Progress Tracking

### Lesson Progress
```javascript
// Start lesson
async function startLesson(lessonId) {
  try {
    const response = await api.request(`/progress/lessons/${lessonId}/start`, {
      method: 'POST'
    });

    return {
      success: true,
      progress: response.progress
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Update lesson progress
async function updateLessonProgress(lessonId, progressData) {
  try {
    const response = await api.request(`/progress/lessons/${lessonId}/update`, {
      method: 'PUT',
      body: JSON.stringify({
        position: progressData.position,
        progressPercentage: progressData.progressPercentage,
        timeSpent: progressData.timeSpent
      })
    });

    return {
      success: true,
      progress: response.progress
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Complete lesson
async function completeLesson(lessonId) {
  try {
    const response = await api.request(`/progress/lessons/${lessonId}/complete`, {
      method: 'POST'
    });

    return {
      success: true,
      progress: response.progress
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example - Video player progress tracking
class VideoProgressTracker {
  constructor(lessonId) {
    this.lessonId = lessonId;
    this.startTime = Date.now();
    this.lastPosition = 0;
  }

  async onVideoStart() {
    await startLesson(this.lessonId);
  }

  async onVideoProgress(position, duration) {
    const progressPercentage = (position / duration) * 100;
    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    
    // Update progress every 10 seconds
    if (position - this.lastPosition >= 10) {
      await updateLessonProgress(this.lessonId, {
        position,
        progressPercentage,
        timeSpent
      });
      this.lastPosition = position;
    }
  }

  async onVideoComplete() {
    await completeLesson(this.lessonId);
  }
}
```

### Course Progress
```javascript
// Get course progress
async function getCourseProgress(courseId) {
  try {
    const response = await api.request(`/progress/courses/${courseId}`);

    return {
      success: true,
      progress: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get learning analytics
async function getLearningAnalytics() {
  try {
    const response = await api.request('/progress/analytics');

    return {
      success: true,
      analytics: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const progressResult = await getCourseProgress('course-123');
if (progressResult.success) {
  const { overallProgress, lessonsCompleted, totalLessons } = progressResult.progress;
  
  // Update progress bar
  document.getElementById('progress-bar').style.width = `${overallProgress}%`;
  document.getElementById('progress-text').textContent = 
    `${lessonsCompleted}/${totalLessons} lessons completed`;
}
```

## ❓ Quiz System

### Quiz Management
```javascript
// Get quiz for lesson
async function getLessonQuiz(lessonId) {
  try {
    const response = await api.request(`/quizzes/lesson/${lessonId}`);

    return {
      success: true,
      quizzes: response.quizzes
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Start quiz attempt
async function startQuizAttempt(quizId) {
  try {
    const response = await api.request(`/quizzes/${quizId}/attempts`, {
      method: 'POST'
    });

    return {
      success: true,
      attempt: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Submit quiz answer
async function submitQuizAnswer(attemptId, questionId, answer) {
  try {
    const response = await api.request(`/quizzes/attempts/${attemptId}/answers`, {
      method: 'POST',
      body: JSON.stringify({
        questionId,
        answer
      })
    });

    return {
      success: true,
      result: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Complete quiz
async function completeQuiz(attemptId) {
  try {
    const response = await api.request(`/quizzes/attempts/${attemptId}/complete`, {
      method: 'PUT'
    });

    return {
      success: true,
      results: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example - Quiz component
class QuizComponent {
  constructor(quizId) {
    this.quizId = quizId;
    this.attemptId = null;
    this.currentQuestion = 0;
    this.answers = {};
  }

  async startQuiz() {
    const attemptResult = await startQuizAttempt(this.quizId);
    if (attemptResult.success) {
      this.attemptId = attemptResult.attempt.attemptId;
      this.questions = attemptResult.attempt.questions;
      this.renderCurrentQuestion();
    }
  }

  async submitAnswer(questionId, answer) {
    this.answers[questionId] = answer;
    
    const result = await submitQuizAnswer(this.attemptId, questionId, answer);
    if (result.success) {
      console.log('Answer submitted successfully');
    }
  }

  async finishQuiz() {
    const results = await completeQuiz(this.attemptId);
    if (results.success) {
      this.displayResults(results.results);
    }
  }

  renderCurrentQuestion() {
    const question = this.questions[this.currentQuestion];
    // Render question UI
  }

  displayResults(results) {
    console.log('Quiz completed!');
    console.log(`Score: ${results.score}/${results.totalQuestions}`);
    console.log(`Passed: ${results.passed}`);
    // Update UI with results
  }
}
```

## 🏆 Certificate Management

### Certificate Generation
```javascript
// Generate certificate
async function generateCertificate(courseId, templateId = null) {
  try {
    const response = await api.request('/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        courseId,
        templateId
      })
    });

    return {
      success: true,
      certificate: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get user certificates
async function getUserCertificates() {
  try {
    const response = await api.request('/certificates/user/my');

    return {
      success: true,
      certificates: response.certificates
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Download certificate
async function downloadCertificate(certificateId) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/certificates/${certificateId}/download`, {
      headers: getHeaders()
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${certificateId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return {
      success: true,
      message: 'Certificate downloaded successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Check certificate eligibility
async function checkCertificateEligibility(courseId) {
  try {
    const response = await api.request(`/certificates/eligibility/${courseId}`);

    return {
      success: true,
      eligibility: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const certificateResult = await generateCertificate('course-123');
if (certificateResult.success) {
  console.log('Certificate generated successfully');
  console.log('Verification code:', certificateResult.certificate.verificationCode);
  
  // Show download button
  const downloadBtn = document.getElementById('download-certificate');
  downloadBtn.addEventListener('click', () => {
    downloadCertificate(certificateResult.certificate.certificateId);
  });
}
```

## 🔔 Notification Management

### Notification Preferences
```javascript
// Get notification preferences
async function getNotificationPreferences() {
  try {
    const response = await api.request('/notifications/preferences');

    return {
      success: true,
      preferences: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Update notification preferences
async function updateNotificationPreferences(preferences) {
  try {
    const response = await api.request('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });

    return {
      success: true,
      preferences: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get user notifications
async function getUserNotifications() {
  try {
    const response = await api.request('/notifications');

    return {
      success: true,
      notifications: response.notifications
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
  try {
    const response = await api.request(`/notifications/${notificationId}/read`, {
      method: 'PUT'
    });

    return {
      success: true,
      notification: response.notification
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Usage example
const notificationPrefs = {
  email: true,
  sms: false,
  push: true,
  marketing: false
};

const prefsResult = await updateNotificationPreferences(notificationPrefs);
if (prefsResult.success) {
  console.log('Notification preferences updated');
}
```

## 🎥 Media Management

### File Upload
```javascript
// Upload media file
async function uploadMedia(file, lessonId = null, title = null, description = null) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (lessonId) formData.append('lessonId', lessonId);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await fetch(`${API_CONFIG.BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return {
      success: true,
      media: data
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Get media details
async function getMediaDetails(mediaId) {
  try {
    const response = await api.request(`/media/${mediaId}`);

    return {
      success: true,
      media: response
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Stream media
function getStreamingUrl(mediaId) {
  const token = localStorage.getItem('accessToken');
  return `${API_CONFIG.BASE_URL}/media/${mediaId}/stream?token=${token}`;
}

// Usage example - File upload component
class MediaUploader {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.setupUploadArea();
  }

  setupUploadArea() {
    const uploadArea = document.createElement('div');
    uploadArea.innerHTML = `
      <input type="file" id="file-input" accept="video/*,audio/*,image/*,.pdf" multiple>
      <div class="upload-progress" style="display: none;">
        <div class="progress-bar"></div>
        <span class="progress-text">0%</span>
      </div>
    `;
    
    this.container.appendChild(uploadArea);
    
    const fileInput = uploadArea.querySelector('#file-input');
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e.target.files);
    });
  }

  async handleFileSelection(files) {
    for (const file of files) {
      await this.uploadFile(file);
    }
  }

  async uploadFile(file) {
    const progressBar = this.container.querySelector('.progress-bar');
    const progressText = this.container.querySelector('.progress-text');
    const progressContainer = this.container.querySelector('.upload-progress');
    
    progressContainer.style.display = 'block';
    
    // Simulate upload progress (in real implementation, use XMLHttpRequest for progress)
    const uploadResult = await uploadMedia(file);
    
    if (uploadResult.success) {
      progressBar.style.width = '100%';
      progressText.textContent = '100%';
      console.log('Upload successful:', uploadResult.media);
    } else {
      console.error('Upload failed:', uploadResult.message);
    }
    
    setTimeout(() => {
      progressContainer.style.display = 'none';
    }, 2000);
  }
}
```

## 📊 TypeScript Interfaces

### User Interfaces
```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredLanguage: string;
  timezone: string;
  hasCompletedOnboarding: boolean;
  isFirstLogin: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  preferredLanguage: string;
  timezone: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

### Course Interfaces
```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  thumbnailUrl?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  studentsCount: number;
  rating: number;
  category: string;
  tags: string[];
  prerequisites: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  duration?: number; // in minutes
  videoUrl?: string;
  pdfUrl?: string;
  isCompleted: boolean;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CourseEnrollment {
  id: string;
  courseId: string;
  userId: string;
  course: Course;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  status: 'active' | 'completed' | 'dropped';
}
```

### Progress Interfaces
```typescript
interface LessonProgress {
  id: string;
  lessonId: string;
  userId: string;
  courseId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  position: number;
  timeSpent: number; // in seconds
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
}

interface CourseProgress {
  courseId: string;
  userId: string;
  overallProgress: number; // 0-100
  lessonsCompleted: number;
  totalLessons: number;
  timeSpent: number; // in seconds
  completedAt?: Date;
  lastAccessedAt: Date;
}

interface LearningAnalytics {
  totalTimeSpent: number; // in seconds
  coursesInProgress: number;
  coursesCompleted: number;
  streakDays: number;
  weeklyProgress: {
    week: string;
    timeSpent: number;
    lessonsCompleted: number;
  }[];
  monthlyProgress: {
    month: string;
    timeSpent: number;
    coursesCompleted: number;
  }[];
}
```

### Quiz Interfaces
```typescript
interface Quiz {
  id: string;
  title: string;
  description: string;
  lessonId: string;
  timeLimit?: number; // in minutes
  attemptsAllowed: number;
  passingScore: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Question {
  id: string;
  quizId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: any;
  points: number;
  order: number;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  timeLimit?: number;
  score?: number;
  totalQuestions: number;
  correctAnswers?: number;
  passed?: boolean;
  status: 'in_progress' | 'completed' | 'abandoned';
}

interface QuizResults {
  attemptId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  passed: boolean;
  completedAt: Date;
  timeSpent: number;
  answers: {
    questionId: string;
    answer: any;
    isCorrect: boolean;
    points: number;
  }[];
}
```

### Certificate Interfaces
```typescript
interface Certificate {
  id: string;
  courseId: string;
  userId: string;
  templateId?: string;
  verificationCode: string;
  issuedAt: Date;
  isRevoked: boolean;
  downloadUrl: string;
  course: {
    title: string;
    instructor: string;
  };
  recipient: {
    name: string;
    email: string;
  };
}

interface CertificateEligibility {
  eligible: boolean;
  requirements: {
    courseCompleted: boolean;
    quizPassed: boolean;
    certificateGenerated: boolean;
  };
  missingRequirements: string[];
}
```

## 🛡️ Security Best Practices

### Token Management
```javascript
// Secure token storage
class TokenManager {
  static setTokens(accessToken, refreshToken) {
    // Store in localStorage (consider httpOnly cookies for production)
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Set expiration checking
    this.scheduleTokenRefresh(accessToken);
  }

  static getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  static getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  static clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  static isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  }

  static scheduleTokenRefresh(token) {
    if (this.isTokenExpired(token)) return;
    
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000;
    const refreshTime = expirationTime - Date.now() - (5 * 60 * 1000); // 5 minutes before expiration
    
    if (refreshTime > 0) {
      setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
    }
  }

  static async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const tokens = await response.json();
        this.setTokens(tokens.accessToken, tokens.refreshToken);
      } else {
        this.clearTokens();
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      window.location.href = '/login';
    }
  }
}
```

### Input Validation
```javascript
// Client-side validation utilities
class ValidationUtils {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  static validatePhone(phone) {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  static sanitizeInput(input) {
    return input.trim().replace(/[<>]/g, '');
  }
}

// Usage in forms
function validateRegistrationForm(formData) {
  const errors = {};

  if (!ValidationUtils.validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!ValidationUtils.validatePassword(formData.password)) {
    errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
  }

  if (formData.phone && !ValidationUtils.validatePhone(formData.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
```

## 🔧 Error Handling

### Global Error Handler
```javascript
// Global error handling system
class ErrorHandler {
  static handleApiError(error, context = 'API') {
    console.error(`[${context}] Error:`, error);

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logToExternalService(error, context);
    }

    // Show user-friendly message
    return this.getUserFriendlyMessage(error);
  }

  static getUserFriendlyMessage(error) {
    if (error.message.includes('Network')) {
      return 'Please check your internet connection and try again.';
    } else if (error.message.includes('401')) {
      return 'Your session has expired. Please log in again.';
    } else if (error.message.includes('403')) {
      return 'You do not have permission to perform this action.';
    } else if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    } else if (error.message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    } else {
      return 'An unexpected error occurred. Please try again later.';
    }
  }

  static logToExternalService(error, context) {
    // Example: Send to Sentry, LogRocket, etc.
    console.log('Would log to external service:', { error, context });
  }
}

// Usage in API calls
async function safeApiCall(apiFunction, ...args) {
  try {
    return await apiFunction(...args);
  } catch (error) {
    const userMessage = ErrorHandler.handleApiError(error, apiFunction.name);
    
    // Show toast notification
    showToast(userMessage, 'error');
    
    return {
      success: false,
      message: userMessage
    };
  }
}
```

### Retry Logic
```javascript
// Retry mechanism for failed requests
class RetryHandler {
  static async withRetry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.message.includes('401') || error.message.includes('403')) {
          throw error;
        }
        
        // Wait before retrying
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
}

// Usage
const coursesResult = await RetryHandler.withRetry(
  () => getCourses({ limit: 10 }),
  3,
  1000
);
```

## 📱 React Integration Examples

### Authentication Context
```jsx
// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('accessToken');
    if (token && !TokenManager.isTokenExpired(token)) {
      // Verify token and get user info
      getUserProfile().then(result => {
        if (result.success) {
          setUser(result.user);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const result = await loginUser({ email, password });
    if (result.success) {
      setUser(result.user);
      TokenManager.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    }
    return result;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    TokenManager.clearTokens();
  };

  const register = async (userData) => {
    return await registerUser(userData);
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Course Component
```jsx
// CourseCard.js
import React from 'react';
import { useAuth } from './AuthContext';

const CourseCard = ({ course }) => {
  const { user } = useAuth();
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      // Redirect to login
      return;
    }

    setLoading(true);
    const result = await enrollInCourse(course.id);
    
    if (result.success) {
      setEnrolled(true);
      // Show success message
    } else {
      // Show error message
    }
    
    setLoading(false);
  };

  return (
    <div className="course-card">
      <img src={course.thumbnailUrl} alt={course.title} />
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <div className="course-meta">
        <span className="level">{course.level}</span>
        <span className="duration">{course.duration} min</span>
        <span className="rating">⭐ {course.rating}</span>
      </div>
      <button 
        onClick={handleEnroll} 
        disabled={loading || enrolled}
        className={enrolled ? 'enrolled' : 'enroll-btn'}
      >
        {loading ? 'Enrolling...' : enrolled ? 'Enrolled' : 'Enroll'}
      </button>
    </div>
  );
};
```

## 🎯 Real-World Implementation Examples

### Complete Login Form
```jsx
// LoginForm.js
import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!ValidationUtils.validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      setErrors({ general: result.message });
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Login</h2>
      
      {errors.general && (
        <div className="error-message">{errors.general}</div>
      )}
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={errors.email ? 'error' : ''}
          required
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={errors.password ? 'error' : ''}
          required
        />
        {errors.password && <span className="error-text">{errors.password}</span>}
      </div>
      
      <button type="submit" disabled={loading} className="submit-btn">
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      
      <div className="form-links">
        <a href="/forgot-password">Forgot Password?</a>
        <a href="/register">Don't have an account? Sign up</a>
      </div>
    </form>
  );
};
```

### Progress Tracking Component
```jsx
// ProgressTracker.js
import React, { useState, useEffect } from 'react';

const ProgressTracker = ({ courseId }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [courseId]);

  const loadProgress = async () => {
    setLoading(true);
    const result = await getCourseProgress(courseId);
    
    if (result.success) {
      setProgress(result.progress);
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div className="progress-loading">Loading progress...</div>;
  }

  if (!progress) {
    return <div className="progress-error">Unable to load progress</div>;
  }

  return (
    <div className="progress-tracker">
      <h3>Course Progress</h3>
      
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
        <span className="progress-text">
          {progress.overallProgress}% Complete
        </span>
      </div>
      
      <div className="progress-details">
        <div className="progress-stat">
          <span className="stat-label">Lessons Completed</span>
          <span className="stat-value">
            {progress.lessonsCompleted}/{progress.totalLessons}
          </span>
        </div>
        
        <div className="progress-stat">
          <span className="stat-label">Time Spent</span>
          <span className="stat-value">
            {Math.floor(progress.timeSpent / 3600)}h {Math.floor((progress.timeSpent % 3600) / 60)}m
          </span>
        </div>
        
        {progress.completedAt && (
          <div className="progress-stat">
            <span className="stat-label">Completed</span>
            <span className="stat-value">
              {new Date(progress.completedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 📋 Testing Your Integration

### Testing Checklist
```javascript
// Integration Testing Checklist
const integrationTests = [
  {
    name: 'User Registration',
    test: async () => {
      const result = await registerUser({
        email: 'test@example.com',
        fullName: 'Test User',
        password: 'TestPass123'
      });
      return result.success;
    }
  },
  {
    name: 'User Login',
    test: async () => {
      const result = await loginUser({
        email: 'test@example.com',
        password: 'TestPass123'
      });
      return result.success && result.tokens;
    }
  },
  {
    name: 'Get Courses',
    test: async () => {
      const result = await getCourses({ limit: 5 });
      return result.success && result.courses.length > 0;
    }
  },
  {
    name: 'Course Enrollment',
    test: async () => {
      const courses = await getCourses({ limit: 1 });
      if (courses.success && courses.courses.length > 0) {
        const result = await enrollInCourse(courses.courses[0].id);
        return result.success;
      }
      return false;
    }
  }
];

// Run integration tests
async function runIntegrationTests() {
  console.log('Running integration tests...');
  
  for (const testCase of integrationTests) {
    try {
      const passed = await testCase.test();
      console.log(`✅ ${testCase.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
    }
  }
}
```

## 🔄 Production Considerations

### Environment Configuration
```javascript
// config.js
const config = {
  development: {
    API_BASE_URL: 'http://localhost:3000/api/v1',
    WEBSOCKET_URL: 'ws://localhost:3000/ws',
    ENVIRONMENT: 'development'
  },
  production: {
    API_BASE_URL: 'https://api.uvarsity.com/api/v1',
    WEBSOCKET_URL: 'wss://api.uvarsity.com/ws',
    ENVIRONMENT: 'production'
  }
};

export const getConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return config[env];
};
```

### Performance Optimization
```javascript
// Caching utilities
class CacheManager {
  static cache = new Map();
  static ttl = 5 * 60 * 1000; // 5 minutes

  static set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  static get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  static clear() {
    this.cache.clear();
  }
}

// Usage with API calls
async function getCachedCourses(filters = {}) {
  const cacheKey = `courses-${JSON.stringify(filters)}`;
  
  // Check cache first
  const cached = CacheManager.get(cacheKey);
  if (cached) {
    return { success: true, courses: cached, fromCache: true };
  }
  
  // Fetch from API
  const result = await getCourses(filters);
  if (result.success) {
    CacheManager.set(cacheKey, result.courses);
  }
  
  return result;
}
```

## 🎉 Getting Started Steps

1. **Set up the backend** (see [README.md](README.md) for detailed instructions)
2. **Configure your frontend** with the API client setup above
3. **Implement authentication** using the provided examples
4. **Start with course listing** and user enrollment
5. **Add progress tracking** for a complete learning experience
6. **Implement quizzes** and certificate generation
7. **Test thoroughly** using the integration tests
8. **Deploy to production** with proper environment configuration

## 📞 Support & Resources

- **🔗 API Documentation**: http://localhost:3000/api/v1/docs (Interactive Swagger UI)
- **🏥 Health Check**: http://localhost:3000/api/v1/health
- **📊 Performance Metrics**: http://localhost:3000/api/v1/performance/metrics
- **📚 Full Documentation**: [README.md](README.md)
- **🛠️ Development Guide**: [DEVELOPMENT.md](DEVELOPMENT.md)

## 🚀 Next Steps

The Uvarsity Backend is **100% complete** and ready for production use. All 8 services are implemented with comprehensive testing and documentation. Your frontend team can now:

1. **Start Integration**: Use this guide to begin API integration
2. **Build User Interfaces**: Create forms, dashboards, and interactive components
3. **Implement Features**: Add course browsing, learning progress, quizzes, and certificates
4. **Test Thoroughly**: Use the provided examples and testing utilities
5. **Deploy**: Launch your complete learning platform

---

**Built with ❤️ by the Uvarsity Team**

*This integration guide provides everything needed to build a modern, scalable frontend for the Uvarsity Learning Platform. The backend is production-ready and fully tested.*