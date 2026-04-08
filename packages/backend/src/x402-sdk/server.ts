/**
 * x402 Stellar SDK — Server Module
 *
 * Thin wrapper around the official @x402/express + @x402/core packages.
 * Provides Express middleware for accepting and verifying Stellar USDC payments
 * via the x402 protocol.
 *
 * @example
 * ```typescript
 * import { createX402Server } from './server';
 *
 * const server = createX402Server({
 *   network: 'stellar:testnet',
 *   recipientAddress: 'G...',
 * });
 *
 * app.get('/premium',
 *   server.requirePayment({ price: '$0.10' }),
 *   (req, res) => res.json({ secret: 'content' })
 * );
 * ```
 */

import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Network } from "./x402-types";

// ─── Configuration ────────────────────────────────────────────────────────────

export interface X402ServerConfig {
  /** Stellar network, e.g. "stellar:testnet" or "stellar:pubnet" */
  network: Network;

  /** Stellar address that receives USDC on every settled payment */
  recipientAddress: string;

  /** OpenZeppelin facilitator URL (defaults to testnet) */
  facilitatorUrl?: string;

  /** Bearer API key for the facilitator */
  facilitatorApiKey?: string;
}

export interface PaymentOptions {
  /**
   * Price expressed as a dollar string ("$0.01") or explicit asset object.
   * The x402 SDK converts the dollar string to USDC base units automatically.
   */
  price: string | { asset: string; amount: string };

  /** Human-readable description returned in the 402 response */
  description?: string;

  /** MIME type of the protected resource */
  mimeType?: string;
}

// ─── Server class ─────────────────────────────────────────────────────────────

/**
 * x402 Server for Stellar USDC payments.
 *
 * Wraps the official @x402/express paymentMiddleware with a simple API
 * that mirrors the old Stellar custom SDK for drop-in compatibility.
 */
export class X402Server {
  private config: X402ServerConfig;
  private facilitatorClient: HTTPFacilitatorClient;

  constructor(config: X402ServerConfig) {
    this.config = config;

    const url =
      config.facilitatorUrl ||
      "https://channels.openzeppelin.com/x402/testnet";
    const apiKey = config.facilitatorApiKey || "";

    this.facilitatorClient = new HTTPFacilitatorClient({
      url,
      createAuthHeaders: async () => {
        const h: Record<string, string> = apiKey
          ? { Authorization: `Bearer ${apiKey}` }
          : {};
        return { verify: h, settle: h, supported: h };
      },
    });
  }

  /**
   * Returns an Express middleware that requires payment before the route handler runs.
   *
   * @param options   Price and description for the payment requirement
   * @param routePath e.g. "GET /my-route" — used as the key in the middleware config
   */
  requirePayment(options: PaymentOptions, routePath?: string) {
    const route = routePath || `GET /`;

    const resourceServer = new x402ResourceServer(
      this.facilitatorClient
    ).register(this.config.network, new ExactStellarScheme());

    return paymentMiddleware(
      {
        [route]: {
          accepts: [
            {
              scheme: "exact" as const,
              price: options.price as string,
              network: this.config.network,
              payTo: this.config.recipientAddress,
            },
          ],
          description: options.description || "Protected resource",
          mimeType: options.mimeType || "application/json",
        },
      },
      resourceServer
    );
  }

  /**
   * Directly verify + settle a payment header using the facilitator.
   * Useful when you want manual control over the verify/settle steps.
   */
  async verifyAndSettle(
    paymentHeader: unknown,
    requirements: {
      price: string;
      resource: string;
      description?: string;
    }
  ): Promise<{ isValid: boolean; invalidReason?: string }> {
    const paymentRequirements = {
      scheme: "exact" as const,
      network: this.config.network,
      maxAmountRequired: requirements.price,
      resource: requirements.resource,
      description: requirements.description || "",
      mimeType: "application/json",
      payTo: this.config.recipientAddress,
      maxTimeoutSeconds: 900,
      asset: "USDC",
      outputSchema: undefined,
      extra: undefined,
    };

    const result = await this.facilitatorClient.verify(
      paymentHeader as any,
      paymentRequirements as any
    );

    if (result.isValid) {
      await this.facilitatorClient.settle(
        paymentHeader as any,
        paymentRequirements as any
      );
    }

    return result;
  }
}

// ─── Factory helpers ──────────────────────────────────────────────────────────

export function createX402Server(config: X402ServerConfig): X402Server {
  return new X402Server(config);
}

/**
 * One-liner Express middleware factory for simple use cases.
 */
export function x402Middleware(
  config: X402ServerConfig,
  paymentOptions: PaymentOptions,
  routePath?: string
) {
  const server = new X402Server(config);
  return server.requirePayment(paymentOptions, routePath);
}