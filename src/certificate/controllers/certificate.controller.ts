import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';

import { CertificateService } from '../services/certificate.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

/**
 * Certificate Controller for Stellr Academy Backend
 * 
 * This controller handles all certificate-related HTTP endpoints:
 * - Certificate generation and issuance
 * - Certificate verification
 * - Template management
 * - Certificate download
 * - Certificate analytics
 */
@ApiTags('Certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificateService: CertificateService) {}

  // === CERTIFICATE MANAGEMENT ENDPOINTS ===

  /**
   * Generate certificate for user
   */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate certificate',
    description: 'Generate a certificate for course completion',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificate generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'User not eligible for certificate',
  })
  async generateCertificate(
    @Body() generateData: { courseId: string; templateId?: string },
    @Request() req,
  ) {
    const userId = req.user.id;
    const certificate = await this.certificateService.generateCertificate(
      userId,
      generateData.courseId,
      generateData.templateId,
    );
    return certificate.getDisplayInfo();
  }

  /**
   * Get certificate by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get certificate',
    description: 'Get certificate details by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async getCertificate(@Param('id') id: string) {
    const certificate = await this.certificateService.getCertificateById(id);
    return certificate.getDisplayInfo();
  }

  /**
   * Get user's certificates
   */
  @Get('user/my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user certificates',
    description: 'Get all certificates for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificates retrieved successfully',
  })
  async getUserCertificates(@Request() req) {
    const userId = req.user.id;
    const certificates = await this.certificateService.getUserCertificates(userId);
    return certificates.map(cert => cert.getDisplayInfo());
  }

  /**
   * Download certificate
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download certificate',
    description: 'Download certificate as PDF',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate downloaded successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async downloadCertificate(
    @Param('id') id: string,
    @Request() req,
    @Response() res: ExpressResponse,
  ) {
    const userId = req.user.id;
    const pdfBuffer = await this.certificateService.downloadCertificate(id, userId);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificate-${id}.pdf`);
    res.send(pdfBuffer);
  }

  /**
   * Verify certificate
   */
  @Get('verify/:verificationCode')
  @ApiOperation({
    summary: 'Verify certificate',
    description: 'Verify certificate using verification code',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate verified successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found or invalid',
  })
  async verifyCertificate(@Param('verificationCode') verificationCode: string) {
    const certificate = await this.certificateService.verifyCertificate(verificationCode);
    return certificate.getVerificationInfo();
  }

  /**
   * Check certificate eligibility
   */
  @Get('eligibility/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check certificate eligibility',
    description: 'Check if user is eligible for certificate',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility checked successfully',
  })
  async checkEligibility(@Param('courseId') courseId: string, @Request() req) {
    const userId = req.user.id;
    const isEligible = await this.certificateService.checkCertificateEligibility(userId, courseId);
    return { eligible: isEligible };
  }

  /**
   * Revoke certificate
   */
  @Put(':id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke certificate',
    description: 'Revoke a certificate (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate not found',
  })
  async revokeCertificate(
    @Param('id') id: string,
    @Body() revokeData: { reason?: string },
  ) {
    const certificate = await this.certificateService.revokeCertificate(id, revokeData.reason);
    return certificate.getDisplayInfo();
  }

  // === TEMPLATE MANAGEMENT ENDPOINTS ===

  /**
   * Create certificate template
   */
  @Post('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create certificate template',
    description: 'Create a new certificate template',
  })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
  })
  async createTemplate(@Body() templateData: any, @Request() req) {
    const createdBy = req.user.id;
    const template = await this.certificateService.createTemplate(templateData, createdBy);
    return template.getDisplayInfo();
  }

  /**
   * Get all templates
   */
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get certificate templates',
    description: 'Get all available certificate templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
  })
  async getTemplates() {
    const templates = await this.certificateService.getTemplates();
    return templates.map(template => template.getDisplayInfo());
  }

  /**
   * Get template by ID
   */
  @Get('templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get certificate template',
    description: 'Get certificate template by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async getTemplate(@Param('id') id: string) {
    const template = await this.certificateService.getTemplateById(id);
    return template.getConfiguration();
  }

  /**
   * Update template
   */
  @Put('templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update certificate template',
    description: 'Update an existing certificate template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async updateTemplate(@Param('id') id: string, @Body() updateData: any) {
    const template = await this.certificateService.updateTemplate(id, updateData);
    return template.getDisplayInfo();
  }

  /**
   * Delete template
   */
  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete certificate template',
    description: 'Delete a certificate template',
  })
  @ApiResponse({
    status: 204,
    description: 'Template deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Template not found',
  })
  async deleteTemplate(@Param('id') id: string) {
    await this.certificateService.deleteTemplate(id);
  }
}