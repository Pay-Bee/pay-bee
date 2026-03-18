import { IPaymentGateway, PaymentPayload, PaymentSession, WebhookResult } from "../types";

// STUB: MintpayProvider satisfies IPaymentGateway with correct interface.
// Fill in when Mintpay API documentation and credentials are available.
export class MintpayProvider implements IPaymentGateway {
  private readonly apiKey = process.env.MINTPAY_API_KEY ?? "stub-mintpay-key";
  private readonly apiBase = process.env.MINTPAY_API_BASE ?? "https://api.mintpay.lk";
  private readonly webhookSecret = process.env.MINTPAY_WEBHOOK_SECRET ?? "";

  async initiatePayment(payload: PaymentPayload): Promise<PaymentSession> {
    console.log("[mintpay] STUB: returning fake checkout URL for order", payload.orderId);

    // TODO: Replace with real Mintpay API call:
    // POST ${this.apiBase}/v1/orders
    // Headers: { Authorization: `Bearer ${this.apiKey}` }
    // Body: { amount: payload.amountLKR, currency: "LKR", orderId: payload.orderId, ... }

    return {
      checkoutUrl: `http://localhost:3000/orders?stub_success=1&orderId=${payload.orderId}&gateway=mintpay`,
      gatewayReference: `stub-mintpay-ref-${payload.orderId}`,
    };
  }

  verifyWebhook(body: Record<string, string>): boolean {
    if (!this.webhookSecret) return true; // Stub mode

    // TODO: Implement HMAC verification using MINTPAY_WEBHOOK_SECRET
    // const signature = body.signature;
    // const expected = crypto.createHmac("sha256", this.webhookSecret).update(...).digest("hex");
    // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    return !!body.orderId;
  }

  parseWebhookResult(body: Record<string, string>): WebhookResult {
    return {
      orderId: body.orderId ?? body.order_id,
      status: body.status === "SUCCESS" || body.status === "PAID" ? "paid" : "failed",
      gatewayReference: body.transactionId ?? body.trnId ?? "",
      installmentPlan: body.planMonths
        ? {
            months: parseInt(body.planMonths, 10),
            instalmentLKR: parseFloat(body.instalmentAmount),
            totalRepayable: parseFloat(body.totalRepayable),
            gatewayPlanId: body.planId ?? "",
          }
        : undefined,
    };
  }
}
