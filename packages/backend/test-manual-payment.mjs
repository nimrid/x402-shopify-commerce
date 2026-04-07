#!/usr/bin/env node
/**
 * Manual x402 payment test - follows official Stellar x402 v2 spec
 */

import { createEd25519Signer } from "@x402/stellar";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), ".env") });

const BASE_URL = "http://localhost:3001";
const NETWORK = process.env.X402_NETWORK || "stellar:testnet";
const PRIVATE_KEY = process.env.WALLET_SECRET_KEY;
const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

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
  console.log("🌟  Stellar x402 v2 Payment Test");
  console.log("=".repeat(70));

  // Phase 1: Get 402 response
  console.log("\n📦 Phase 1: Requesting checkout quote...");
  const phase1Res = await fetch(`${BASE_URL}/x402/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CHECKOUT_BODY),
  });

  const phase1 = await phase1Res.json();
  const authHeader = phase1Res.headers.get("www-authenticate");
  
  console.log(`   Status: ${phase1Res.status}`);
  
  if (phase1Res.status !== 402) {
    console.error("❌ Expected 402, got:", phase1Res.status);
    process.exit(1);
  }

  const { orderIntentId, amounts } = phase1;
  console.log(`\n✅ Order intent created:`);
  console.log(`   ID: ${orderIntentId}`);
  console.log(`   Total: ${amounts.total} ${amounts.currency}`);

  // Decode payment requirements from header
  const base64Part = authHeader.replace("x402 ", "");
  const paymentReq = JSON.parse(Buffer.from(base64Part, "base64").toString("utf-8"));
  
  console.log(`\n📋 Payment requirements (from header):`);
  console.log(JSON.stringify(paymentReq, null, 2));
  console.log(`\n📋 Raw header: ${authHeader.substring(0, 100)}...`);

  // Phase 2: Create payment payload
  console.log(`\n✍️  Creating payment payload...`);
  const signer = createEd25519Signer(PRIVATE_KEY, NETWORK);
  const rpcConfig = { url: RPC_URL };

  console.log(`   Signer address: ${signer.address}`);

  try {
    // Import x402 client
    const { x402Client, x402HTTPClient } = await import("@x402/fetch");
    const { ExactStellarScheme } = await import("@x402/stellar/exact/client");
    
    // Setup client - register for stellar networks (v2 is implicit)
    const scheme = new ExactStellarScheme(signer, rpcConfig);
    const client = new x402Client().register("stellar:*", scheme);
    const httpClient = new x402HTTPClient(client);

    // Parse payment requirements from headers
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => phase1Res.headers.get(name)
    );

    console.log(`   ✓ Payment requirements parsed`);
    console.log(`   ✓ Scheme: ${paymentRequired[0]?.scheme}`);
    console.log(`   ✓ Price: ${paymentRequired[0]?.price}`);
    console.log(`   ✓ Network: ${paymentRequired[0]?.network}`);
    console.log(`   ✓ Version: ${paymentRequired[0]?.x402Version}`);

    // Extract version from the first requirement
    const version = paymentRequired[0]?.x402Version || 2;

    // Create payment payload - use scheme directly
    const paymentPayload = await scheme.createPaymentPayload(version, paymentRequired[0]);
    console.log(`   ✓ Payment payload created`);

    // Encode payment headers
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

    // Phase 3: Submit with payment
    console.log(`\n🚀 Phase 2: Submitting with payment...`);
    const phase2Body = { ...CHECKOUT_BODY, orderIntentId };
    
    const phase2Res = await fetch(`${BASE_URL}/x402/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...paymentHeaders,
      },
      body: JSON.stringify(phase2Body),
    });

    const phase2 = await phase2Res.json();
    console.log(`   Status: ${phase2Res.status}`);

    if (phase2Res.status === 200) {
      console.log("\n" + "=".repeat(70));
      console.log("✅  ORDER CONFIRMED!");
      console.log(`   Order ID: ${phase2.orderId}`);
      console.log(`   Shopify ID: ${phase2.shopifyOrderId || "N/A"}`);
      console.log(`   Total: ${amounts.total} ${amounts.currency}`);
      console.log("=".repeat(70) + "\n");
    } else {
      console.error("\n❌ Payment failed");
      console.error(JSON.stringify(phase2, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("❌ Unhandled error:", err.message);
  process.exit(1);
});
