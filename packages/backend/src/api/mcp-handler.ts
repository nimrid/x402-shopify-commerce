import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Transaction, TransactionBuilder } from "@stellar/stellar-sdk";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { createEd25519Signer, getNetworkPassphrase } from "@x402/stellar";
import { ExactStellarScheme } from "@x402/stellar/exact/client";

/**
 * MCP Server Handler for x402 Shopping Agent
 * Implements JSON-RPC 2.0 protocol for tool access
 */

let mcpServerInstance: McpServer | null = null;

/**
 * Initialize MCP server with tools
 */
export async function initializeMCPServer(): Promise<McpServer> {
  if (mcpServerInstance) {
    return mcpServerInstance;
  }

  const server = new McpServer({
    name: "x402-shopping-agent",
    version: "1.0.0",
  });

  // Register list_stores tool
  server.tool(
    "list_stores",
    "Get a list of all available stores",
    {},
    async () => {
      const result = await handleListStores();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register get_store_products tool
  server.tool(
    "get_store_products",
    "Get all products available in a specific store",
    {
      storeId: z.string().describe("The ID of the store"),
    },
    async (args) => {
      const result = await handleGetStoreProducts(args as { storeId: string });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register initiate_checkout tool
  server.tool(
    "initiate_checkout",
    "Initiate checkout for selected items (PHASE 1)",
    {
      storeId: z.string().describe("The ID of the store"),
      items: z
        .array(
          z.object({
            productId: z.string().describe("The product variant ID"),
            quantity: z.number().describe("Quantity to purchase"),
          })
        )
        .describe("Array of items to purchase"),
      email: z.string().describe("Buyer email address"),
      shippingAddress: z.object({
        name: z.string().describe("Full name"),
        address1: z.string().describe("Street address"),
        city: z.string().describe("City"),
        state: z.string().optional().describe("State/Province"),
        postalCode: z.string().describe("Postal code"),
        country: z.string().describe("Country"),
      }),
    },
    async (args) => {
      const result = await handleInitiateCheckout(args as any);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register finalize_checkout tool
  server.tool(
    "finalize_checkout",
    "Finalize checkout after user confirms payment (PHASE 2)",
    {
      storeId: z.string().describe("The ID of the store"),
      orderIntentId: z
        .string()
        .describe("The order intent ID from Phase 1 (402 response)"),
      items: z
        .array(
          z.object({
            productId: z.string(),
            quantity: z.number(),
          })
        )
        .describe("Same items array from Phase 1"),
      email: z.string().describe("Buyer email address (same as Phase 1)"),
      shippingAddress: z.object({
        name: z.string(),
        address1: z.string(),
        city: z.string(),
        state: z.string().optional(),
        postalCode: z.string(),
        country: z.string(),
      }),
      paymentSignature: z.string().describe("The base64-encoded x402 Payment-Signature header value"),
    },
    async (args) => {
      const result = await handleFinalizeCheckout(args as any);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register get_order_details tool
  server.tool(
    "get_order_details",
    "Get order details by order ID",
    {
      orderId: z.string().describe("The order ID to retrieve details for"),
    },
    async (args) => {
      const result = await handleGetOrderDetails(args as { orderId: string });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // Register make_usdc_payment tool (The "Agent Wallet")
  server.tool(
    "make_usdc_payment",
    "Autonomous Wallet: Create and sign a USDC payment for a checkout URL",
    {
      resourceUrl: z.string().describe("The checkout URL that returned 402"),
      checkoutInfo: z
        .any()
        .optional()
        .describe("The original checkout arguments (items, address, etc.) used to trigger the 402 - REQUIRED if the resource needs a POST to probe"),
      network: z
        .string()
        .optional()
        .default("stellar:testnet")
        .describe("Stellar network identifier"),
    },
    async (args) => {
      const result = await handleMakeUsdcPayment(args as any);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  mcpServerInstance = server;
  return server;
}

/**
 * Handle MCP requests via HTTP using JSON-RPC 2.0 protocol
 */
export async function handleMCPRequest(req: ExpressRequest, res: ExpressResponse) {
  const requestId = `mcp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();

  console.error(`\n${'='.repeat(80)}`);
  console.error(`[${requestId}] 🤖 MCP HTTP Request Received (JSON-RPC 2.0)`);
  console.error(`[${requestId}] Method: ${req.method}`);
  console.error(`[${requestId}] URL: ${req.url}`);
  console.error(`${'='.repeat(80)}`);

  try {
    const body = req.body;
    console.error(`[${requestId}] 📨 Request body:`, JSON.stringify(body, null, 2));

    // Initialize MCP server (caches instance)
    console.error(`[${requestId}] 📌 Initializing MCP server...`);
    await initializeMCPServer();
    console.error(`[${requestId}] ✓ MCP server ready`);

    // Handle JSON-RPC 2.0 request
    console.error(`[${requestId}] ⚙️  Processing JSON-RPC request...`);
    const jsonRpcRequest = body;
    const method = jsonRpcRequest.method;
    const params = jsonRpcRequest.params || {};
    const id = jsonRpcRequest.id;

    console.error(`[${requestId}] 🔧 Method: ${method}`);
    console.error(`[${requestId}] 📝 Params:`, JSON.stringify(params, null, 2));

    let jsonRpcResponse: any;

    // Handle different JSON-RPC methods
    if (method === "initialize") {
      console.error(`[${requestId}] 🔌 Handling initialize request...`);
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
            name: "x402-shopping-agent",
            version: "1.0.0",
          },
        },
      };
      console.error(`[${requestId}] ✅ Initialize response prepared`);
    } else if (method === "tools/list") {
      console.error(`[${requestId}] 🔧 Handling tools/list request...`);
      const tools = [
        {
          name: "list_stores",
          description: "Get a list of all available stores",
          inputSchema: {
            type: "object",
            properties: {},
            required: [],
          },
        },
        {
          name: "get_store_products",
          description: "Get all products available in a specific store",
          inputSchema: {
            type: "object",
            properties: {
              storeId: {
                type: "string",
                description: "The ID of the store",
              },
            },
            required: ["storeId"],
          },
        },
        {
          name: "initiate_checkout",
          description: "Initiate checkout for selected items (PHASE 1)",
          inputSchema: {
            type: "object",
            properties: {
              storeId: { type: "string" },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    productId: { type: "string" },
                    quantity: { type: "number" },
                  },
                },
              },
              email: { type: "string" },
              shippingAddress: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address1: { type: "string" },
                  city: { type: "string" },
                  state: { type: "string" },
                  postalCode: { type: "string" },
                  country: { type: "string" },
                },
              },
            },
            required: ["storeId", "items", "email", "shippingAddress"],
          },
        },
        {
          name: "finalize_checkout",
          description: "Finalize checkout after user confirms payment (PHASE 2)",
          inputSchema: {
            type: "object",
            properties: {
              storeId: { type: "string" },
              orderIntentId: { type: "string" },
              items: { type: "array" },
              email: { type: "string" },
              shippingAddress: { type: "object" },
              paymentSignature: { 
                type: "string",
                description: "The base64-encoded x402 Payment-Signature header value"
              },
            },
            required: ["storeId", "orderIntentId", "items", "email", "shippingAddress", "paymentSignature"],
          },
        },
        {
          name: "get_order_details",
          description: "Get order details by order ID",
          inputSchema: {
            type: "object",
            properties: {
              orderId: {
                type: "string",
                description: "The order ID to retrieve details for",
              },
            },
            required: ["orderId"],
          },
        },
      ];

      jsonRpcResponse = {
        jsonrpc: "2.0",
        id,
        result: { tools },
      };
      console.error(`[${requestId}] ✅ Tools list prepared (${tools.length} tools)`);
    } else if (method === "tools/call") {
      console.error(`[${requestId}] 🔨 Handling tools/call request...`);
      const toolName = params.name;
      const toolArgs = params.arguments || {};

      console.error(`[${requestId}] 📝 Tool name: ${toolName}`);
      console.error(`[${requestId}] 📋 Tool arguments:`, JSON.stringify(toolArgs, null, 2));

      let toolResult;
      switch (toolName) {
        case "list_stores":
          console.error(`[${requestId}] → Calling handleListStores...`);
          toolResult = await handleListStores();
          break;
        case "get_store_products":
          console.error(`[${requestId}] → Calling handleGetStoreProducts...`);
          toolResult = await handleGetStoreProducts(toolArgs);
          break;
        case "initiate_checkout":
          console.error(`[${requestId}] → Calling handleInitiateCheckout...`);
          toolResult = await handleInitiateCheckout(toolArgs);
          break;
        case "finalize_checkout":
          console.error(`[${requestId}] → Calling handleFinalizeCheckout...`);
          toolResult = await handleFinalizeCheckout(toolArgs);
          break;
        case "get_order_details":
          console.error(`[${requestId}] → Calling handleGetOrderDetails...`);
          toolResult = await handleGetOrderDetails(toolArgs);
          break;
        case "make_usdc_payment":
          console.error(`[${requestId}] → Calling handleMakeUsdcPayment...`);
          toolResult = await handleMakeUsdcPayment(toolArgs);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      console.error(`[${requestId}] ✅ Tool execution completed`);
      console.error(`[${requestId}] 📊 Tool result:`, JSON.stringify(toolResult, null, 2));

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

      console.error(`[${requestId}] 📨 JSON-RPC Response:`, JSON.stringify(jsonRpcResponse, null, 2));
    } else {
      console.error(`[${requestId}] ❌ Unknown JSON-RPC method: ${method}`);
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
    console.error(`[${requestId}] 📤 Sending JSON-RPC response...`);
    console.error(`[${requestId}] ⏱️  Request completed in ${duration}ms`);
    console.error(`[${requestId}] ${'='.repeat(76)}\n`);

    return res.status(200).json(jsonRpcResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Request processing failed`);
    console.error(`[${requestId}] Error type:`, error?.constructor?.name);
    console.error(`[${requestId}] Error message:`, error?.message);
    console.error(`[${requestId}] Stack:`, error?.stack);
    console.error(`[${requestId}] ⏱️  Request failed after ${duration}ms`);
    console.error(`[${requestId}] ${'='.repeat(76)}\n`);

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
 * Helper to call backend APIs
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3001";

async function callBackendAPI(
  endpoint: string,
  method: string = "GET",
  body?: any,
  headers?: any
): Promise<any> {
  const url = `${BACKEND_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    if (typeof body === "string") {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed === "object" && parsed !== null) {
          options.body = body; // It's already stringified JSON object
        } else {
          options.body = JSON.stringify(body);
        }
      } catch {
        options.body = JSON.stringify(body);
      }
    } else {
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    data,
  };
}

/**
 * Handler: List all available stores
 */
async function handleListStores(): Promise<any> {
  console.error(`[handleListStores] 🏪 Starting list stores handler...`);
  console.error(`[handleListStores] 📡 Calling backend API: GET /x402/stores`);

  const result = await callBackendAPI("/x402/stores");

  console.error(`[handleListStores] 📥 Backend response status: ${result.status}`);
  console.error(`[handleListStores] 📦 Response data:`, JSON.stringify(result.data, null, 2));

  if (result.status !== 200) {
    console.error(`[handleListStores] ❌ API call failed`);
    return {
      error: "Failed to fetch stores",
      status: result.status,
      details: result.data,
    };
  }

  console.error(`[handleListStores] ✅ API call successful`);
  // Backend returns stores directly as an array
  const stores = Array.isArray(result.data) ? result.data : result.data.stores || [];
  console.error(`[handleListStores] 📋 Found ${stores.length} store(s)`);
  stores.forEach((store: any, idx: number) => {
    console.error(`[handleListStores]   ${idx + 1}. ${store.name} (${store.id})`);
  });

  const response = {
    success: true,
    stores: stores,
  };
  console.error(`[handleListStores] 📤 Returning response:`, JSON.stringify(response, null, 2));
  return response;
}

/**
 * Handler: Get products from a store
 */
async function handleGetStoreProducts(args: any): Promise<any> {
  const storeId = String(args.storeId);
  const result = await callBackendAPI(`/x402/stores/${storeId}/products`);
  if (result.status !== 200) {
    return {
      error: "Failed to fetch products",
      status: result.status,
      details: result.data,
    };
  }
  return {
    success: true,
    storeId,
    products: result.data.products,
  };
}

/**
 * Handler: Initiate checkout (PHASE 1)
 */
async function handleInitiateCheckout(args: any): Promise<any> {
  const checkoutBody = {
    storeId: args.storeId,
    items: args.items,
    email: args.email,
    shippingAddress: args.shippingAddress,
    clientReferenceId: `agent_${Date.now()}`,
  };

  const result = await callBackendAPI("/x402/checkout", "POST", checkoutBody);

  if (result.status === 402) {
    // Expected response - payment required
    return {
      success: true,
      phase: "1_payment_required",
      ...result.data, // This includes x402Version, resource, accepts, etc.
      message: `Payment Required: ${result.data.amounts.total} ${result.data.amounts.currency}`,
    };
  }

  return {
    error: "Unexpected response from checkout",
    status: result.status,
    details: result.data,
  };
}

/**
 * Handler: Finalize checkout (PHASE 2)
 */
async function handleFinalizeCheckout(args: any): Promise<any> {
  const checkoutBody = {
    storeId: args.storeId,
    items: args.items,
    email: args.email,
    shippingAddress: args.shippingAddress,
    orderIntentId: args.orderIntentId,
    clientReferenceId: `agent_${Date.now()}`,
  };

  // Send payment signature in the correct v2 header
  const result = await callBackendAPI("/x402/checkout", "POST", checkoutBody, {
    "Payment-Signature": args.paymentSignature,
  });

  if (result.status === 200) {
    // Successful order
    return {
      success: true,
      phase: "2_order_confirmed",
      orderId: result.data.orderId,
      shopifyOrderId: result.data.shopifyOrderId,
      status: result.data.status,
      amounts: result.data.amounts,
      message: `Order confirmed! Order ID: ${result.data.orderId}`,
    };
  }

  if (result.status === 402) {
    // Payment verification failed - need to retry
    return {
      error: "Payment verification failed",
      status: 402,
      details: result.data,
      message: "Payment could not be verified. Please retry.",
    };
  }

  return {
    error: "Unexpected response from checkout finalization",
    status: result.status,
    details: result.data,
  };
}

/**
 * Handler: Autonomous Wallet (Sign Payment)
 */
async function handleMakeUsdcPayment(args: any): Promise<any> {
  const { resourceUrl, checkoutInfo, network = "stellar:testnet" } = args;
  const stellarPrivateKey = process.env.WALLET_SECRET_KEY;
  const stellarRpcUrl = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";

  if (!stellarPrivateKey) throw new Error("WALLET_SECRET_KEY not set");

  try {
    const signer = createEd25519Signer(stellarPrivateKey, network as any);
    const rpcConfig = { url: stellarRpcUrl };
    const client = new x402Client().register(
      "stellar:*",
      new ExactStellarScheme(signer, rpcConfig)
    );
    const httpClient = new x402HTTPClient(client);

    // 1. Probe for 402 (using POST if checkoutInfo provided)
    let probe: Response;
    if (checkoutInfo) {
      console.error(`[handleMakeUsdcPayment] 🌐 Triggering 402 with POST...`);
      
      let finalBody = checkoutInfo;
      if (typeof checkoutInfo === "string") {
        try {
          const parsed = JSON.parse(checkoutInfo);
          if (typeof parsed !== "object" || parsed === null) {
            finalBody = JSON.stringify(checkoutInfo);
          }
          // else: already stringified JSON object, keep it as is
        } catch {
          finalBody = JSON.stringify(checkoutInfo);
        }
      } else {
        finalBody = JSON.stringify(checkoutInfo);
      }

      probe = await fetch(resourceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: finalBody,
      });
    } else {
      console.error(`[handleMakeUsdcPayment] 🌐 Probing 402 with GET...`);
      probe = await fetch(resourceUrl);
    }

    if (probe.status !== 402) {
      console.error(`[handleMakeUsdcPayment] ❌ No 402 Required. Status: ${probe.status}`);
      return { success: false, error: `No 402 required (Status: ${probe.status})` };
    }

    // 2. Parse Requirements
    const paymentRequired = httpClient.getPaymentRequiredResponse((name) => probe.headers.get(name));

    // 3. Create Payload
    let paymentPayload = await client.createPaymentPayload(paymentRequired);

    // 4. Manual Fee Fix (Stellar Testnet Specific)
    try {
      const passphrase = getNetworkPassphrase(network as any);
      const tx = new Transaction(paymentPayload.payload.transaction as string, passphrase);
      const sorobanData = tx.toEnvelope().v1()?.tx()?.ext()?.sorobanData();
      if (sorobanData) {
        paymentPayload = {
          ...paymentPayload,
          payload: {
            ...paymentPayload.payload,
            transaction: TransactionBuilder.cloneFrom(tx, { fee: "1", sorobanData, networkPassphrase: passphrase }).build().toXDR(),
          }
        };
      }
    } catch {}

    // 5. Encode v2 Signature
    const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);
    console.error(`[handleMakeUsdcPayment] 📝 Signature headers:`, JSON.stringify(headers, null, 2));

    const signature = headers["Payment-Signature"] || 
                     headers["payment-signature"] || 
                     headers["X-PAYMENT"] || 
                     headers["x-payment"] || 
                     Object.values(headers)[0];

    if (!signature) {
      throw new Error("Failed to generate payment signature: headers are empty");
    }

    return {
      success: true,
      paymentSignature: signature,
      signerAddress: signer.address,
      message: "Payment successfully signed by agent wallet. Please use this 'paymentSignature' in the 'finalize_checkout' tool."
    };
  } catch (err: any) {
    console.error(`[handleMakeUsdcPayment] ❌ Signing failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Handler: Get order details
 */
async function handleGetOrderDetails(args: any): Promise<any> {
  const orderId = String(args.orderId);
  const result = await callBackendAPI(`/x402/orders/${orderId}`);

  if (result.status !== 200) {
    return {
      error: "Failed to fetch order details",
      status: result.status,
      details: result.data,
    };
  }

  return {
    success: true,
    order: result.data,
  };
}
