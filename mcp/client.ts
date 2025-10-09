/**
 * MCP Client Manager
 * Simplified stub - full implementation would connect to MCP servers
 * TODO: Implement full MCP server connection and tool discovery
 */

import { Tool } from '../core/tool.js';

/**
 * Get MCP tools from configured servers
 * Currently returns empty array - implement full MCP support later
 */
export async function getMCPTools(): Promise<Tool[]> {
  // TODO: Implement MCP server connection
  // 1. Read MCP server config from .ceregrep.json
  // 2. Connect to servers via stdio or SSE
  // 3. Call tools/list to discover tools
  // 4. Convert to Tool interface
  // 5. Return array of MCP tools

  return [];
}
