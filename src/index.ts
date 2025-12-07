#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { LocalCoinSwapClient } from './api-client.js';
import { createServer } from './server.js';
import type { ServerConfig } from './types.js';

// Load configuration from environment
export function loadConfig(): ServerConfig {
  const apiToken = process.env.LCS_API_TOKEN || '';
  const apiUrl = process.env.LCS_API_URL || 'https://api.localcoinswap.com';
  const requireConfirmation = process.env.LCS_REQUIRE_CONFIRMATION !== 'false';

  return { apiToken, apiUrl, requireConfirmation };
}

async function main() {
  const config = loadConfig();
  const client = new LocalCoinSwapClient(config.apiUrl, config.apiToken);
  const server = createServer(config, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with MCP protocol
  console.error('LocalCoinSwap MCP server started');
  console.error(`API URL: ${config.apiUrl}`);
  console.error(`Confirmation required: ${config.requireConfirmation}`);
  console.error(`API Token: ${config.apiToken ? 'configured' : 'NOT configured'}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
