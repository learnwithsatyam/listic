import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreateOrderDto, VerifyPaymentDto } from './payments.dto';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);
  constructor(private readonly paymentsService: PaymentsService) {}

  /** Public — return credit tier pricing */
  @Get('tiers')
  getTiers() {
    return this.paymentsService.getTiers();
  }

  /** Authenticated — create a Razorpay order */
  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOrder(
    @Req() req: Request,
    @Body() dto: CreateOrderDto,
  ) {
    const userId = (req.user as any).userId;
    return this.paymentsService.createOrder(userId, dto.tierSlug);
  }

  /** Authenticated — verify payment and grant credits */
  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyPayment(
    @Req() req: Request,
    @Body() dto: VerifyPaymentDto,
  ) {
    const userId = (req.user as any).userId;
    return this.paymentsService.verifyAndGrant({
      razorpay_order_id: dto.razorpay_order_id,
      razorpay_payment_id: dto.razorpay_payment_id,
      razorpay_signature: dto.razorpay_signature,
      userId,
    });
  }

  /** Authenticated — payment history */
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.paymentsService.getHistory(userId);
  }

  /**
   * Razorpay webhook — no JWT, verified via webhook signature.
   * Handles payment.captured events as a safety net for browser crashes.
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = (req as any).rawBody as Buffer;

    if (!signature || !rawBody) {
      this.logger.warn('Webhook: missing signature or raw body');
      return res.json({ status: 'ignored' });
    }

    const valid = this.paymentsService.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      this.logger.error('Webhook: signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    try {
      const event = JSON.parse(rawBody.toString());

      if (event.event === 'payment.captured') {
        const payment = event.payload?.payment?.entity;
        if (payment?.id && payment?.order_id) {
          await this.paymentsService.processWebhookPayment(
            payment.id,
            payment.order_id,
          );
        }
      }
    } catch (err) {
      this.logger.error('Webhook processing error', (err as Error).message);
    }

    // Always return 200 to Razorpay so it doesn't retry endlessly
    return res.json({ status: 'ok' });
  }
}
