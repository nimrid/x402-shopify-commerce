/**
 * x402 Stellar SDK — Client Module
 *
 * Thin wrapper around the official @x402/fetch + @x402/stellar packages.
 * Provides automatic HTTP 402 payment handling for Stellar USDC payments.
 *
 * @example Node.js (agent / backend)
 * ```typescript
 * import { x402Fetch } from './client';
 *
 * const response = await x402Fetch('https://api.example.com/data', {
 *   network: 'stellar:testnet',
 *   stellarPrivateKey: process.env.WALLET_SECRET_KEY,
 * });
 * ```
 */

import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { Network } from "./x402-types";

// ─── Configuration ────────────────────────────────────────────────────────────

export interface X402ClientConfig {
  /** Stellar network (e.g. "stellar:testnet") */
  network: Network;

  /** Ed25519 secret key string starting with 'S' */
  stellarPrivateKey: string;

  /** Stellar Soroban RPC URL (defaults to testnet) */
  rpcUrl?: string;
}

export interface X402FetchOptions extends RequestInit {
  /** Override network for a single request */
  network?: Network;
}

// ─── Client class ─────────────────────────────────────────────────────────────

/**
 * x402 Client for making payment-enabled HTTP requests on Stellar.
 *
 * Wraps the official @x402/fetch x402Client with a simple API.
 */
export class X402Client {
  private config: X402ClientConfig;

  constructor(config: X402ClientConfig) {
    this.config = config;
  }

  /**
   * Make an HTTP request with automatic x402 Stellar payment handling.
   *
   * On a 402 response the client will:
   *  1. Parse the PAYMENT-REQUIRED header
   *  2. Build + sign a Soroban USDC transfer via the agent wallet
   *  3. Retry the request with the X-PAYMENT header
   */
  async fetch(url: string, options: X402FetchOptions = {}): Promise<Response> {
    const network = options.network ?? this.config.network;
    const rpcUrl =
      this.config.rpcUrl ?? "https://soroban-testnet.stellar.org";

    const signer = createEd25519Signer(this.config.stellarPrivateKey, network);
    const rpcConfig = { url: rpcUrl };

    const client = new x402Client().register(
      "stellar:*",
      new ExactStellarScheme(signer, rpcConfig)
    );
    const httpClient = new x402HTTPClient(client);

    // Step 1 – try without payment
    const { network: _net, ...fetchOptions } = options;
    const firstTry = await fetch(url, fetchOptions);

    if (firstTry.status !== 402) {
      return firstTry;
    }

    // Step 2 – parse payment requirements from 402 headers
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => firstTry.headers.get(name)
    );

    // Step 3 – build payment payload (sign the Soroban auth entry)
    let paymentPayload = await client.createPaymentPayload(paymentRequired);

    // Testnet: adjust fee to 1 stroop to avoid facilitator rate-limiting
    try {
      const passphrase = getNetworkPassphrase(network);
      const tx = new Transaction(
        paymentPayload.payload.transaction as string,
        passphrase
      );
      const sorobanData = tx.toEnvelope().v1()?.tx()?.ext()?.sorobanData();
      if (sorobanData) {
        paymentPayload = {
          ...paymentPayload,
          payload: {
            ...paymentPayload.payload,
            transaction: TransactionBuilder.cloneFrom(tx, {
              fee: "1",
              sorobanData,
              networkPassphrase: passphrase,
            })
              .build()
              .toXDR(),
          },
        };
      }
    } catch {
      // Fee adjustment is a best-effort optimisation; ignore errors
    }

    // Step 4 – encode as X-PAYMENT header and retry
    const paymentHeaders =
      httpClient.encodePaymentSignatureHeader(paymentPayload);

    return fetch(url, {
      ...fetchOptions,
      headers: {
        ...(fetchOptions.headers || {}),
        ...paymentHeaders,
      },
    });
  }

  /** Return the Stellar address of this client's wallet */
  get address(): string {
    const signer = createEd25519Signer(
      this.config.stellarPrivateKey,
      this.config.network
    );
    return signer.address;
  }
}

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * One-liner x402 fetch with automatic Stellar USDC payment.
 *
 * @example
 * ```typescript
 * const res = await x402Fetch('https://api.example.com/premium', {
 *   network: 'stellar:testnet',
 *   stellarPrivateKey: process.env.WALLET_SECRET_KEY!,
 * });
 * ```
 */
export async function x402Fetch(
  url: string,
  options: X402ClientConfig & X402FetchOptions
): Promise<Response> {
  const { network, stellarPrivateKey, rpcUrl, ...fetchOptions } = options;
  const client = new X402Client({ network, stellarPrivateKey, rpcUrl });
  return client.fetch(url, fetchOptions);
}

/**
 * Build and return the signed X-PAYMENT header value for a given URL
 * without actually retrying the request. Useful for pre-signing or
 * passing the header to a different part of the system.
 */
export async function createSignedPaymentHeader(
  url: string,
  config: X402ClientConfig
): Promise<string | null> {
  const network = config.network;
  const rpcUrl = config.rpcUrl ?? "https://soroban-testnet.stellar.org";

  const signer = createEd25519Signer(config.stellarPrivateKey, network);
  const rpcConfig = { url: rpcUrl };

  const client = new x402Client().register(
    "stellar:*",
    new ExactStellarScheme(signer, rpcConfig)
  );
  const httpClient = new x402HTTPClient(client);

  const probe = await fetch(url);
  if (probe.status !== 402) return null;

  const paymentRequired = httpClient.getPaymentRequiredResponse(
    (name) => probe.headers.get(name)
  );
  const paymentPayload = await client.createPaymentPayload(paymentRequired);
  const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);

  return headers["X-PAYMENT"] ?? headers["x-payment"] ?? null;
}