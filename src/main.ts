import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
const compression = require('compression'); 
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as express from 'express'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? ['https://stellr-learning-platform.vercel.app/']
      : true,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // ensure raw body for Paystack webhook route BEFORE listen
  // mount on the prefixed path so express.raw runs for /api/v1/payments/webhook
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

  const port = configService.get<number>('PORT') || parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${configService.get<string>('NODE_ENV') || process.env.NODE_ENV}`);
}
bootstrap();
