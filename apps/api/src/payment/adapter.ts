import { IPaymentGateway } from "./types";
import { KokoProvider } from "./providers/koko.provider";
import { MintpayProvider } from "./providers/mintpay.provider";

export class PaymentGatewayAdapter {
  private providers = new Map<string, IPaymentGateway>([
    ["koko", new KokoProvider()],
    ["mintpay", new MintpayProvider()],
  ]);

  get(gateway: string): IPaymentGateway {
    const provider = this.providers.get(gateway);
    if (!provider) throw new Error(`Unknown payment gateway: ${gateway}`);
    return provider;
  }
}

// Singleton instance
export const paymentAdapter = new PaymentGatewayAdapter();
