import { x402Config } from "./x402-config";
import { Amounts } from "../types";
import crypto from "crypto";

/**
 * Creates x402 payment requirements for the checkout flow (Stellar / USDC).
 * Price is expressed as a human-readable dollar string, e.g. "$1.23".
 * The x402 SDK on the client side will convert this to the on-chain base units.
 */
export function createPaymentRequirements(
  orderIntentId: string,
  amounts: Amounts,
  expiresAt: Date
) {
  // Format as dollar string that the x402 Stellar SDK understands
  const usdAmount = parseFloat(amounts.total);
  const price = `$${usdAmount.toFixed(2)}`;

  return [
    {
      scheme: "exact" as const,
      network: x402Config.network,
      price,
      payTo: x402Config.recipientAddress,
      expiresAt: expiresAt.toISOString(),
      metadata: {
        orderIntentId,
        amounts,
      },
    },
  ];
}

/**
 * Deeply sorts object properties to normalize JSON.
 * Ensures consistent hashing regardless of property order.
 */
export function deepSortObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepSortObject);
  } else if (obj !== null && typeof obj === "object") {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = deepSortObject(obj[key]);
    }
    return sorted;
  }
  return obj;
}

/**
 * Validates that request body matches the saved order intent using body hash.
 * Prevents "change cart after quote" attacks.
 */
export function validateOrderIntentMatch(
  savedIntent: any,
  currentRequest: any
): boolean {
  const { orderIntentId: _, ...requestWithoutIntentId } = currentRequest;
  const normalizedRequest = deepSortObject(requestWithoutIntentId);
  const currentBodyHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(normalizedRequest))
    .digest("hex");
  return currentBodyHash === savedIntent.body_hash;
}

/**
 * Checks if order intent has expired.
 */
export function isOrderIntentExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Parses X-PAYMENT header (plain JSON or base64-encoded JSON).
 */
export function parsePaymentHeader(headerValue: string): any {
  try {
    return JSON.parse(headerValue);
  } catch {
    // Try base64
    try {
      return JSON.parse(Buffer.from(headerValue, "base64").toString("utf-8"));
    } catch {
      throw new Error("Invalid X-PAYMENT header format");
    }
  }
}

/**
 * Extracts transaction hash from Stellar settlement response.
 */
export function extractTxHashFromVerification(verificationResponse: any): string {
  return (
    verificationResponse?.txHash ||
    verificationResponse?.transaction_hash ||
    verificationResponse?.tx_hash ||
    verificationResponse?.hash ||
    ""
  );
}
