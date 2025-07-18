import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ErrorHandlerService } from './common/services/error-handler.service';
import { LoggerService } from './common/services/logger.service';
import { ProcessMonitorService } from './common/services/process-monitor.service';
import { API_VERSIONING_CONFIG } from './common/config/versioning.config';

/**
 * Bootstrap function to initialize and start the Uvarsity Backend application
 * This function sets up the NestJS application with all necessary configurations
 */
async function bootstrap() {
  // Create the NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Enable shutdown hooks to integrate with custom graceful shutdown handlers
  app.enableShutdownHooks();

  // Get configuration service to access environment variables
  const configService = app.get(ConfigService);

  // Get services for global exception filter
  const errorHandler = app.get(ErrorHandlerService);
  const logger = app.get(LoggerService);
  const processMonitor = app.get(ProcessMonitorService);

  // Set up global exception filter for robust error handling
  app.useGlobalFilters(new GlobalExceptionFilter(errorHandler, logger));

  // Enable security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Set global API prefix for all routes (e.g., /api/v1/...)
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Enable API versioning with URI-based versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

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
    .setTitle('Uvarsity API')
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
  SwaggerModule.setup(`${apiPrefix}/v1/docs`, app, document, {
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

  logger.log(`🚀 Uvarsity Backend is running on port ${port}`, 'Bootstrap');
  logger.log(`📖 API Documentation available at http://localhost:${port}/${apiPrefix}/v1/docs`, 'Bootstrap');
  logger.log(`🏥 Health check available at http://localhost:${port}/${apiPrefix}/v1/health`, 'Bootstrap');
  logger.log(`📊 Performance metrics available at http://localhost:${port}/${apiPrefix}/v1/performance/metrics`, 'Bootstrap');
  logger.log(`🛡️ Global exception filter enabled for robust error handling`, 'Bootstrap');
  logger.log(`🔄 Process monitoring enabled for graceful shutdown`, 'Bootstrap');
  logger.log(`⚡ Rate limiting enabled (100 requests per minute)`, 'Bootstrap');
  logger.log(`🔒 Security headers enabled with Helmet`, 'Bootstrap');
  logger.log(`📈 Performance monitoring enabled`, 'Bootstrap');
  logger.log(`🔢 API versioning enabled (versions: 1, 2)`, 'Bootstrap');
}

// Start the application and handle any errors
bootstrap().catch((error) => {
  console.error('❌ Failed to start the application:', error);
  process.exit(1);
});