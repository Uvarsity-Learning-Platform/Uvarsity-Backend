import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorHandlerService } from './common/services/error-handler.service';
import { LoggerService } from './common/services/logger.service';
import { ProcessMonitorService } from './common/services/process-monitor.service';

/**
 * Bootstrap function to initialize and start the Stellr Academy Backend application
 * This function sets up the NestJS application with all necessary configurations
 */
async function bootstrap() {
  // Create the NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Get configuration service to access environment variables
  const configService = app.get(ConfigService);

  // Get services for global exception filter
  const errorHandler = app.get(ErrorHandlerService);
  const logger = app.get(LoggerService);
  const processMonitor = app.get(ProcessMonitorService);

  // Set up global exception filter for robust error handling
  app.useGlobalFilters(new GlobalExceptionFilter(errorHandler, logger));

  // Set global API prefix for all routes (e.g., /api/v1/...)
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS (Cross-Origin Resource Sharing) for frontend communication
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Set up global validation pipe to automatically validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      // Automatically transform payloads to DTO instances
      transform: true,
      // Strip properties that are not defined in the DTO
      whitelist: true,
      // Throw an error if non-whitelisted properties are present
      forbidNonWhitelisted: true,
      // Transform primitive types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Set up Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Stellr Academy API')
    .setDescription(
      'Comprehensive Learning Platform Backend API - Handles authentication, courses, progress tracking, quizzes, certificates, and more',
    )
    .setVersion('1.0')
    .addBearerAuth() // Add JWT authentication to Swagger
    .addTag('Authentication', 'User registration, login, and token management')
    .addTag('Users', 'User profile and preferences management')
    .addTag('Courses', 'Course catalog and lesson content')
    .addTag('Progress', 'User learning progress tracking')
    .addTag('Quizzes', 'Quiz management and submissions')
    .addTag('Certificates', 'Certificate generation and management')
    .addTag('Notifications', 'Email and push notification services')
    .addTag('Media', 'Video and document management')
    .addTag('Health', 'Application health and monitoring')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Register shutdown handlers for graceful shutdown
  processMonitor.registerShutdownHandler(
    'database-cleanup',
    async () => {
      logger.log('Cleaning up database connections...', 'Bootstrap');
      await app.close();
    },
  );

  // Get the port from environment variables or default to 3000
  const port = configService.get<number>('PORT', 3000);

  // Start the application
  await app.listen(port);

  logger.log(`🚀 Stellr Academy Backend is running on port ${port}`, 'Bootstrap');
  logger.log(`📖 API Documentation available at http://localhost:${port}/${apiPrefix}/docs`, 'Bootstrap');
  logger.log(`🏥 Health check available at http://localhost:${port}/${apiPrefix}/health`, 'Bootstrap');
  logger.log(`🛡️ Global exception filter enabled for robust error handling`, 'Bootstrap');
  logger.log(`🔄 Process monitoring enabled for graceful shutdown`, 'Bootstrap');
}

// Start the application and handle any errors
bootstrap().catch((error) => {
  console.error('❌ Failed to start the application:', error);
  process.exit(1);
});