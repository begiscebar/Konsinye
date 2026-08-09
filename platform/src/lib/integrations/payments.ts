/**
 * Payment integration seam. No payment processor is connected — a real
 * deployment would need a Stripe account (Connect, if paying carriers out
 * directly) and STRIPE_SECRET_KEY. `ManualPaymentProvider` is the MVP
 * implementation: an admin marks a load's invoice paid and records a
 * reference number by hand. `StripePaymentProvider` would implement the
 * same interface and be selected via env var — no caller changes.
 */
export interface PaymentProvider {
  markPaid(input: { loadFinancialsId: string; transactionId: string }): Promise<{ ok: true }>;
}

class ManualPaymentProvider implements PaymentProvider {
  async markPaid(input: { loadFinancialsId: string; transactionId: string }) {
    return { ok: true as const };
  }
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) provider = new ManualPaymentProvider();
  return provider;
}
