import { Controller, Post, Body, Req, Res, HttpStatus, Headers, UseGuards } from '@nestjs/common';
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

  // Stripe webhook (raw body required)
  @Post('webhook')
  async webhook(@Req() req: Request, @Headers('stripe-signature') signature: string, @Res() res: Response) {
    try {
      const rawBody = req.body as Buffer;
      await this.paymentService.handleWebhook(rawBody, signature);
      return res.status(HttpStatus.OK).send('ok');
    } catch (err) {
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
    }
  }
}