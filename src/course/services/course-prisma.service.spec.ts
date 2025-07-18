import { Test, TestingModule } from '@nestjs/testing';
import { CoursePrismaService } from './course-prisma.service';
import { PrismaService } from '../../database/prisma.service';
import { LoggerService } from '../../common/services/logger.service';

describe('CoursePrismaService', () => {
  let service: CoursePrismaService;
  let prismaService: PrismaService;
  let loggerService: LoggerService;

  const mockPrismaService = {
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockLoggerService = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursePrismaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<CoursePrismaService>(CoursePrismaService);
    prismaService = module.get<PrismaService>(PrismaService);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should find a course by ID', async () => {
      const courseId = 'test-course-id';
      const mockCourse = {
        id: courseId,
        title: 'Test Course',
        description: 'Test course description',
        summary: 'Test summary',
        thumbnailUrl: null,
        category: 'Technology',
        tags: '["programming", "javascript"]',
        level: 'beginner',
        estimatedDuration: 10,
        language: 'en',
        instructorId: 'instructor-id',
        status: 'published',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        archivedAt: null,
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findById(courseId);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: courseId },
      });
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        `Course lookup by ID: ${courseId} - Found`,
        'CoursePrismaService',
      );
    });

    it('should return null when course not found', async () => {
      const courseId = 'non-existent-id';
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      const result = await service.findById(courseId);

      expect(result).toBeNull();
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        `Course lookup by ID: ${courseId} - Not found`,
        'CoursePrismaService',
      );
    });

    it('should handle errors gracefully', async () => {
      const courseId = 'test-course-id';
      const error = new Error('Database error');
      mockPrismaService.course.findUnique.mockRejectedValue(error);

      await expect(service.findById(courseId)).rejects.toThrow('Database error');
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        `Failed to find course by ID: ${courseId}`,
        'CoursePrismaService',
        error.stack,
      );
    });
  });

  describe('findByInstructor', () => {
    it('should find courses by instructor ID', async () => {
      const instructorId = 'instructor-id';
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Course 1',
          description: 'Description 1',
          summary: null,
          thumbnailUrl: null,
          category: 'Technology',
          tags: '[]',
          level: 'beginner',
          estimatedDuration: 10,
          language: 'en',
          instructorId: instructorId,
          status: 'published',
          pricing: '{"type":"free","price":0,"currency":"USD"}',
          enrollmentSettings: '{"isOpen":true}',
          prerequisites: '[]',
          learningObjectives: '[]',
          enrollmentCount: 0,
          averageRating: 0,
          ratingCount: 0,
          completionRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          archivedAt: null,
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findByInstructor(instructorId);

      expect(result).toEqual(mockCourses);
      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: { instructorId },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockLoggerService.debug).toHaveBeenCalledWith(
        `Found ${mockCourses.length} courses for instructor: ${instructorId}`,
        'CoursePrismaService',
      );
    });
  });

  describe('findByCategory', () => {
    it('should find courses by category', async () => {
      const category = 'Technology';
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Course 1',
          description: 'Description 1',
          summary: null,
          thumbnailUrl: null,
          category: category,
          tags: '[]',
          level: 'beginner',
          estimatedDuration: 10,
          language: 'en',
          instructorId: 'instructor-id',
          status: 'published',
          pricing: '{"type":"free","price":0,"currency":"USD"}',
          enrollmentSettings: '{"isOpen":true}',
          prerequisites: '[]',
          learningObjectives: '[]',
          enrollmentCount: 0,
          averageRating: 0,
          ratingCount: 0,
          completionRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          archivedAt: null,
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.findByCategory(category);

      expect(result).toEqual(mockCourses);
      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: { 
          category,
          status: 'published',
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new course', async () => {
      const courseData = {
        title: 'New Course',
        description: 'Course description',
        category: 'Technology',
        instructorId: 'instructor-id',
      };

      const mockCourse = {
        id: 'generated-id',
        ...courseData,
        summary: null,
        thumbnailUrl: null,
        tags: '[]',
        level: 'beginner',
        estimatedDuration: null,
        language: 'en',
        status: 'draft',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true,"maxEnrollments":null,"enrollmentDeadline":null}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        archivedAt: null,
      };

      mockPrismaService.course.create.mockResolvedValue(mockCourse);

      const result = await service.create(courseData);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          instructorId: courseData.instructorId,
          level: 'beginner',
          language: 'en',
          tags: '[]',
          prerequisites: '[]',
          learningObjectives: '[]',
        }),
      });
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        `Course created successfully: ${courseData.title} (ID: ${mockCourse.id})`,
        'CoursePrismaService',
      );
    });
  });

  describe('update', () => {
    it('should update a course', async () => {
      const courseId = 'course-id';
      const updateData = { title: 'Updated Title' };
      const mockCourse = {
        id: courseId,
        title: 'Updated Title',
        description: 'Course description',
        summary: null,
        thumbnailUrl: null,
        category: 'Technology',
        tags: '[]',
        level: 'beginner',
        estimatedDuration: null,
        language: 'en',
        instructorId: 'instructor-id',
        status: 'draft',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        archivedAt: null,
      };

      mockPrismaService.course.update.mockResolvedValue(mockCourse);

      const result = await service.update(courseId, updateData);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: updateData,
      });
    });
  });

  describe('publish', () => {
    it('should publish a course', async () => {
      const courseId = 'course-id';
      const mockCourse = {
        id: courseId,
        title: 'Course Title',
        description: 'Course description',
        summary: null,
        thumbnailUrl: null,
        category: 'Technology',
        tags: '[]',
        level: 'beginner',
        estimatedDuration: null,
        language: 'en',
        instructorId: 'instructor-id',
        status: 'published',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        archivedAt: null,
      };

      mockPrismaService.course.update.mockResolvedValue(mockCourse);

      const result = await service.publish(courseId);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: {
          status: 'published',
          publishedAt: expect.any(Date),
        },
      });
    });
  });

  describe('archive', () => {
    it('should archive a course', async () => {
      const courseId = 'course-id';
      const mockCourse = {
        id: courseId,
        title: 'Course Title',
        description: 'Course description',
        summary: null,
        thumbnailUrl: null,
        category: 'Technology',
        tags: '[]',
        level: 'beginner',
        estimatedDuration: null,
        language: 'en',
        instructorId: 'instructor-id',
        status: 'archived',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 0,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        archivedAt: new Date(),
      };

      mockPrismaService.course.update.mockResolvedValue(mockCourse);

      const result = await service.archive(courseId);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: {
          status: 'archived',
          archivedAt: expect.any(Date),
        },
      });
    });
  });

  describe('findMany', () => {
    it('should return paginated courses', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Course 1',
          description: 'Description 1',
          summary: null,
          thumbnailUrl: null,
          category: 'Technology',
          tags: '[]',
          level: 'beginner',
          estimatedDuration: null,
          language: 'en',
          instructorId: 'instructor-id',
          status: 'published',
          pricing: '{"type":"free","price":0,"currency":"USD"}',
          enrollmentSettings: '{"isOpen":true}',
          prerequisites: '[]',
          learningObjectives: '[]',
          enrollmentCount: 0,
          averageRating: 0,
          ratingCount: 0,
          completionRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          archivedAt: null,
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);
      mockPrismaService.course.count.mockResolvedValue(1);

      const result = await service.findMany(1, 10);

      expect(result).toEqual({
        courses: mockCourses,
        total: 1,
        totalPages: 1,
      });
      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('updateEnrollmentCount', () => {
    it('should increment enrollment count', async () => {
      const courseId = 'course-id';
      const mockCourse = {
        id: courseId,
        title: 'Course Title',
        description: 'Course description',
        summary: null,
        thumbnailUrl: null,
        category: 'Technology',
        tags: '[]',
        level: 'beginner',
        estimatedDuration: null,
        language: 'en',
        instructorId: 'instructor-id',
        status: 'published',
        pricing: '{"type":"free","price":0,"currency":"USD"}',
        enrollmentSettings: '{"isOpen":true}',
        prerequisites: '[]',
        learningObjectives: '[]',
        enrollmentCount: 1,
        averageRating: 0,
        ratingCount: 0,
        completionRate: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: null,
        archivedAt: null,
      };

      mockPrismaService.course.update.mockResolvedValue(mockCourse);

      const result = await service.updateEnrollmentCount(courseId, true);

      expect(result).toEqual(mockCourse);
      expect(mockPrismaService.course.update).toHaveBeenCalledWith({
        where: { id: courseId },
        data: {
          enrollmentCount: { increment: 1 },
        },
      });
    });
  });

  describe('getFeaturedCourses', () => {
    it('should return featured courses', async () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Featured Course',
          description: 'High-rated course',
          summary: null,
          thumbnailUrl: null,
          category: 'Technology',
          tags: '[]',
          level: 'beginner',
          estimatedDuration: null,
          language: 'en',
          instructorId: 'instructor-id',
          status: 'published',
          pricing: '{"type":"free","price":0,"currency":"USD"}',
          enrollmentSettings: '{"isOpen":true}',
          prerequisites: '[]',
          learningObjectives: '[]',
          enrollmentCount: 15,
          averageRating: 4.5,
          ratingCount: 10,
          completionRate: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          publishedAt: null,
          archivedAt: null,
        },
      ];

      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);

      const result = await service.getFeaturedCourses(6);

      expect(result).toEqual(mockCourses);
      expect(mockPrismaService.course.findMany).toHaveBeenCalledWith({
        where: {
          status: 'published',
          averageRating: { gte: 4.0 },
          enrollmentCount: { gte: 10 },
        },
        orderBy: [
          { averageRating: 'desc' },
          { enrollmentCount: 'desc' },
        ],
        take: 6,
      });
    });
  });
});