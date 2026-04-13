/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";
import { z } from "zod";

/**
 * MCP Payment Handler for x402 Stellar Payments (USDC)
 *
 * Provides a tool to make USDC payments via Stellar and return a payment proof
 * that can be used to finalize the checkout with a signed X-PAYMENT header.
 */

let mcpPaymentInstance: any = null;

async function initializeMCPPaymentServer(): Promise<any> {
  if (mcpPaymentInstance) {
    return mcpPaymentInstance;
  }

  const server = new McpServer({
    name: "x402-stellar-payment-agent",
    version: "2.0.0",
  });

  server.tool(
    "make_usdc_payment",
    "Create a USDC payment on Stellar via the x402 protocol and return a signed payment header",
    {
      resourceUrl: z
        .string()
        .describe("Full URL of the x402-protected resource to pay for"),
      checkoutInfo: z
        .any()
        .optional()
        .describe("The original checkout arguments (items, address, etc.) used to trigger the 402 - REQUIRED if the resource needs a POST to probe"),
      network: z
        .string()
        .default("stellar:testnet")
        .describe("Stellar network identifier (stellar:testnet or stellar:pubnet)"),
    },
    async (args) => {
      return await handleMakeUsdcPayment(args as any);
    }
  );

  mcpPaymentInstance = server;
  return server;
}

