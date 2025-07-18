import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Certificate } from './entities/certificate.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { User } from '../user/entities/user.entity';
import { Course } from '../course/entities/course.entity';
import { CourseEnrollment } from '../course/entities/course-enrollment.entity';

import { CertificateService } from './services/certificate.service';
import { CertificateController } from './controllers/certificate.controller';

import { CommonModule } from '../common/common.module';

/**
 * Certificate Module for Stellr Academy Backend
 * 
 * This module handles certificate generation and management:
 * 
 * 🏆 Certificate Generation:
 * - PDF certificate creation
 * - Custom certificate templates
 * - Dynamic content insertion
 * - Digital signature and validation
 * 
 * 📜 Certificate Management:
 * - Certificate storage and retrieval
 * - Download and sharing capabilities
 * - Verification system
 * - Certificate history tracking
 * 
 * ✅ Eligibility & Validation:
 * - Course completion verification
 * - Quiz score requirements
 * - Progress milestone validation
 * - Automated certificate issuance
 */
@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Certificate,
      CertificateTemplate,
      User,
      Course,
      CourseEnrollment,
    ]),
  ],
  controllers: [
    CertificateController,
  ],
  providers: [
    CertificateService,
  ],
  exports: [
    CertificateService,
  ],
})
export class CertificateModule {
  constructor() {
    console.log('🏆 Certificate module initialized - Digital certificates ready');
  }
}