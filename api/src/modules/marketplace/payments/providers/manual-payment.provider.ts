import { Injectable } from '@nestjs/common';
import type {
  PaymentProvider,
  ConfirmPaymentResult,
} from './payment-provider.interface.js';

/**
 * Manual payment provider: payment is confirmed out-of-band by an admin, so
 * `confirm` is a no-op that just acknowledges the confirmation. A real gateway
 * would verify a callback/webhook here instead.
 */
@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  async confirm(orderId: string): Promise<ConfirmPaymentResult> {
    // Manual flow: confirmation happens out-of-band (admin clicks confirm),
    // so there is nothing to await here. Touch orderId to keep the signature.
    void orderId;
    await Promise.resolve();
    return { confirmed: true };
  }
}
