import { initializeMCPServer } from "./api/mcp-handler.js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

async function test() {
  console.error("Initializing server...");
  const server = await initializeMCPServer();
  
  console.error("Calling list_stores tool...");
  // Use callTool on the server instance
  const result = await server.callTool("list_stores", {});
  console.log(JSON.stringify(result, null, 2));
}

test().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
