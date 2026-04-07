import express from "express";
import cors from "cors";
import { handleShopifyProducts } from "./api/shopify-products";
import { handleCreateStore } from "./api/create-store";
import { handleUpsertStoreProducts } from "./api/upsert-store-products";
import { handleGetOrderIntents } from "./api/x402-order-intents";
import { handleGetOrders } from "./api/x402-orders";
import { handleListStores } from "./api/x402-stores";
import { handleListStoreProducts } from "./api/x402-store-products";
import { handleCheckout } from "./api/x402-checkout";
import { handleGetOrderDetails } from "./api/x402-order-details";
import { handleMCPRequest } from "./api/mcp-handler";
import { handleMCPPaymentRequest } from "./api/mcp-payment-handler";

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions as any));
app.use(express.json({ strict: false }));

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// API Routes
// Shopify Integration
app.post("/api/shopify/products", handleShopifyProducts);

// Store Management
app.post("/api/stores", handleCreateStore);
app.post("/api/stores/:storeId/products", handleUpsertStoreProducts);

// x402 Agent APIs
app.get("/x402/stores", handleListStores);
app.get("/x402/stores/:storeId/products", handleListStoreProducts);
app.get("/x402/stores/:storeId/order-intents", handleGetOrderIntents);
app.get("/x402/stores/:storeId/orders", handleGetOrders);

// Checkout
app.post("/x402/checkout", handleCheckout);
app.get("/x402/orders/:orderId", handleGetOrderDetails);

// MCP Agent Servers
app.post("/mcp", handleMCPRequest);
app.post("/mcp/payment", handleMCPPaymentRequest);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});