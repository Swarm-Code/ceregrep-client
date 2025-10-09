/**
 * Main exports for Ceregrep Agent Framework
 * Headless agent framework with TypeScript SDK, Python SDK, and CLI support
 */

// Core
export { Tool, ToolContext, ValidationResult, ToolResult, ToolUse } from './core/tool.js';
export { query, compact } from './core/agent.js';
export {
  Message,
  UserMessage,
  AssistantMessage,
  ProgressMessage,
  createUserMessage,
  createAssistantMessage,
  normalizeMessagesForAPI,
  extractToolUseBlocks,
  extractTextContent,
} from './core/messages.js';

// Tools
export { BashTool, GrepTool, getAllTools, getTools } from './tools/index.js';

// LLM
export { querySonnet, formatSystemPromptWithContext } from './llm/router.js';
export { queryCerebras } from './llm/cerebras.js';
export { querySonnet as queryAnthropic } from './llm/anthropic.js';

// Config
export { getConfig, getGlobalConfig, getProjectConfig } from './config/loader.js';
export { Config, ConfigSchema, MCPServerConfig } from './config/schema.js';

// SDK
export { CeregrepClient, QueryOptions, QueryResult } from './sdk/typescript/index.js';

// MCP
export { getMCPTools } from './mcp/client.js';

// Utils
export { PersistentShell } from './utils/shell.js';
export { ripGrep, listAllContentFiles } from './utils/ripgrep.js';
