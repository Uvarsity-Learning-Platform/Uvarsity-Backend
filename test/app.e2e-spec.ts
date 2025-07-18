import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * End-to-End Test Suite for Uvarsity Backend
 * 
 * This test suite verifies the complete application functionality
 * by testing HTTP endpoints and full request/response cycles.
 * 
 * Tests cover:
 * - Application bootstrap and initialization
 * - Health check endpoints
 * - Basic API response format
 * - Error handling and validation
 */
describe('Uvarsity Backend (e2e)', () => {
  let app: INestApplication;

  // Setup test application before all tests
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await app.close();
  });

  /**
   * Test basic health check endpoint
   * Verifies that the application is running and responding
   */
  describe('Health Check', () => {
    it('/api/v1/health (GET) - should return basic health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('uptime');
          expect(res.body).toHaveProperty('service', 'stellr-academy-backend');
        });
    });

    it('/api/v1/health/detailed (GET) - should return detailed health information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/detailed')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'healthy');
          expect(res.body).toHaveProperty('memory');
          expect(res.body).toHaveProperty('database');
          expect(res.body).toHaveProperty('services');
        });
    });

    it('/api/v1/health/ready (GET) - should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ready');
        });
    });

    it('/api/v1/health/live (GET) - should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'alive');
        });
    });
  });

  /**
   * Test authentication endpoints
   * Verifies auth endpoints are accessible and return expected responses
   */
  describe('Authentication', () => {
    it('/api/v1/auth/register (POST) - should handle registration request', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
          fullName: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('/api/v1/auth/login (POST) - should handle login request', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  /**
   * Test error handling
   * Verifies that the application handles errors gracefully
   */
  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', () => {
      return request(app.getHttpServer())
        .get('/api/v1/non-existent-endpoint')
        .expect(404);
    });

    it('should handle malformed JSON requests', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send('invalid-json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });
  });
});