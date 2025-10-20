/**
 * Agent Config Merger
 * Merges agent configuration with base CeregrepClient config
 */

import { Config, MCPServerConfig } from '../config/schema.js';
import { Tool } from '../core/tool.js';
import { AgentConfig } from './schema.js';

/**
 * Result of merging agent config
 */
export interface MergedAgentConfig {
  config: Config;
  systemPrompt: string[];
  tools: Tool[];
}

/**
 * Merge agent configuration with base config
 *
 * This function applies agent-specific settings to the base config:
 * - System prompt: replace or append based on systemPromptMode
 * - Tools: filter to only include enabled tools
 * - MCP Servers: filter and apply tool-level disabling
 *
 * @param baseConfig - Base ceregrep configuration
 * @param agentConfig - Agent configuration to merge
 * @param availableTools - All available tools (including MCP tools)
 * @returns Merged configuration with system prompt and filtered tools
 */
export function mergeAgentConfig(
  baseConfig: Config,
  agentConfig: AgentConfig,
  availableTools: Tool[]
): MergedAgentConfig {
  // Handle system prompt
  const systemPrompt = mergeSystemPrompt(baseConfig, agentConfig);

  // Filter tools based on agent config
  const filteredTools = filterTools(availableTools, agentConfig);

  // Filter and configure MCP servers
  const mcpServers = filterMCPServers(baseConfig.mcpServers || {}, agentConfig);

  return {
    config: {
      ...baseConfig,
      mcpServers,
    },
    systemPrompt,
    tools: filteredTools,
  };
}

/**
 * Merge system prompts based on agent's systemPromptMode
 */
function mergeSystemPrompt(
  baseConfig: Config,
  agentConfig: AgentConfig
): string[] {
  const basePrompts: string[] = (baseConfig as any).systemPrompt || [];

  if (agentConfig.systemPromptMode === 'replace') {
    return [agentConfig.systemPrompt];
  } else {
    // append mode
    return [...basePrompts, agentConfig.systemPrompt];
  }
}

/**
 * Filter tools based on agent configuration
 *
 * Filters both built-in tools and MCP tools:
 * - Checks if tool is explicitly enabled in agent config
 * - For MCP tools, checks both server-level and tool-level disabling
 */
function filterTools(
  availableTools: Tool[],
  agentConfig: AgentConfig
): Tool[] {
  return availableTools.filter((tool) => {
    // Check if tool is enabled in agent config
    const toolEnabled = agentConfig.tools[tool.name];
    if (!toolEnabled) {
      return false;
    }

    // Special handling for MCP tools
    if (tool.name.startsWith('mcp__')) {
      const parts = tool.name.split('__');
      if (parts.length >= 3) {
        const serverName = parts[1]!;
        const toolName = parts.slice(2).join('__');

        // Check if MCP server is enabled
        const serverConfig = agentConfig.mcpServers[serverName];
        if (!serverConfig || !serverConfig.enabled) {
          return false;
        }

        // Check if tool is specifically disabled for this server
        if (serverConfig.disabledTools.includes(toolName)) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Filter MCP servers based on agent configuration
 *
 * Merges agent-level MCP server configuration with base config:
 * - Removes servers not enabled in agent config
 * - Combines disabledTools from both base and agent config
 */
function filterMCPServers(
  baseMCPServers: Record<string, MCPServerConfig>,
  agentConfig: AgentConfig
): Record<string, MCPServerConfig> {
  const filtered: Record<string, MCPServerConfig> = {};

  for (const [serverName, baseServerConfig] of Object.entries(baseMCPServers)) {
    const agentServerConfig = agentConfig.mcpServers[serverName];

    // Skip servers not enabled in agent config
    if (!agentServerConfig || !agentServerConfig.enabled) {
      continue;
    }

    // Merge disabled tools from base and agent config
    const combinedDisabledTools = [
      ...(baseServerConfig.disabledTools || []),
      ...agentServerConfig.disabledTools,
    ];

    // Remove duplicates
    const uniqueDisabledTools = [...new Set(combinedDisabledTools)];

    filtered[serverName] = {
      ...baseServerConfig,
      disabledTools: uniqueDisabledTools,
    };
  }

  return filtered;
}

/**
 * Create a config object suitable for CeregrepClient initialization
 *
 * This helper constructs the options object that can be passed to
 * new CeregrepClient(options) with agent-specific overrides.
 */
export function createAgentClientConfig(
  baseConfig: Config,
  agentConfig: AgentConfig,
  availableTools: Tool[]
): any {
  const merged = mergeAgentConfig(baseConfig, agentConfig, availableTools);

  return {
    model: merged.config.model,
    slowAndCapableModel: merged.config.slowAndCapableModel,
    provider: merged.config.provider,
    apiKey: merged.config.apiKey,
    mcpServers: merged.config.mcpServers,
    enableThinking: merged.config.enableThinking,
    ultrathinkMode: merged.config.ultrathinkMode,
    maxThinkingTokens: merged.config.maxThinkingTokens,
    verbose: merged.config.verbose,
    debug: merged.config.debug,
    compactionThreshold: merged.config.compactionThreshold,
    compactionKeepRecentCount: merged.config.compactionKeepRecentCount,
    systemPrompt: merged.systemPrompt,
    tools: merged.tools,
  };
}
