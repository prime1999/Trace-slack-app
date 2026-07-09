import { Client } from "@modelcontextprotocol/sdk/client/index.js";

console.log("Client OK");

try {
  const transportModule =
    await import("@modelcontextprotocol/sdk/client/streamableHttp.js");

  console.log("Streamable HTTP transport found");
  console.log(Object.keys(transportModule));
} catch (error) {
  console.error("Transport not found");
  console.error(error);
}
