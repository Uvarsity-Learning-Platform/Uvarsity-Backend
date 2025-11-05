import { Controller, Post, Body, Req, Res, HttpStatus, Headers, UseGuards, Get, Param, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async checkout(@Body() dto: CreatePaymentDto, @Req() req: Request, @Res() res: Response) {
    const userId = (req.user as any).userId;
    const result = await this.paymentService.createPaymentIntent(userId, dto as any);
    return res.status(HttpStatus.CREATED).json({ status: 'success', data: result });
  }

  // Paystack webhook (raw body required)
  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('x-paystack-signature') signature: string, @Res() res: Response) {
    try {
      const rawBody = req.body as Buffer;
      await this.paymentService.handleWebhook(rawBody, signature);
      return res.status(HttpStatus.OK).send('ok');
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
    }
  }

  @Post()
  async create(@Body() dto: any, @Body('userId') userId: string) {
    // validate dto properly with DTO class in real code
    if (!userId || !dto.courseId || !dto.amount) throw new BadRequestException('Missing fields');
    return this.paymentService.createPaymentIntent(userId, dto);
  }

  @Get('verify/:reference')
  async verify(@Param('reference') reference: string) {
    // implement verify in service if you want server-side verification
    return this.paymentService.verifyPayment?.(reference) ?? { message: 'verify not implemented' };
  }

  @Post(':id/refund')
  async refund(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.paymentService.refundPayment(id, reason);
  }
}