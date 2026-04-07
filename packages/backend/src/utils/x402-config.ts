import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { getNetworkPassphrase } from "@x402/stellar";

// Stellar facilitator (OpenZeppelin)
const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://channels.openzeppelin.com/x402/testnet";
const FACILITATOR_API_KEY = process.env.X402_FACILITATOR_API_KEY;
const RECIPIENT_ADDRESS = process.env.X402_RECIPIENT_ADDRESS;
const USDC_ISSUER = process.env.X402_USDC_ISSUER;

if (!FACILITATOR_API_KEY) {
  throw new Error("Missing required environment variable: X402_FACILITATOR_API_KEY");
}
if (!RECIPIENT_ADDRESS) {
  throw new Error("Missing required environment variable: X402_RECIPIENT_ADDRESS");
}
if (!USDC_ISSUER) {
  throw new Error("Missing required environment variable: X402_USDC_ISSUER");
}

const networkId = (process.env.X402_NETWORK || "stellar:testnet") as `${string}:${string}`;

export const x402Config = {
  network: networkId,
  recipientAddress: RECIPIENT_ADDRESS,
  usdcIssuer: USDC_ISSUER,
  facilitatorUrl: FACILITATOR_URL,
  facilitatorApiKey: FACILITATOR_API_KEY,
  networkPassphrase: getNetworkPassphrase(networkId),
};

/**
 * Returns a configured HTTPFacilitatorClient for the Stellar x402 facilitator.
 */
export function getFacilitatorClient(): HTTPFacilitatorClient {
  return new HTTPFacilitatorClient({
    url: FACILITATOR_URL,
    createAuthHeaders: async () => {
      const headers = { Authorization: `Bearer ${FACILITATOR_API_KEY}` };
      return { verify: headers, settle: headers, supported: headers };
    },
  });
}

/**
 * Returns a configured ExactStellarScheme for server-side verification.
 */
export function getStellarScheme(): ExactStellarScheme {
  return new ExactStellarScheme();
}

/**
 * Legacy compat: initializeX402Server is no longer used directly in checkout.
 * Kept as a no-op factory so old import sites don't break.
 */
export async function initializeX402Server() {
  return null;
}
