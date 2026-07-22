export interface ConfirmPaymentResult {
  confirmed: boolean;
}

/**
 * Abstraction over a payment method. Today only the manual provider exists
 * (admin confirms by hand); a real gateway (Midtrans/Xendit/Stripe) can be
 * dropped in later without touching PaymentsService.
 */
export interface PaymentProvider {
  confirm(orderId: string): Promise<ConfirmPaymentResult>;
}
