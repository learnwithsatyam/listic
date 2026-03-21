import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { Payment } from './payment.entity';
import { User } from '../users/user.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

export interface CreditTier {
  slug: string;
  name: string;
  credits: number;
  priceInr: number;
}

export const CREDIT_TIERS: CreditTier[] = [
  { slug: 'starter', name: 'Starter', credits: 5, priceInr: 99 },
  { slug: 'popular', name: 'Popular', credits: 15, priceInr: 249 },
  { slug: 'pro', name: 'Pro', credits: 50, priceInr: 699 },
];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any = null;
  private keyId: string = '';
  private keySecret: string = '';

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET', '');
    if (this.keyId && this.keySecret) {
      this.razorpay = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } else {
      this.logger.warn('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — payments disabled');
    }
  }

  getTiers(): CreditTier[] {
    return CREDIT_TIERS;
  }

  getKeyId(): string {
    return this.keyId;
  }

  async createOrder(
    userId: string,
    tierSlug: string,
  ): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
    if (!this.razorpay) throw new BadRequestException('Payments not configured');

    const tier = CREDIT_TIERS.find((t) => t.slug === tierSlug);
    if (!tier) throw new BadRequestException('Invalid tier');

    const order = await this.razorpay.orders.create({
      amount: tier.priceInr * 100, // paise
      currency: 'INR',
      notes: {
        userId,
        tierSlug: tier.slug,
        credits: String(tier.credits),
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  async verifyAndGrant(params: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    userId: string;
  }): Promise<{ success: boolean; credits: number }> {
    if (!this.razorpay) throw new BadRequestException('Payments not configured');

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== params.razorpay_signature) {
      this.logger.error('Razorpay signature verification failed');
      throw new BadRequestException('Payment verification failed');
    }

    // Fetch order to get the tier info from notes
    const order = await this.razorpay.orders.fetch(params.razorpay_order_id);
    const credits = parseInt(order.notes?.credits || '0', 10);
    const userId = order.notes?.userId;

    if (!userId || userId !== params.userId) {
      throw new BadRequestException('User mismatch');
    }

    // Idempotency: if this payment was already processed, return early
    const existing = await this.paymentRepo.findOne({
      where: { razorpayPaymentId: params.razorpay_payment_id },
    });
    if (existing) {
      this.logger.warn(`Payment ${params.razorpay_payment_id} already processed — skipping`);
      return { success: true, credits: existing.credits };
    }

    // Atomic transaction: save payment record + add credits together
    const tier = CREDIT_TIERS.find((t) => t.slug === order.notes?.tierSlug);

    await this.dataSource.transaction(async (manager) => {
      // 1. Insert payment record
      const payment = manager.create(Payment, {
        userId,
        razorpayOrderId: params.razorpay_order_id,
        razorpayPaymentId: params.razorpay_payment_id,
        tierSlug: tier?.slug || order.notes?.tierSlug || 'unknown',
        tierName: tier?.name || 'Unknown',
        credits,
        amountPaise: order.amount,
        currency: order.currency || 'INR',
        status: 'captured',
      });
      await manager.save(payment);

      // 2. Add credits atomically in the same transaction
      if (credits > 0) {
        await manager
          .createQueryBuilder()
          .update(User)
          .set({ creditsRemaining: () => `"creditsRemaining" + ${Math.floor(Math.abs(credits))}` })
          .where('id = :userId', { userId })
          .execute();
      }
    });

    this.logger.log(`Added ${credits} credits to user ${userId} (payment: ${params.razorpay_payment_id})`);
    return { success: true, credits };
  }

  /**
   * Called by Razorpay webhook (server-to-server).
   * Handles the case where the user's browser crashed after payment.
   */
  async processWebhookPayment(
    razorpayPaymentId: string,
    razorpayOrderId: string,
  ): Promise<{ success: boolean; credits: number }> {
    if (!this.razorpay) throw new BadRequestException('Payments not configured');

    // Idempotency: already processed?
    const existing = await this.paymentRepo.findOne({
      where: { razorpayPaymentId },
    });
    if (existing) {
      this.logger.warn(`Webhook: payment ${razorpayPaymentId} already processed — skipping`);
      return { success: true, credits: existing.credits };
    }

    // Fetch order from Razorpay to get userId and tier info
    const order = await this.razorpay.orders.fetch(razorpayOrderId);
    const credits = parseInt(order.notes?.credits || '0', 10);
    const userId = order.notes?.userId;

    if (!userId) {
      this.logger.error(`Webhook: no userId in order ${razorpayOrderId} notes`);
      throw new BadRequestException('Missing userId in order');
    }

    const tier = CREDIT_TIERS.find((t) => t.slug === order.notes?.tierSlug);

    await this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        userId,
        razorpayOrderId,
        razorpayPaymentId,
        tierSlug: tier?.slug || order.notes?.tierSlug || 'unknown',
        tierName: tier?.name || 'Unknown',
        credits,
        amountPaise: order.amount,
        currency: order.currency || 'INR',
        status: 'captured',
      });
      await manager.save(payment);

      if (credits > 0) {
        await manager
          .createQueryBuilder()
          .update(User)
          .set({ creditsRemaining: () => `"creditsRemaining" + ${Math.floor(Math.abs(credits))}` })
          .where('id = :userId', { userId })
          .execute();
      }
    });

    this.logger.log(`Webhook: added ${credits} credits to user ${userId} (payment: ${razorpayPaymentId})`);
    return { success: true, credits };
  }

  /**
   * Verify Razorpay webhook signature.
   */
  verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): boolean {
    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
    if (!webhookSecret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — webhook verification disabled');
      return false;
    }
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expectedSig === signatureHeader;
  }

  async getHistory(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
