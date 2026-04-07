#!/usr/bin/env node
/**
 * End-to-end Stellar x402 payment test
 *
 * Uses wrapFetchWithPayment from @x402/fetch which handles the full cycle:
 *   1. POST /x402/checkout → 402 + WWW-Authenticate header
 *   2. Automatically signs via createEd25519Signer + ExactStellarScheme
 *   3. Retries POST with X-PAYMENT header → 200 order confirmed
 */

import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const BASE_URL = "http://localhost:3001";
const NETWORK = process.env.X402_NETWORK || "stellar:testnet";
const PRIVATE_KEY = process.env.WALLET_SECRET_KEY;
const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

if (!PRIVATE_KEY || PRIVATE_KEY.includes("<YOUR")) {
  console.error("❌ WALLET_SECRET_KEY not set in .env");
  process.exit(1);
}

const CHECKOUT_BODY = {
  storeId: "store_92666f85",
  items: [{ productId: "gid://shopify/ProductVariant/48325087625383", quantity: 1 }],
  email: "agent@stellar.org",
  shippingAddress: {
    name: "Stellar Agent",
    address1: "123 Testnet Lane",
    city: "Lagos",
    postalCode: "100001",
    country: "NG",
  },
};

async function run() {
  console.log("\n" + "=".repeat(70));
  console.log("🌟  Stellar x402 Payment Test — Shopify Checkout");
  console.log("=".repeat(70));
  console.log(`Network  : ${NETWORK}`);
  console.log(`Endpoint : ${BASE_URL}/x402/checkout`);

  // ─── PHASE 1: get the 402 quote ──────────────────────────────────
  console.log("\n📦 Phase 1: Requesting checkout quote...");
  const phase1Res = await fetch(`${BASE_URL}/x402/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CHECKOUT_BODY),
  });
  
  const phase1 = await phase1Res.json();
  const authHeader = phase1Res.headers.get("www-authenticate");
  console.log(`   Status:       ${phase1Res.status}`);
  console.log(`   Auth Header:  ${authHeader ? "Yes (length " + authHeader.length + ")" : "No"}`);
  
  if (phase1Res.status !== 402) {
    console.error("❌ Expected HTTP 402 from Phase 1, got:", phase1Res.status);
    console.error(phase1);
    process.exit(1);
  }

  const { orderIntentId, amounts } = phase1;

  console.log(`\n✅ Payment required:`);
  console.log(`   orderIntentId : ${orderIntentId}`);
  console.log(`   total         : ${amounts.total} ${amounts.currency}`);

  // ─── SIGN + PHASE 2: use wrapFetchWithPayment ─────────────────────
  console.log("\n✍️  Setting up Stellar signer...");
  const signer = createEd25519Signer(PRIVATE_KEY, NETWORK);
  console.log(`   Signer address: ${signer.address}`);

  const rpcConfig = { url: RPC_URL };
  const scheme = new ExactStellarScheme(signer, rpcConfig);
  const client = new x402Client().register("stellar:*", scheme);

  // Custom fetch wrapper to inject fee logic for testnet
  // wait, wrapFetchWithPayment doesn't expose the Tx directly...
  // Let's just use the manual logic which allows us to intercept the payload and modify fee

  const payFetch = wrapFetchWithPayment(fetch, client);

  console.log("\n🚀 Phase 2: Submitting payment (auto-sign + retry)...");
  const phase2Body = { ...CHECKOUT_BODY, orderIntentId };

  const phase2Res = await payFetch(`${BASE_URL}/x402/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(phase2Body),
  });

  const phase2 = await phase2Res.json();
  console.log(`   Status: ${phase2Res.status}`);

  if (phase2Res.status === 200) {
    console.log("\n" + "=".repeat(70));
    console.log("✅  ORDER CONFIRMED!");
    console.log(`   Order ID    : ${phase2.orderId}`);
    console.log(`   Shopify ID  : ${phase2.shopifyOrderId || "N/A"}`);
    console.log(`   Total Paid  : $${amounts.total} ${amounts.currency} USDC`);
    console.log("=".repeat(70) + "\n");
  } else {
    console.error("\n❌ Payment/order failed");
    console.error(phase2Res.status, phase2);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("❌ Unhandled error:", err?.message || err);
  process.exit(1);
});
