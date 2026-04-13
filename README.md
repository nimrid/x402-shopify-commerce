# x402 Shopify Commerce - Agent-Ready Stores in 2 Minutes

Make any Shopify store agent-ready with HTTP 402 Payment Required protocol. Enable AI agents to discover products, place orders, and pay with USDC on Stellar - all natively integrated with your Shopify dashboard.

## The Problem We Solved

Shopify stores are designed for human customers. AI agents need a different kind of interface. Traditionally, integrating cryptocurrency payments required:
- Complex custom development
- Deep blockchain expertise
- Integration challenges with existing e-commerce systems
- Non-standard payment flows
- Manual API integrations for agent discovery

## Our Solution

We built a **2-minute setup** that transforms any Shopify store into an agent-ready marketplace:

1. **Connect Store** (30 seconds)
   - Paste your Shopify store URL and API token
   - Done - store is registered and discoverable by agents

2. **Select Products** (60 seconds)
   - Browse your Shopify products
   - Select which ones AI agents can purchase
   - Sync to platform

3. **Live Dashboard** (30 seconds)
   - View all agent orders in real-time
   - Orders appear directly in your Shopify admin
   - Monitor payment intents and cryptocurrency transactions

**No custom code. No blockchain knowledge needed. Works with existing Shopify setup.**

## How x402 & MCP Power This

**Model Context Protocol (MCP)** enables AI agent discovery and interaction:
- Stores register via a simple UI
- MCP server automatically exposes tools for agents
- Agents can browse stores, products, and place orders
- All through a standard JSON-RPC 2.0 interface

**HTTP 402 Payment Required** (via x402 specification) enables autonomous agent payments:

1. **Agent requests checkout** → Commerce Server responds with payment requirements (HTTP 402)
2. **Agent calls Payment Agent** → Payment Agent signs the x402 request with the agent's wallet
3. **Agent finalizes checkout** → Commerce Server verifies the proof and fulfills the order in Shopify
4. **Order synced** → Appears in your Shopify dashboard immediately for fulfillment

This standard-based approach means:
- ✅ No payment processing fees (peer-to-peer transfers)
- ✅ Instant, verifiable transactions on Stellar blockchain
- ✅ Native integration with Shopify (orders appear normally)
- ✅ Scalable architecture for agent commerce

## Key Features

- **Agent Discovery**: Your products are automatically discoverable by AI agents via MCP
- **Autonomous Payments**: Agents can pay for orders via the built-in x402 Payment Agent
- **Real-Time Orders**: See agent orders in your Shopify dashboard instantly
- **Payment Verification**: On-chain verification for every Stellar transaction
- **MCP Integration**: Dual-server architecture for both commerce discovery and payment signing
- **2-Minute Setup**: Connect your store and go live for agents instantly

## Project Structure

```
x402-shopify-commerce/
├── packages/
│   ├── frontend/          # Next.js store setup & management UI
│   │   ├── app/page.tsx               # Home page
│   │   ├── app/register/page.tsx      # Store registration
│   │   ├── app/products/page.tsx      # Product selection
│   │   └── app/dashboard/page.tsx     # Orders & payment monitoring
│   │
│   └── backend/           # Express.js API & payment server
│       ├── src/api/                   # REST and MCP endpoints
│       │   ├── x402-checkout.ts       # 2-phase checkout (HTTP 402)
│       │   ├── mcp-handler.ts         # Commerce tools (discovery/orders)
│       │   ├── mcp-payment-handler.ts # Payment agent tools (signing)
│       │   └── ...
│       ├── src/utils/                 # Shared helpers
│           ├── supabase.ts                # Supabase client init
│           ├── utils.ts                   # General utilities (e.g. toDollarStr)
│           ├── x402-config.ts             # Payment configuration
│           └── x402-payment-helpers.ts    # HTTP 402 utilities
│
└── README.md              # This file
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm/pnpm
- Shopify store with API access
- Stellar testnet account (for testing)

### Frontend Setup (No Environment Variables Required)

```bash
cd packages/frontend
pnpm install
pnpm dev
```

Frontend runs on **http://localhost:3000**

### Backend Setup

1. Create `.env` file in `packages/backend/`:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://account.supabase.co
SUPABASE_KEY=ey....

# Shopify Configuration
SHOPIFY_API_VERSION=2025-10

# x402 Payment Configuration
X402_NETWORK=stellar:testnet
X402_RECIPIENT_ADDRESS=GDN4Q...QBU3C
X402_USDC_ISSUER=GBBD6...G6A
X402_FACILITATOR_API_KEY=sk_...

# Stellar Wallet (Private Key)
WALLET_SECRET_KEY=SC...
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
```

2. Install and run:

```bash
cd packages/backend
pnpm install
pnpm dev:all
```

This starts:
- **Commerce Server** (port 3001): `http://localhost:3001/mcp` — Product discovery, checkout & all 6 agent tools
- **Payment Agent** (embedded, port 3001): `http://localhost:3001/mcp/payment` — also available with just `pnpm dev`
- **Standalone Payment Server** (port 3002, `dev:all` only): `http://localhost:3002/mcp` — exposes only `make_usdc_payment`

## Accessing the Application

### Store Owner Flow
1. Open **http://localhost:3000** (Frontend)
2. Click "Get Started"
3. Connect your Shopify store
4. Select products for agents to purchase
5. View orders in real-time dashboard

### AI Agent Access (via MCP)

The backend provides two ways for AI agents (like Claude Desktop) to interact with your store:

