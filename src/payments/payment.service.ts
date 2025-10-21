import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    this.stripe = new Stripe(key, { apiVersion: '2025-09-30.clover' });
  }

  async createPaymentIntent(userId: string, dto: { courseId: string; amount: number; currency?: string; couponCode?: string }) {
    const currency = (dto.currency || this.config.get<string>('STRIPE_CURRENCY') || 'usd').toLowerCase();
    const amountInCents = Math.round(dto.amount * 100);

    // create Stripe PaymentIntent
    const intent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata: { userId, courseId: dto.courseId, coupon: dto.couponCode ?? '' },
    });

    // persist pending payment in DB
    const payment = await this.database.payment.create({
      data: {
        userId,
        courseId: dto.courseId,
        amount: dto.amount,
        currency,
        provider: 'stripe',
        providerId: intent.id,
        status: 'PENDING',
        metadata: { stripe: { id: intent.id } },
      } as any,
    });

    return { clientSecret: intent.client_secret, paymentId: (payment as any).id };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Stripe webhook secret not configured');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.warn('Stripe webhook signature verification failed');
      throw err;
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.database.payment.updateMany({
          where: { provider: 'stripe', providerId: pi.id },
          data: { status: 'SUCCEEDED', metadata: { ...pi.metadata, stripe: pi } } as any,
        });

        // create enrollment if payment record exists
        const paymentRecord = await this.database.payment.findFirst({
          where: { provider: 'stripe', providerId: pi.id },
        }) as any;

        if (paymentRecord) {
          const exists = await this.database.enrollment.findFirst({
            where: { userId: paymentRecord.userId, courseId: paymentRecord.courseId },
          }).catch(() => null);

          if (!exists) {
            await this.database.enrollment.create({
              data: {
                userId: paymentRecord.userId,
                courseId: paymentRecord.courseId,
                paymentId: paymentRecord.id,
                status: 'IN_PROGRESS',
                enrolledAt: new Date(),
              } as any,
            });
            this.logger.log(`Enrollment created for user ${paymentRecord.userId} course ${paymentRecord.courseId}`);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.database.payment.updateMany({
          where: { provider: 'stripe', providerId: pi.id },
          data: { status: 'FAILED', metadata: { ...pi.metadata, stripe: pi } } as any,
        });
        break;
      }

      case 'charge.refunded':
      case 'charge.refund.updated': {
        const charge = event.data.object as Stripe.Charge;
        const piId = charge.payment_intent as string | undefined;
        if (piId) {
          await this.database.payment.updateMany({
            where: { provider: 'stripe', providerId: piId },
            data: { status: 'REFUNDED', metadata: { refund: charge } } as any,
          });
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
  }

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.database.payment.findUnique({ where: { id: paymentId } }) as any;
    if (!payment) throw new BadRequestException('Payment not found');
    if (payment.provider !== 'stripe' || !payment.providerId) throw new BadRequestException('Unsupported provider');

    const refund = await this.stripe.refunds.create({
      payment_intent: payment.providerId,
      reason: reason as Stripe.RefundCreateParams.Reason | undefined,
    });

    await this.database.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED', metadata: { ...payment.metadata, refund } } as any,
    });

    return refund;
  }
}