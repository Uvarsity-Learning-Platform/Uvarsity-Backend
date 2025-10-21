import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('payments')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  @Post('create-payment-intent')
  async createPaymentIntent(@Body('amount') amount: number) {
    const currency = this.configService.get<string>('STRIPE_CURRENCY') || 'usd';
    const paymentIntent = await this.stripeService.createPaymentIntent(amount, currency);
    return { clientSecret: paymentIntent.client_secret };
  }

  @Post('webhook')
  @HttpCode(200)
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!sig) {
      return res.status(400).send('Webhook Error: Missing stripe-signature header');
    }
    
    if (!webhookSecret) {
      return res.status(400).send('Webhook Error: Missing webhook secret configuration');
    }
    
    let event;

    try {
      event = this.stripeService['stripe'].webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret,
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Payment was successful
        // Add your business logic here
        break;
      case 'payment_intent.payment_failed':
        // Payment failed
        // Add your business logic here
        break;
      default:
        // Unexpected event type
        break;
    }

    res.json({ received: true });
  }
}