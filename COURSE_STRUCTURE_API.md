# Course Structure Endpoint Documentation

## Endpoint: GET /api/courses/{id}/structure

### Description
Returns the hierarchical structure of a course including modules and lessons, with proper JWT authentication and error handling.

### Authentication
- **Required**: JWT token in Authorization header
- **Header**: `Authorization: Bearer <jwt-token>`

### Parameters
- **id** (path parameter): Course UUID (required, validated)

### Responses

#### Success Response (200 OK)
```json
{
  "status": "success",
  "data": {
    "courseId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Introduction to Python",
    "modules": [
      {
        "id": "mod_1",
        "title": "Module 1: Python Basics",
        "order": 1,
        "lessons": [
          {
            "id": "les_1",
            "title": "Introduction to Python",
            "type": "VIDEO",
            "url": "https://example.com/video1.mp4",
            "order": 1
          },
          {
            "id": "les_2",
            "title": "Python Installation Guide",
            "type": "PDF",
            "url": "https://example.com/doc1.pdf",
            "order": 2
          }
        ]
      },
      {
        "id": "mod_2",
        "title": "Module 2: Data Structures",
        "order": 2,
        "lessons": [
          {
            "id": "les_3",
            "title": "Lists and Tuples Quiz",
            "type": "QUIZ",
            "url": "https://example.com/quiz1",
            "order": 1
          }
        ]
      }
    ]
  },
  "timestamp": "2025-07-29T12:30:00Z"
}
```

#### Error Responses

##### 401 Unauthorized
```json
{
  "status": "error",
  "data": null,
  "error": {
    "errorCode": 401,
    "message": "Unauthorized"
  },
  "timestamp": "2025-07-29T12:30:00Z"
}
```

##### 404 Not Found
```json
{
  "status": "error",
  "data": null,
  "error": {
    "errorCode": 404,
    "message": "Course not found"
  },
  "timestamp": "2025-07-29T12:30:00Z"
}
```

##### 400 Bad Request (Invalid UUID)
```json
{
  "status": "error",
  "data": null,
  "error": {
    "errorCode": 400,
    "message": "Validation failed (uuid is expected)"
  },
  "timestamp": "2025-07-29T12:30:00Z"
}
```

### Usage Examples

#### Using cURL
```bash
# Success case
curl -X GET \
  "http://localhost:4000/api/courses/123e4567-e89b-12d3-a456-426614174000/structure" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Missing token (401)
curl -X GET \
  "http://localhost:4000/api/courses/123e4567-e89b-12d3-a456-426614174000/structure"

# Invalid course ID (404)
curl -X GET \
  "http://localhost:4000/api/courses/invalid-id/structure" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Using JavaScript/Axios
```javascript
const axios = require('axios');

async function getCourseStructure(courseId, token) {
  try {
    const response = await axios.get(
      `http://localhost:4000/api/courses/${courseId}/structure`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Course structure:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
}

// Usage
getCourseStructure('123e4567-e89b-12d3-a456-426614174000', 'your-jwt-token');
```

### Implementation Details

#### Database Query
The endpoint uses Prisma to fetch the course with nested modules and lessons:
```typescript
const course = await this.databaseService.course.findUnique({
  where: { id: courseId },
  include: {
    modules: {
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
      },
    },
  },
});
```

#### Authentication Flow
1. JWT token extracted from Authorization header
2. Token validated and decoded
3. User lookup in database
4. Active user verification
5. Request proceeds if authentication successful

#### Error Handling
- **UUID Validation**: ParseUUIDPipe validates course ID format
- **Course Existence**: Service throws NotFoundException if course not found
- **Authentication**: JwtAuthGuard handles token validation
- **Global Exception Filter**: Formats all errors consistently

### Security Features
- JWT token required for access
- User must be active in database
- UUID validation prevents injection attacks
- Proper error handling without information leakage