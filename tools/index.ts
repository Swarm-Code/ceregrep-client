/**
 * Tool registry for Ceregrep Agent Framework
 * Exports all available tools and tool loading functions
 */

import { Tool } from '../core/tool.js';
import { BashTool } from './bash.js';
import { GrepTool } from './grep.js';

/**
 * Get all built-in tools (Bash, Grep)
 * Does NOT include MCP tools
 */
export function getAllTools(): Tool[] {
  return [BashTool, GrepTool];
}

/**
 * Get all enabled tools including MCP tools
 * Filters by isEnabled() method and MCP server configuration
 *
 * @param includeMCP - Whether to include MCP tools (default: true)
 * @returns Array of enabled tools
 */
export async function getTools(includeMCP: boolean = true): Promise<Tool[]> {
  let tools = getAllTools();

  // Add MCP tools if requested
  if (includeMCP) {
    try {
      const { getMCPTools } = await import('../mcp/client.js');

      // Add timeout to MCP tool loading to prevent hanging
      const mcpLoadTimeoutMs = 15000; // 15 second timeout

      const mcpToolsPromise = getMCPTools();

      const timeoutPromise = new Promise<Tool[]>((resolve) => {
        const timeoutId = setTimeout(() => {
          if (process.env.DEBUG_MCP) {
            console.warn('[MCP] Tool loading timed out, continuing without MCP tools');
          }
          resolve([]); // Return empty tools on timeout
        }, mcpLoadTimeoutMs);

        mcpToolsPromise.then(
          () => clearTimeout(timeoutId),
          () => clearTimeout(timeoutId)
        );
      });

      const mcpTools = await Promise.race([mcpToolsPromise, timeoutPromise]);
      tools = [...tools, ...mcpTools];

      // Filter MCP tools based on configuration
      const { getConfig } = await import('../config/loader.js');
      const config = await getConfig(process.cwd());

      // Filter out tools from disabled MCP servers
      tools = tools.filter((tool) => {
        if (!tool.name.startsWith('mcp__')) {
          return true; // Keep non-MCP tools
        }

        // Extract server name from tool name format: mcp__<server>__<tool>
        const parts = tool.name.split('__');
        if (parts.length < 3) return true;

        const serverName = parts[1];
        const toolName = parts[2];

        const serverConfig = config.mcpServers?.[serverName];
        if (!serverConfig) return true;

        // Skip if entire server is disabled
        if (serverConfig.disabled) {
          return false;
        }

        // Skip if this specific tool is disabled in the server
        if (serverConfig.disabledTools?.includes(toolName)) {
          return false;
        }

        return true;
      });
    } catch (error) {
      if (process.env.DEBUG_MCP) {
        console.warn('[MCP] Failed to load MCP tools:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  // Filter by isEnabled
  const enabledFlags = await Promise.all(
    tools.map(async (tool) => {
      try {
        return tool.isEnabled ? await tool.isEnabled() : true;
      } catch {
        return false;
      }
    }),
  );

  return tools.filter((_, i) => enabledFlags[i]);
}

// Re-export individual tools
export { BashTool, GrepTool };
