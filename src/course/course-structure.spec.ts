import { Test, TestingModule } from '@nestjs/testing';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotFoundException } from '@nestjs/common';

describe('CourseController - Structure Endpoint', () => {
  let controller: CourseController;
  let service: CourseService;

  const mockCourseService = {
    getStructure: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        {
          provide: CourseService,
          useValue: mockCourseService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CourseService>(CourseService);
  });

  describe('getStructure', () => {
    const courseId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return course structure when course exists', async () => {
      const expectedResult = {
        status: 'success',
        data: {
          courseId: courseId,
          title: 'Introduction to Python',
          modules: [
            {
              id: 'mod_1',
              title: 'Module 1',
              order: 1,
              lessons: [
                {
                  id: 'les_1',
                  title: 'Lesson 1',
                  type: 'VIDEO',
                  url: 'https://example.com/video1.mp4',
                  order: 1,
                },
              ],
            },
          ],
        },
        timestamp: '2025-07-29T12:30:00Z',
      };

      mockCourseService.getStructure.mockResolvedValue(expectedResult);

      const result = await controller.getStructure(courseId);

      expect(service.getStructure).toHaveBeenCalledWith(courseId);
      expect(result).toEqual(expectedResult);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      mockCourseService.getStructure.mockRejectedValue(
        new NotFoundException('Course not found'),
      );

      await expect(controller.getStructure(courseId)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getStructure).toHaveBeenCalledWith(courseId);
    });

    it('should require JWT authentication', () => {
      // This test verifies that the JwtAuthGuard is applied to the endpoint
      const guards = Reflect.getMetadata('__guards__', controller.getStructure);
      expect(guards).toBeDefined();
    });
  });
});