export async function handleMCPPaymentRequest(req: ExpressRequest, res: ExpressResponse) {
  const requestId = `mcp_payment_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;
  const startTime = Date.now();

  console.log(`\n${"=".repeat(80)}`);
  console.log(`[${requestId}] 💳 MCP Stellar Payment Request Received (JSON-RPC 2.0)`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`${"=".repeat(80)}`);

  try {
    const body = req.body;
    console.log(`[${requestId}] 📨 Request body:`, JSON.stringify(body, null, 2));

    await initializeMCPPaymentServer();

    const jsonRpcRequest = body;
    const method = jsonRpcRequest.method;
    const params = jsonRpcRequest.params || {};
    const id = jsonRpcRequest.id;

    console.log(`[${requestId}] 🔧 Method: ${method}`);

    let jsonRpcResponse: any;

    if (method === "initialize") {
      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-06-18",
          capabilities: {
            tools: {},
            resources: { subscribe: false },
            prompts: {},
          },
          serverInfo: {
            name: "x402-stellar-payment-agent",
            version: "2.0.0",
          },
        },
      };
    } else if (method === "tools/list") {
      const tools = [
        {
          name: "make_usdc_payment",
          description:
            "Create a USDC payment on Stellar via the x402 protocol and return a signed payment header",
          inputSchema: {
            type: "object",
            properties: {
              resourceUrl: {
                type: "string",
                description: "Full URL of the x402-protected resource to pay for",
              },
              checkoutInfo: {
                type: "object",
                description: "The original checkout arguments (items, address, etc.) used to trigger the 402 - REQUIRED if the resource needs a POST to probe",
              },
              network: {
                type: "string",
                description:
                  "Stellar network identifier (stellar:testnet or stellar:pubnet)",
                default: "stellar:testnet",
              },
            },
            required: ["resourceUrl"],
          },
        },
      ];

      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
    } else if (method === "tools/call") {
      const toolName = params.name;
      const toolArgs = params.arguments || {};

      console.log(`[${requestId}] 📝 Tool name: ${toolName}`);
      console.log(
        `[${requestId}] 📋 Tool arguments:`,
        JSON.stringify(toolArgs, null, 2)
      );

      let toolResult;
      switch (toolName) {
        case "make_usdc_payment":
          toolResult = await handleMakeUsdcPayment(toolArgs);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(toolResult, null, 2),
            },
          ],
        },
      };
    } else {
      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] ⏱️  Request completed in ${duration}ms`);
    return res.status(200).json(jsonRpcResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Request processing failed:`, error?.message);
    console.log(`[${requestId}] ⏱️  Request failed after ${duration}ms`);
    return res.status(200).json({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: error.message,
      },
    });
  }
}

/**
 * Fetches a 402 response, signs the payment with the agent's Stellar key,
 * and returns the signed X-PAYMENT header value that can be used to retry.
 */
async function handleMakeUsdcPayment(args: any): Promise<any> {
  console.log(`[handleMakeUsdcPayment] 💳 Starting Stellar payment handler...`);

  const { resourceUrl, network = "stellar:testnet" } = args;

  if (!resourceUrl) {
    throw new Error("Missing required parameter: resourceUrl");
  }

  const stellarPrivateKey = process.env.WALLET_SECRET_KEY;
  if (!stellarPrivateKey) {
    throw new Error("WALLET_SECRET_KEY environment variable not set");
  }

  const stellarRpcUrl =
    process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

  try {
    const signer = createEd25519Signer(stellarPrivateKey, network);
    console.log(`[handleMakeUsdcPayment] ✓ Signer created: ${signer.address}`);

    const rpcConfig = { url: stellarRpcUrl };
    const client = new x402Client().register(
      "stellar:*",
      new ExactStellarScheme(signer, rpcConfig)
    );
    const httpClient = new x402HTTPClient(client);

    // Step 1 – probe for 402
    const { checkoutInfo } = args;
    let firstTry: globalThis.Response;
    
    if (checkoutInfo) {
      console.log(`[handleMakeUsdcPayment] 🌐 Triggering 402 with POST...`);
      let finalBody = checkoutInfo;
      if (typeof checkoutInfo === "string") {
        try {
          const parsed = JSON.parse(checkoutInfo);
          if (typeof parsed !== "object" || parsed === null) {
            finalBody = JSON.stringify(checkoutInfo);
          }
        } catch {
          finalBody = JSON.stringify(checkoutInfo);
        }
      } else {
        finalBody = JSON.stringify(checkoutInfo);
      }

      firstTry = await fetch(resourceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: finalBody,
      });
    } else {
      console.log(`[handleMakeUsdcPayment] 🌐 Probing resource: ${resourceUrl}`);
      firstTry = await fetch(resourceUrl);
    }

    console.log(`[handleMakeUsdcPayment] Status: ${firstTry.status}`);

    if (firstTry.status !== 402) {
      return {
        success: false,
        error: `Expected 402 from ${resourceUrl}, got ${firstTry.status}`,
      };
    }

    // Step 2 – parse payment requirements
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => firstTry.headers.get(name)
    );

    // Step 3 – create payment payload
    let paymentPayload = await client.createPaymentPayload(paymentRequired);

    // Stellar testnet trick: set fee to 1 stroop to avoid facilitator limits
    try {
      const networkPassphrase = getNetworkPassphrase(network);
      const tx = new Transaction(
        paymentPayload.payload.transaction as string,
        networkPassphrase
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
              networkPassphrase,
            })
              .build()
              .toXDR(),
          },
        };
      }
    } catch (feeErr: any) {
      console.warn(
        `[handleMakeUsdcPayment] ⚠️  Fee adjustment skipped: ${feeErr.message}`
      );
    }

    // Step 4 – encode the signed payment header
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
    const signature = paymentHeaders["Payment-Signature"] || 
                     paymentHeaders["payment-signature"] || 
                     paymentHeaders["X-PAYMENT"] || 
                     paymentHeaders["x-payment"] ||
                     Object.values(paymentHeaders)[0];

    if (!signature) {
      throw new Error("Failed to generate payment signature: headers are empty");
    }

    console.log(`[handleMakeUsdcPayment] ✅ Payment signature created`);

    return {
      success: true,
      paymentSignature: signature,
      signerAddress: signer.address,
      details: {
        resourceUrl,
        network,
        message:
          "Payment signed. Use 'paymentSignature' when finalizing the checkout with the finalize_checkout tool.",
      },
    };
  } catch (err: any) {
    console.error(`[handleMakeUsdcPayment] ❌ Payment failed:`, err.message);
    return {
      success: false,
      error: err.message,
      details: {
        message:
          "Payment failed. Ensure WALLET_SECRET_KEY is set and the account has USDC on testnet.",
      },
    };
  }
}
