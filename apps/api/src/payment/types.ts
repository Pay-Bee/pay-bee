export interface PaymentPayload {
  orderId: string;
  amountLKR: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  productName: string;
}

export interface PaymentSession {
  checkoutUrl: string;
  gatewayReference: string;
}

export interface WebhookResult {
  orderId: string;
  status: "paid" | "failed" | "cancelled";
  gatewayReference: string;
  installmentPlan?: {
    months: number;
    instalmentLKR: number;
    totalRepayable: number;
    gatewayPlanId: string;
  };
}

export interface IPaymentGateway {
  initiatePayment(payload: PaymentPayload): Promise<PaymentSession>;
  verifyWebhook(body: Record<string, string>): boolean;
  parseWebhookResult(body: Record<string, string>): WebhookResult;
}
