import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';


@Controller('payments')
export class PaystackController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly configService: ConfigService,
  ) {}

  @Post('initialize')
  async initialize(@Body() body: { email: string; amount: number; callback_url: string }) {
    // Paystack expects amount in kobo (multiply by 100)
    const result = await this.paystackService.initializeTransaction(
      body.email,
      body.amount * 100,
      body.callback_url,
    );
    return result;
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
    
    }
    if (event.event === 'charge.failed') {
      const reference = event.data.reference;
    }

    res.sendStatus(200);
  }
}