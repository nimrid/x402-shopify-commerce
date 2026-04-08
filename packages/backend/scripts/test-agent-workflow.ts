import fs from "fs";

async function callMCPTool(url: string, name: string, args: any) {
  const payload = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let json;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`Invalid JSON response: ${rawText}`);
  }

  if (json.error) {
    throw new Error(`MCP JSON-RPC Error: ${JSON.stringify(json.error)}`);
  }

  // The MCP output is usually inside result.content[0].text
  const contentText = json.result?.content?.[0]?.text;
  if (!contentText) {
    throw new Error(`Missing tool response content: ${rawText}`);
  }

  return JSON.parse(contentText);
}

async function main() {
  const storeId = "store_92666f85";
  const productId = "gid://shopify/ProductVariant/48325087625383";
  const MCP_GENERAL_URL = "http://127.0.0.1:3001/mcp";
  const MCP_PAYMENT_URL = "http://127.0.0.1:3001/mcp/payment";

  console.log(`\n============ AGENT WORKFLOW START ============`);
  console.log(`🛍️ Intending to buy 1x Gothic Art from Store ${storeId}`);

  // 1. INITIATE CHECKOUT
  console.log(`\n[1/3] Initiating checkout via MCP...`);
  const checkoutResult = await callMCPTool(MCP_GENERAL_URL, "initiate_checkout", {
    storeId,
    items: [{ productId, quantity: 1 }],
    email: "agent@test.com",
    shippingAddress: {
      name: "Agent Buyer",
      address1: "123 Agent St",
      city: "SF",
      state: "CA",
      postalCode: "94105",
      country: "US"
    }
  });

  if (checkoutResult.error) {
    console.error("❌ Checkout failed!", checkoutResult.error, checkoutResult.details);
    process.exit(1);
  }

  console.log(`✅ Checkout Initiated!`);
  console.log(`- Phase:          ${checkoutResult.phase}`);
  console.log(`- Order Intent:   ${checkoutResult.orderIntentId}`);
  console.log(`- Message:        ${checkoutResult.message}`);

  const reqObj = checkoutResult.paymentRequirements[0];
  const microUsdc = reqObj.amount;
  const payTo = reqObj.payTo;

  console.log(`\n[2/3] Calling Payment Agent to pay on Stellar...`);
  console.log(`- Amount to Pay:  ${microUsdc} micro USDC`);
  console.log(`- Destination:    ${payTo}`);
  
  // 2. MAKE PAYMENT
  const paymentResult = await callMCPTool(MCP_PAYMENT_URL, "make_usdc_payment", {
    recipientAddress: payTo,
    amountMicroUsdc: microUsdc,
    network: reqObj.network,
    memo: `x402-dev-test`
  });

  if (paymentResult.error) {
    console.error("❌ Payment failed!", paymentResult.error);
    process.exit(1);
  }

  console.log(`✅ Payment Successful!`);
  console.log(`- Tx Signature:   ${paymentResult.details.transactionSignature}`);
  
  const paymentProof = paymentResult.paymentProof;

  // 3. FINALIZE CHECKOUT
  console.log(`\n[3/3] Finalizing checkout with payment proof...`);
  const finalizeResult = await callMCPTool(MCP_GENERAL_URL, "finalize_checkout", {
    storeId,
    orderIntentId: checkoutResult.orderIntentId,
    items: [{ productId, quantity: 1 }],
    email: "agent@test.com",
    shippingAddress: {
      name: "Agent Buyer",
      address1: "123 Agent St",
      city: "SF",
      state: "CA",
      postalCode: "94105",
      country: "US"
    },
    paymentProof
  });

  if (finalizeResult.error) {
    console.error("❌ Finalize failed!", finalizeResult.error);
    process.exit(1);
  }

  console.log(`✅ Purchase Complete!`);
  console.log(`- Final Phase:    ${finalizeResult.phase}`);
  console.log(`- Order Status:   ${finalizeResult.status}`);
  console.log(`- Shopify ID:     ${finalizeResult.shopifyOrderId}`);
  console.log(`- System ID:      ${finalizeResult.orderId}`);
  
  console.log(`\n🎉 workflow executed successfully!`);
}

main().catch(console.error);
