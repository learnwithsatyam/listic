import { IsString } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  tierSlug: string;
}

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsString()
  razorpay_signature: string;
}
