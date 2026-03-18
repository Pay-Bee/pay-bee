import crypto from "crypto";

export interface KokoSigningParams {
  mId: string;
  amount: string;
  currency: string;
  pluginName: string;
  pluginVersion: string;
  returnUrl: string;
  cancelUrl: string;
  orderId: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
  apiKey: string;
  responseUrl: string;
}

// Concatenation order must be exact — any deviation breaks Koko's RSA verification.
export function buildKokoDataString(p: KokoSigningParams): string {
  return (
    p.mId +
    p.amount +
    p.currency +
    p.pluginName +
    p.pluginVersion +
    p.returnUrl +
    p.cancelUrl +
    p.orderId +
    p.reference +
    p.firstName +
    p.lastName +
    p.email +
    p.description +
    p.apiKey +
    p.responseUrl
  );
}

export function signKokoDataString(
  dataString: string,
  merchantPrivateKeyPem: string
): string {
  const sign = crypto.createSign("SHA256");
  sign.update(Buffer.from(dataString));
  sign.end();
  return sign.sign(merchantPrivateKeyPem, "base64");
}

export function verifyKokoSignature(
  orderId: string,
  trnId: string,
  status: string,
  signatureBase64: string,
  kokoPublicKeyPem: string
): boolean {
  const dataString = orderId + trnId + status;
  const verify = crypto.createVerify("SHA256");
  verify.update(Buffer.from(dataString));
  verify.end();
  try {
    return verify.verify(kokoPublicKeyPem, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}
