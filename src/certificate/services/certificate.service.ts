import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { LoggerService } from '../../common/services/logger.service';
import { Certificate } from '../entities/certificate.entity';
import { CertificateTemplate } from '../entities/certificate-template.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { CourseEnrollment } from '../../course/entities/course-enrollment.entity';

/**
 * Certificate Service for Stellr Academy Backend
 * 
 * This service handles all certificate-related business logic:
 * - Certificate generation and issuance
 * - Template management
 * - Certificate verification
 * - PDF generation
 * - Blockchain validation
 */
@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(CertificateTemplate)
    private readonly templateRepository: Repository<CertificateTemplate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Check if user is eligible for certificate
   */
  async checkCertificateEligibility(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (!enrollment) {
      return false;
    }

    // Check if course is completed
    if (!enrollment.isCompleted) {
      return false;
    }

    // Check if user has passing score (if required)
    if (enrollment.finalScore !== null && enrollment.finalScore < 70) {
      return false;
    }

    return true;
  }

  /**
   * Generate certificate for user
   */
  async generateCertificate(userId: string, courseId: string, templateId?: string): Promise<Certificate> {
    this.logger.log(`Generating certificate for user ${userId} and course ${courseId}`, 'CertificateService');

    // Check if user is eligible
    const isEligible = await this.checkCertificateEligibility(userId, courseId);
    if (!isEligible) {
      throw new BadRequestException('User is not eligible for certificate');
    }

    // Check if certificate already exists
    const existingCertificate = await this.certificateRepository.findOne({
      where: { userId, courseId },
    });

    if (existingCertificate) {
      throw new BadRequestException('Certificate already exists for this user and course');
    }

    // Get user and course details
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });

    if (!user || !course || !enrollment) {
      throw new NotFoundException('User, course, or enrollment not found');
    }

    // Get template
    const template = await this.getTemplate(templateId);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();

    // Create certificate
    const certificate = this.certificateRepository.create({
      userId,
      courseId,
      title: `Certificate of Completion - ${course.title}`,
      description: `This certificate confirms that ${user.fullName} has successfully completed the course "${course.title}".`,
      verificationCode,
      templateId: template.id,
      issuedAt: new Date(),
      metadata: {
        completionScore: enrollment.finalScore || 0,
        totalLessons: enrollment.totalLessons,
        completedLessons: enrollment.lessonsCompleted,
        timeSpent: enrollment.timeSpentMinutes,
        completionDate: enrollment.completedAt,
        instructorName: 'Stellr Academy',
        courseDuration: course.estimatedDuration,
        skillsAcquired: course.learningObjectives || [],
        certificateVersion: '1.0',
      },
    });

    // Save certificate
    const savedCertificate = await this.certificateRepository.save(certificate);

    // Generate PDF (placeholder for now)
    await this.generatePDF(savedCertificate, user, course, template);

    // Update template usage
    template.incrementUsage();
    await this.templateRepository.save(template);

    this.logger.log(`Certificate generated successfully: ${savedCertificate.id}`, 'CertificateService');
    return savedCertificate;
  }

  /**
   * Get certificate by ID
   */
  async getCertificateById(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: ['user', 'course'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  /**
   * Get certificates for user
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { userId },
      relations: ['course'],
      order: { issuedAt: 'DESC' },
    });
  }

  /**
   * Get certificate by verification code
   */
  async verifyCertificate(verificationCode: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationCode },
      relations: ['user', 'course'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    // Update verification count
    certificate.verificationCount++;
    certificate.lastVerifiedAt = new Date();
    await this.certificateRepository.save(certificate);

    this.logger.log(`Certificate verified: ${certificate.id}`, 'CertificateService');
    return certificate;
  }

  /**
   * Download certificate
   */
  async downloadCertificate(certificateId: string, userId: string): Promise<Buffer> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId, userId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (!certificate.isValid()) {
      throw new BadRequestException('Certificate is not valid');
    }

    // Update download count
    certificate.downloadCount++;
    certificate.lastDownloadedAt = new Date();
    await this.certificateRepository.save(certificate);

    // Return PDF buffer (placeholder)
    return Buffer.from('PDF content placeholder');
  }

  /**
   * Revoke certificate
   */
  async revokeCertificate(certificateId: string, reason?: string): Promise<Certificate> {
    const certificate = await this.getCertificateById(certificateId);

    certificate.revoke(reason);
    const revokedCertificate = await this.certificateRepository.save(certificate);

    this.logger.log(`Certificate revoked: ${certificateId}`, 'CertificateService');
    return revokedCertificate;
  }

  /**
   * Create certificate template
   */
  async createTemplate(templateData: any, createdBy: string): Promise<CertificateTemplate> {
    const template = this.templateRepository.create({
      ...templateData,
      createdBy,
    });

    const savedTemplate = await this.templateRepository.save(template) as unknown as CertificateTemplate;
    this.logger.log(`Certificate template created: ${savedTemplate.id}`, 'CertificateService');

    return savedTemplate;
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<CertificateTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string): Promise<CertificateTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, updateData: any): Promise<CertificateTemplate> {
    const template = await this.getTemplateById(id);

    Object.assign(template, updateData);
    const updatedTemplate = await this.templateRepository.save(template);

    this.logger.log(`Certificate template updated: ${id}`, 'CertificateService');
    return updatedTemplate;
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplateById(id);

    if (template.isSystem) {
      throw new BadRequestException('Cannot delete system template');
    }

    // Soft delete by marking as inactive
    template.isActive = false;
    await this.templateRepository.save(template);

    this.logger.log(`Certificate template deleted: ${id}`, 'CertificateService');
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return `CERT-${timestamp}-${randomBytes}`.toUpperCase();
  }

  /**
   * Get template (default if not specified)
   */
  private async getTemplate(templateId?: string): Promise<CertificateTemplate> {
    if (templateId) {
      return this.getTemplateById(templateId);
    }

    // Get default template
    const defaultTemplate = await this.templateRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (defaultTemplate) {
      return defaultTemplate;
    }

    // Create default template if none exists
    return this.createDefaultTemplate();
  }

  /**
   * Create default template
   */
  private async createDefaultTemplate(): Promise<CertificateTemplate> {
    const defaultTemplate = this.templateRepository.create({
      name: 'Default Certificate Template',
      description: 'Default certificate template for course completion',
      category: 'course',
      config: {
        pageSize: 'A4',
        orientation: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        backgroundColor: '#ffffff',
        fonts: {
          title: { family: 'Arial', size: 24, color: '#000000', weight: 'bold' },
          body: { family: 'Arial', size: 14, color: '#000000', weight: 'normal' },
          signature: { family: 'Arial', size: 12, color: '#000000', weight: 'normal' },
        },
        placeholders: {
          title: { position: { x: 100, y: 100 }, alignment: 'center' },
          userName: { position: { x: 100, y: 200 }, alignment: 'center' },
          courseName: { position: { x: 100, y: 250 }, alignment: 'center' },
          date: { position: { x: 100, y: 300 }, alignment: 'center' },
          signature: { position: { x: 100, y: 400 }, alignment: 'center' },
        },
      },
      content: `
        <div class="certificate">
          <h1>{{title}}</h1>
          <p>This is to certify that</p>
          <h2>{{userName}}</h2>
          <p>has successfully completed the course</p>
          <h3>{{courseName}}</h3>
          <p>on {{date}}</p>
          <div class="signature">
            <p>Stellr Academy</p>
          </div>
        </div>
      `,
      styles: `
        .certificate {
          text-align: center;
          padding: 50px;
          font-family: Arial, sans-serif;
        }
        h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        h2 { font-size: 20px; font-weight: bold; margin: 20px 0; }
        h3 { font-size: 18px; font-weight: bold; margin: 20px 0; }
        p { font-size: 14px; margin: 10px 0; }
        .signature { margin-top: 50px; }
      `,
      isDefault: true,
      isSystem: true,
      isActive: true,
    });

    return this.templateRepository.save(defaultTemplate);
  }

  /**
   * Generate PDF (placeholder implementation)
   */
  private async generatePDF(
    certificate: Certificate,
    user: User,
    course: Course,
    template: CertificateTemplate,
  ): Promise<void> {
    // This would integrate with a PDF generation library like puppeteer or jsPDF
    // For now, we'll just log the action
    this.logger.log(`PDF generation requested for certificate: ${certificate.id}`, 'CertificateService');

    // TODO: Implement actual PDF generation
    // 1. Replace placeholders in template with actual data
    // 2. Generate PDF using puppeteer or similar
    // 3. Save PDF to storage
    // 4. Update certificate with file information

    const filename = `certificate-${certificate.id}.pdf`;
    const filePath = `/certificates/${filename}`;

    certificate.fileInfo = {
      filename,
      filePath,
      fileSize: 0, // Would be actual file size
      mimeType: 'application/pdf',
      downloadUrl: `/api/v1/certificates/${certificate.id}/download`,
    };

    await this.certificateRepository.save(certificate);
  }
}