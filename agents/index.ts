/**
 * Agent System - Main Exports
 * Multi-agent support for ceregrep with customizable system prompts, tools, and MCP servers
 */

// Schema
export {
  AgentConfig,
  AgentMCPServerConfig,
  SystemPromptMode,
  ValidationResult,
  ValidationError,
  AgentConfigSchema,
  validateAgentConfig,
  formatValidationErrors,
  createAgentConfig,
  updateAgentConfig,
} from './schema.js';

// Manager
export {
  AgentScope,
  AgentWithScope,
  getGlobalAgentsDir,
  getProjectAgentsDir,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  listAgents,
  isAgentIdAvailable,
  exportAgent,
  importAgent,
} from './manager.js';

// Initialization
export {
  initializeDefaultAgents,
  hasDefaultAgents,
  getDefaultAgentIds,
} from './init.js';

// Config Merger
export { mergeAgentConfig, createAgentClientConfig, MergedAgentConfig } from './config-merger.js';

// Tool Wrapper
export {
  getAgentTools,
  isAgentTool,
  getAgentIdFromToolName,
} from './tool-wrapper.js';
