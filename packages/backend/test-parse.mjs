#!/usr/bin/env node
/**
 * Test parsing payment requirements
 */

import { wrapFetchWithPayment } from "@x402/fetch";
import { createEd25519Signer, ExactStellarScheme } from "@x402/stellar";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const PRIVATE_KEY = process.env.WALLET_SECRET_KEY;
const NETWORK = "stellar:testnet";
const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

// Test payment requirements
const paymentRequirements = [{
  scheme: "exact",
  network: "stellar:testnet",
  price: "$10.00",
  payTo: "GDN4Q2UANNQNO7FSZT6JVNS56EXAEQIQLXBDV54YDCZOUNUQ44OQUB3C",
  expiresAt: "2026-04-05T22:03:17.575Z",
  metadata: {
    orderIntentId: "oi_test",
    amounts: {
      subtotal: "10.00",
      shipping: "0.00",
      tax: "0.00",
      total: "10.00",
      currency: "USD"
    }
  }
}];

console.log("Payment requirements:", JSON.stringify(paymentRequirements, null, 2));

// Try to create the scheme
try {
  const signer = createEd25519Signer(PRIVATE_KEY, NETWORK);
  const rpcConfig = { url: RPC_URL };
  const scheme = new ExactStellarScheme(signer, rpcConfig);
  console.log("✅ Scheme created successfully");
  console.log("Signer address:", signer.address);
} catch (err) {
  console.error("❌ Failed to create scheme:", err.message);
  process.exit(1);
}