#### 1. Claude Desktop Setup (Stdio)/ Agentic platform - **Recommended for local dev**
Update your Claude Desktop configuration file (Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`) or `mcp_config.json`:

```json
{
  "mcpServers": {
    "x402-shopping-agent": {
      "command": "/filepath/filepath/stellar/x402-shopify-commerce/packages/backend/node_modules/.bin/tsx",
      "args": [
        "/filepath/filepath/stellar/x402-shopify-commerce/packages/backend/src/mcp-stdio-server.ts"
      ],
      "cwd": "/filepath/filepath/stellar/x402-shopify-commerce/packages/backend",
      "env": {
        "DOTENVX": "0",
        "DOTENV_CONFIG_QUIET": "true",
        "BACKEND_URL": "http://127.0.0.1:3001"
      }
    }
  }
}
```

> [!NOTE]
> Replace `/filepath/filepath/` in the configuration above with your actual absolute path to the project.

#### 2. HTTP MCP Servers (JSON-RPC / Remote)
These endpoints are plain **HTTP JSON-RPC 2.0 POST** endpoints — the remote equivalent of the stdio config above.

`http://localhost:3001/mcp` exposes **all 6 agent tools** (including `make_usdc_payment`), so a single config entry is all you need — just like the stdio setup:

For remote agent access, expose via ngrok and configure your MCP client:
```json
{
  "mcpServers": {
    "x402-shopping-agent": {
      "transport": "http",
      "url": "https://your-ngrok.io/mcp"
    }
  }
}
```

> [!NOTE]
> These endpoints accept standard **HTTP POST** with a JSON-RPC 2.0 body — not SSE streaming.

> [!TIP]
> **Advanced / split-agent setup:** If you want a dedicated agent that can *only* sign payments (no shopping tools), you can point it at `/mcp/payment` (port 3001) or `http://localhost:3002/mcp` (standalone server, started by `pnpm dev:all`). Both expose `make_usdc_payment` only.

### Available Tools:
- `list_stores` - Browse available stores
- `get_store_products` - View products for agents
- `initiate_checkout` - Start order (returns 402)
- `make_usdc_payment` - **Autonomous Agent Wallet**: Signs the payment for the checkout
- `finalize_checkout` - Complete order with the signature header
- `get_order_details` - Track status

### Expose to Internet (for LLM Integration)

Use **ngrok** to expose servers for AI agent access:

```bash
# Terminal 1: Expose main server
ngrok http 3001

# Terminal 2: Expose payment server
ngrok http 3002
```

Update your LLM chat client to use the ngrok URLs:
- Commerce API: `https://xxxx-ngrok.io/mcp`
- Payment Agent API: `https://xxxx-ngrok.io/mcp/payment` (Port 3001) or `https://yyyy-ngrok.io/mcp` (Port 3002)

## API Documentation

- **Backend API**: See `packages/backend/README.md` for detailed endpoint documentation
- **Frontend Pages**: See `packages/frontend/README.md` for UI documentation

## Technology Stack

### Frontend
- Next.js 14 (TypeScript)
- Tailwind CSS
- React Hooks
- Lucide Icons

### Backend
- Express.js (Node.js)
- TypeScript
- Supabase (PostgreSQL)
- Stellar SDK
- Model Context Protocol (MCP)

### Blockchain
- Stellar (testnet/pubnet)
- USDC token
- x402 Payment Protocol

## Checkout Flow (HTTP 402)

```
Agent calls commerce.initiate_checkout()
         ↓
Commerce Server returns HTTP 402 + Payment Requirements
         ↓
Agent calls payment_agent.make_usdc_payment(resourceUrl)
         ↓
Payment Agent signs transaction and returns Payment-Signature header
         ↓
Agent calls commerce.finalize_checkout(signature)
         ↓
Commerce Server verifies on-chain and creates Shopify order
         ↓
Order synced → Return Shopify confirmation
```

## Database Schema

- **stores**: Shopify store configurations
- **store_products**: Product catalog from Shopify
- **order_intents**: Pending payment intents (15-min expiry)
- **orders**: Confirmed orders linked to Shopify

See `packages/backend/README.md` for detailed schema.

## Security Features

- ✅ Blockchain-verified payments
- ✅ Request body hashing prevents cart tampering
- ✅ Order intent expiration (15 minutes)
- ✅ Payment verification before order creation
- ✅ No sensitive data in frontend storage
- ✅ Environment variables for all secrets

## Troubleshooting

### Frontend won't connect to backend
- Ensure backend is running on port 3001
- Check CORS settings
- Clear browser cache

### Products not loading
- Verify Shopify API token is valid
- Check Shopify API permissions
- Ensure products exist in store

### Payment verification fails
- Confirm Stellar transaction was successful
- Check X-PAYMENT header format
- Verify amount matches payment requirements

### Orders not appearing in Shopify
- Confirm backend has valid Shopify admin token
- Check Shopify API endpoint version
- Review backend logs for errors

## Next Steps

1. **Configure Environment**: Add your secrets to `.env`
2. **Start Services**: Run `pnpm dev:all`
3. **Test Flow**: Use frontend to connect store
4. **Integrate Agents**: Expose via ngrok for LLM agents

## File Locations for Reference

- Backend REST API: `packages/backend/src/api/x402-checkout.ts`
- MCP Server: `packages/backend/src/api/mcp-handler.ts`
- Frontend Store Connection: `packages/frontend/app/register/page.tsx`
- Dashboard: `packages/frontend/app/dashboard/page.tsx`

## Learning Resources

- [HTTP 402 Payment Required Spec](https://tools.ietf.org/html/draft-fallon-http-payment-required-02)
- [x402 Payment Protocol](https://x402.org)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)

## License

MIT

## Support

For detailed API documentation:
- **Backend**: See `packages/backend/README.md`
- **Frontend**: See `packages/frontend/README.md`

---

**Built to showcase the power of HTTP 402 payments for agent commerce.**
