import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHmac, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly secretKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
  ) {
    const key = this.config.get<string>('PAYSTACK_SECRET_KEY');
    if (!key) throw new Error('PAYSTACK_SECRET_KEY not configured');
    this.secretKey = key;
  }

  async createPaymentIntent(userId: string, dto: { courseId: string; amount: number; currency?: string; couponCode?: string }) {
    const currency = (dto.currency || this.config.get<string>('PAY_STACK_CURRENCY') || 'NGN').toUpperCase();
    const amountInKobo = Math.round(dto.amount * 100); // Paystack expects amount in smallest currency unit

    // get user email from DB (Paystack requires customer email)
    const user = await this.database.user.findUnique({ where: { id: userId } }) as any;
    if (!user || !user.email) throw new BadRequestException('User email required for Paystack transaction');

    // initialize Paystack transaction
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency,
        metadata: { userId, courseId: dto.courseId, coupon: dto.couponCode ?? '' },
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.status) {
      this.logger.warn('Paystack initialization failed', payload);
      throw new BadRequestException('Failed to initialize Paystack transaction');
    }

    const data = payload.data;
    // persist pending payment in DB
    const payment = await this.database.payment.create({
      data: {
        userId,
        courseId: dto.courseId,
        amount: dto.amount,
        currency,
        provider: 'PAYSTACK',
        providerId: data.reference,
        status: 'PENDING',
        metadata: { paystack: data },
      } as any,
    });

    return { authorizationUrl: data.authorization_url, paymentId: (payment as any).id, reference: data.reference };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('PAYSTACK_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Paystack webhook secret not configured');

    // verify signature
    const hash = createHmac('sha512', secret).update(rawBody).digest('hex');
    if (hash !== signature) {
      this.logger.warn('Paystack webhook signature verification failed');
      throw new BadRequestException('Invalid Paystack webhook signature');
    }

    // idempotency: compute event hash from raw body
    const eventHash = createHash('sha256').update(rawBody).digest('hex');

    // check if we've processed this payload before
    const existing = await this.database.webhookEvent.findUnique({ where: { eventHash } }).catch(() => null);
    if (existing) {
      this.logger.log(`Ignoring duplicate webhook (hash=${eventHash})`);
      return { received: true, duplicate: true };
    }

    // persist incoming webhook event (mark as processing)
    const savedEvent = await this.database.webhookEvent.create({
      data: { eventHash, provider: 'PAYSTACK', payload: rawBody.toString(), status: 'PROCESSING' } as any,
    });

    try {
      const payload = JSON.parse(rawBody.toString());
      const event = payload.event;
      const data = payload.data;

      this.logger.log(`Received Paystack event: ${event}`);

      switch (event) {
        case 'transaction.success':
        case 'charge.success':
        case 'charge.successful': {
          const ref = data.reference as string;
          await this.database.payment.updateMany({
            where: { provider: 'PAYSTACK', providerId: ref },
            data: { status: 'SUCCEEDED', metadata: { ...data.metadata, paystack: data } } as any,
          });

          // create enrollment if not exists
          const paymentRecord = await this.database.payment.findFirst({
            where: { provider: 'PAYSTACK', providerId: ref },
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

        case 'transaction.failed':
        case 'charge.failed': {
          const ref = data.reference as string;
          await this.database.payment.updateMany({
            where: { provider: 'PAYSTACK', providerId: ref },
            data: { status: 'FAILED', metadata: { ...data.metadata, paystack: data } } as any,
          });
          break;
        }

        case 'refund.success':
        case 'refund.updated': {
          const ref = data.transaction?.reference as string | undefined || data.reference as string | undefined;
          if (ref) {
            await this.database.payment.updateMany({
              where: { provider: 'PAYSTACK', providerId: ref },
              data: { status: 'REFUNDED', metadata: { refund: data } } as any,
            });
          }
          break;
        }

        default:
          this.logger.debug(`Unhandled Paystack event: ${event}`);
      }

      // mark webhook event as succeeded
      await this.database.webhookEvent.update({
        where: { id: (savedEvent as any).id },
        data: { status: 'PROCESSED' } as any,
      });

      return { received: true };
    } catch (err) {
      // mark webhook event as failed for debugging/retries
      await this.database.webhookEvent.update({
        where: { id: (savedEvent as any).id },
        data: { status: 'FAILED', error: (err as Error).message } as any,
      }).catch(() => null);
      throw err;
    }
  }

  async refundPayment(paymentId: string, reason?: string) {
    const payment = await this.database.payment.findUnique({ where: { id: paymentId } }) as any;
    if (!payment) throw new BadRequestException('Payment not found');
    if (payment.provider !== 'PAYSTACK' || !payment.providerId) throw new BadRequestException('Unsupported provider');

    // request refund via Paystack
    const res = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: payment.providerId,
        reason: reason ?? undefined,
      }),
    });

    const payload = await res.json();
    if (!res.ok || !payload.status) {
      this.logger.warn('Paystack refund failed', payload);
      throw new BadRequestException('Failed to create refund on Paystack');
    }

    const refund = payload.data;
    await this.database.payment.update({
      where: { id: paymentId },
      data: { status: 'REFUNDED', metadata: { ...payment.metadata, refund } } as any,
    });

    return refund;
  }

  // verify a Paystack transaction server-side and reconcile DB
  async verifyPayment(reference: string) {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await res.json();
    if (!res.ok || !payload.status) {
      this.logger.warn('Paystack verify failed', payload);
      throw new BadRequestException('Failed to verify Paystack transaction');
    }

    const data = payload.data;
    const status = (data.status || '').toLowerCase();
    const ref = data.reference as string;

    // map Paystack statuses to our DB statuses
    const statusMap: Record<string, string> = {
      success: 'SUCCEEDED',
      failed: 'FAILED',
      refunded: 'REFUNDED',
    };
    const mappedStatus = statusMap[status] ?? status.toUpperCase();

    await this.database.payment.updateMany({
      where: { provider: 'PAYSTACK', providerId: ref },
      data: { status: mappedStatus, metadata: { ...data.metadata, paystack: data } } as any,
    });

    if (status === 'success') {
      const paymentRecord = await this.database.payment.findFirst({
        where: { provider: 'PAYSTACK', providerId: ref },
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
    }

    return data;
  }
}