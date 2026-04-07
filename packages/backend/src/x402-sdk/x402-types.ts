import { z } from "zod";

/**
 * x402 Protocol Type Definitions — Stellar Edition
 * Based on the official x402 spec and @x402/stellar packages.
 */

// Payment scheme types (official x402 spec)
export const PaymentSchemeSchema = z.enum(["exact", "upto"]);
export type PaymentScheme = z.infer<typeof PaymentSchemeSchema>;

// Stellar network identifiers (CAIP-2 format)
export const NetworkSchema = z.enum(["stellar:testnet", "stellar:pubnet"]);
export type Network = z.infer<typeof NetworkSchema>;

// Token types supported on Stellar
export const TokenTypeSchema = z.enum(["USDC", "EURC", "XLM"]);
export type TokenType = z.infer<typeof TokenTypeSchema>;

/**
 * Payment Requirements
 * Sent by server in HTTP 402 response (PAYMENT-REQUIRED header).
 */
export const PaymentRequirementsSchema = z.object({
  /** Payment scheme: "exact" = fixed amount */
  scheme: PaymentSchemeSchema,

  /** Stellar network (e.g. "stellar:testnet") */
  network: NetworkSchema,

  /**
   * Price expressed as a human-readable dollar string (e.g. "$0.01")
   * OR as an explicit asset object { asset: "<contract>", amount: "<base-units>" }
   */
  price: z.union([
    z.string(),
    z.object({
      asset: z.string(),
      amount: z.string(),
    }),
  ]),

  /** Stellar address that receives USDC when payment is settled */
  payTo: z.string(),

  /** SEP-41 token contract address (optional; defaults to USDC on the given network) */
  asset: z.string().optional(),

  /** ISO timestamp after which this payment requirement expires */
  expiresAt: z.string().optional(),

  /** Arbitrary metadata (e.g. orderIntentId) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PaymentRequirements = z.infer<typeof PaymentRequirementsSchema>;

/**
 * Payment Proof / Payment Payload
 * Sent by client in X-PAYMENT header after signing the Soroban auth entry.
 *
 * In the official x402/Stellar SDK this is an opaque base64-encoded JSON blob;
 * this type reflects the decoded inner structure for reference.
 */
export const PaymentProofSchema = z.object({
  /** x402 protocol scheme */
  scheme: z.string(),

  /** Stellar network */
  network: NetworkSchema,

  /** Base64-encoded Soroban transaction XDR signed by the client */
  payload: z.object({
    transaction: z.string(),
    authorization: z.array(z.string()).optional(),
  }),

  /** Timestamp when the proof was created */
  timestamp: z.number().optional(),
});

export type PaymentProof = z.infer<typeof PaymentProofSchema>;

/**
 * Full HTTP 402 response shape
 */
export interface X402Response {
  status: 402;
  headers: {
    "content-type": "application/json";
    "www-authenticate"?: string;
  };
  body: PaymentRequirements;
}

/**
 * Transaction / settlement status
 */
export const TransactionStatusSchema = z.enum([
  "pending",
  "confirmed",
  "finalized",
  "failed",
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

/**
 * SDK Configuration
 */
export const SDKConfigSchema = z.object({
  network: NetworkSchema,
  /** Stellar Soroban RPC endpoint */
  rpcEndpoint: z.string().url().optional(),
});
export type SDKConfig = z.infer<typeof SDKConfigSchema>;

// ─── Error classes ────────────────────────────────────────────────────────────

export class X402Error extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "X402Error";
  }
}

export class PaymentRequiredError extends X402Error {
  constructor(
    public paymentRequirements: PaymentRequirements,
    message = "Payment required to access this resource"
  ) {
    super(message, "PAYMENT_REQUIRED", paymentRequirements);
    this.name = "PaymentRequiredError";
  }
}

export class TransactionFailedError extends X402Error {
  constructor(message: string, details?: unknown) {
    super(message, "TRANSACTION_FAILED", details);
    this.name = "TransactionFailedError";
  }
}

export class InvalidPaymentProofError extends X402Error {
  constructor(message: string, details?: unknown) {
    super(message, "INVALID_PAYMENT_PROOF", details);
    this.name = "InvalidPaymentProofError";
  }
}