/**
 * @x402/stellar-sdk
 *
 * TypeScript SDK for implementing HTTP 402 payment flows on Stellar.
 * This is a thin wrapper around the official @x402/stellar, @x402/express,
 * and @x402/fetch packages.
 *
 * @example Client Usage (Node.js / agent)
 * ```typescript
 * import { x402Fetch } from './x402-sdk';
 *
 * const response = await x402Fetch('https://api.example.com/data', {
 *   network: 'stellar:testnet',
 *   stellarPrivateKey: process.env.WALLET_SECRET_KEY!,
 * });
 * ```
 *
 * @example Server Usage (Express)
 * ```typescript
 * import { createX402Server } from './x402-sdk';
 * import express from 'express';
 *
 * const app = express();
 * const server = createX402Server({
 *   network: 'stellar:testnet',
 *   recipientAddress: 'G...',
 * });
 *
 * app.get('/premium-data',
 *   server.requirePayment({ price: '$0.10' }, 'GET /premium-data'),
 *   (req, res) => res.json({ data: 'premium content' })
 * );
 * ```
 */

// Client exports
export {
  X402Client,
  x402Fetch,
  createSignedPaymentHeader,
  type X402ClientConfig,
  type X402FetchOptions,
} from "./client";

// Server exports
export {
  X402Server,
  createX402Server,
  x402Middleware,
  type X402ServerConfig,
  type PaymentOptions,
} from "./server";

// Types
export {
  type PaymentRequirements,
  type PaymentProof,
  type Network,
  type TokenType,
  type PaymentScheme,
  type TransactionStatus,
  type SDKConfig,
  type X402Response,
  PaymentRequirementsSchema,
  PaymentProofSchema,
  NetworkSchema,
  TokenTypeSchema,
  PaymentSchemeSchema,
  TransactionStatusSchema,
  SDKConfigSchema,
  X402Error,
  PaymentRequiredError,
  TransactionFailedError,
  InvalidPaymentProofError,
} from "./x402-types";

export const VERSION = "2.0.0";