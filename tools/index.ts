/**
 * Tool registry for Ceregrep Agent Framework
 * Exports converted Kode tools
 */

import { Tool } from '../core/tool.js';
import { BashTool } from './BashTool/BashTool.js';
import { GrepTool } from './GrepTool/GrepTool.js';
import { FileReadTool } from './FileReadTool/FileReadTool.js';
import { GlobTool } from './GlobTool/GlobTool.js';
import { LSTool } from './lsTool/lsTool.js';
import { TodoWriteTool } from './TodoWriteTool/TodoWriteTool.js';
import { TodoReadTool } from './TodoReadTool/TodoReadTool.js';
import { FileEditTool } from './FileEditTool/FileEditTool.js';
import { FileWriteTool } from './FileWriteTool/FileWriteTool.js';
import { isToolEnabled } from '../utils/permissions.js';

// Cache for memoized tool loading
let cachedTools: Tool[] | null = null;

/**
 * Get all built-in tools
 * Does NOT include MCP tools
 */
export function getAllTools(): Tool[] {
  return [
    BashTool as unknown as Tool,
    GrepTool as unknown as Tool,
    FileReadTool as unknown as Tool,
    FileEditTool as unknown as Tool,
    FileWriteTool as unknown as Tool,
    GlobTool as unknown as Tool,
    LSTool as unknown as Tool,
    TodoWriteTool as unknown as Tool,
    TodoReadTool as unknown as Tool,
  ];
}

/**
 * Get all enabled tools including MCP tools and agent tools
 * Filters by isEnabled() method and MCP server configuration
 * MEMOIZED: Tools are loaded once and cached for the session
 *
 * @param includeMCP - Whether to include MCP tools (default: true)
 * @param includeAgents - Whether to include agent tools (default: true)
 * @returns Array of enabled tools
 */
export async function getTools(includeMCP: boolean = true, includeAgents: boolean = true): Promise<Tool[]> {
  // Return cached tools if already loaded
  if (cachedTools !== null) {
    return cachedTools;
  }

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

  // Add agent tools if requested
  if (includeAgents) {
    try {
      const { getAgentTools } = await import('../agents/index.js');
      const agentTools = await getAgentTools();
      tools = [...tools, ...agentTools];
    } catch (error) {
      if (process.env.DEBUG_MCP) {
        console.warn('[AGENTS] Failed to load agent tools:', error instanceof Error ? error.message : String(error));
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

  let enabledTools = tools.filter((_, i) => enabledFlags[i]);

  // Filter by permissions (disabled tools in config)
  enabledTools = enabledTools.filter((tool) => isToolEnabled(tool.name));

  // Cache the enabled tools for future calls
  cachedTools = enabledTools;

  return enabledTools;
}

/**
 * Clear the tool cache (useful for testing or when MCP servers change)
 */
export function clearToolCache(): void {
  cachedTools = null;
}

// Re-export individual tools
export {
  BashTool,
  GrepTool,
  FileReadTool,
  FileEditTool,
  FileWriteTool,
  GlobTool,
  LSTool,
  TodoWriteTool,
  TodoReadTool,
};
