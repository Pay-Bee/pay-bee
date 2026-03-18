import qs from "qs";
import { IPaymentGateway, PaymentPayload, PaymentSession, WebhookResult } from "../types";
import { buildKokoDataString, signKokoDataString, verifyKokoSignature } from "./koko.signing";

const STUB_MODE = !process.env.KOKO_MERCHANT_ID;

export class KokoProvider implements IPaymentGateway {
  private readonly baseUrl = process.env.KOKO_API_BASE ?? "prodapi.paykoko.com";
  private readonly merchantId = process.env.KOKO_MERCHANT_ID ?? "stub-merchant-id";
  private readonly apiKey = process.env.KOKO_API_KEY ?? "stub-api-key";
  private readonly privateKey = process.env.KOKO_MERCHANT_PRIVATE_KEY ?? "";
  private readonly publicKey = process.env.KOKO_PUBLIC_KEY ?? "";
  private readonly pluginName = "customapi";
  private readonly pluginVersion = "1.0.0";

  async initiatePayment(payload: PaymentPayload): Promise<PaymentSession> {
    if (STUB_MODE) {
      console.log("[koko] STUB: returning fake checkout URL for order", payload.orderId);
      return {
        checkoutUrl: `http://localhost:3000/orders?stub_success=1&orderId=${payload.orderId}`,
        gatewayReference: `stub-koko-ref-${payload.orderId}`,
      };
    }

    const base = process.env.WEBHOOK_BASE_URL!;
    const returnUrl = `${base}/koko/return?orderId=${payload.orderId}`;
    const cancelUrl = `${base}/koko/cancel?orderId=${payload.orderId}`;
    const responseUrl = `${base}/koko/response`;

    const nameParts = payload.customerFirstName.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || payload.customerLastName;

    const p = {
      _mId: this.merchantId,
      api_key: this.apiKey,
      _returnUrl: returnUrl,
      _cancelUrl: cancelUrl,
      _responseUrl: responseUrl,
      _amount: payload.amountLKR.toFixed(2),
      _currency: "LKR",
      _reference: payload.orderId,
      _orderId: payload.orderId,
      _pluginName: this.pluginName,
      _pluginVersion: this.pluginVersion,
      _description: payload.productName,
      _firstName: firstName,
      _lastName: lastName,
      _email: payload.customerEmail,
    };

    const dataString = buildKokoDataString({
      mId: p._mId,
      amount: p._amount,
      currency: p._currency,
      pluginName: p._pluginName,
      pluginVersion: p._pluginVersion,
      returnUrl: p._returnUrl,
      cancelUrl: p._cancelUrl,
      orderId: p._orderId,
      reference: p._reference,
      firstName: p._firstName,
      lastName: p._lastName,
      email: p._email,
      description: p._description,
      apiKey: p.api_key,
      responseUrl: p._responseUrl,
    });

    const signature = signKokoDataString(dataString, this.privateKey);

    const res = await fetch(`https://${this.baseUrl}/api/merchants/orderCreate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: qs.stringify({ ...p, dataString, signature }),
    });

    if (!res.ok) throw new Error(`Koko orderCreate failed: HTTP ${res.status}`);
    const data = await res.json() as { checkoutUrl: string; orderId?: string };

    return {
      checkoutUrl: data.checkoutUrl,
      gatewayReference: data.orderId ?? payload.orderId,
    };
  }

  verifyWebhook(body: Record<string, string>): boolean {
    if (STUB_MODE) return true;
    return verifyKokoSignature(
      body.orderId,
      body.trnId,
      body.status,
      body.signature,
      this.publicKey
    );
  }

  parseWebhookResult(body: Record<string, string>): WebhookResult {
    return {
      orderId: body.orderId,
      status: body.status === "SUCCESS" ? "paid" : "failed",
      gatewayReference: body.trnId,
    };
  }
}
