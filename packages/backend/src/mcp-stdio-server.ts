import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initializeMCPServer } from "./api/mcp-handler.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  console.error("Starting x402 Shopping Agent MCP Server (stdio)...");
  
  const server = await initializeMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("x402 Shopping Agent MCP Server connected via stdio");
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
