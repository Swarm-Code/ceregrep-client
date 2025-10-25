/**
 * Core tool interface definitions for Ceregrep Agent Framework
 * Headless version - no UI/React dependencies
 */

import { ZodType } from 'zod';

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
  [key: string]: any;
}

export interface ToolResult {
  tool_use_id: string;
  is_error?: boolean;
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

export interface ValidationResult {
  success: boolean;
  error?: string;
  result?: boolean;
  message?: string;
  meta?: any;
}

export interface ToolContext {
  options: {
    dangerouslySkipPermissions?: boolean;
    commands?: any[];
    forkNumber?: number;
    messageLogName?: string;
    tools?: Tool[];
    verbose?: boolean;
    slowAndCapableModel?: any;
    maxThinkingTokens?: number;
    [key: string]: any;
  };
  abortController: AbortController;
  messageId?: string;
  readFileTimestamps?: { [filename: string]: number };
  verbose?: boolean;
  debug?: boolean;
  tools?: Tool[];
  allowedTools?: string[];
  setAllowedTools?: (tools: string[]) => void;
  currentDirectory?: string;
  autoApprove?: boolean;
  onPrompt?: (prompt: string) => void;
  onRequestPermission?: (toolName: string, input: Record<string, any>) => Promise<boolean>;
  [key: string]: any;
}

/**
 * Tool interface for agent framework
 * Tools define actions the agent can perform (bash, grep, MCP tools, etc.)
 */
export interface Tool {
  name: string;
  description: string | ((options?: any) => string | Promise<string>);

  // Schema definitions (support both formats)
  input_schema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  inputSchema?: ZodType<any> | {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  inputJSONSchema?: any;

  // Core execution methods
  execute?: (input: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
  call?: (input: any, context: any, canUseTool?: any) => AsyncGenerator<any, any, any>;

  // Tool properties
  isReadOnly?: () => boolean;
  validateInput?: (input: any, context?: any) => ValidationResult | Promise<ValidationResult>;
  needsPermissions?: (input?: any) => boolean;
  isEnabled?: (context?: any) => boolean | Promise<boolean>;

  // User-facing name
  userFacingName?: string | (() => string) | ((input: any) => string);

  // Result formatting for LLM
  // Optional second parameter for context (e.g., command, pattern, etc.) for better error messages
  renderResultForAssistant?: (data: any, context?: any) => string | any[];

  // Prompt/description alternatives
  prompt?: string | ((options?: any) => string | Promise<string>);

  // Generic function handler (for compatibility)
  fn?: any;
}

export interface CommandContext extends ToolContext {
  commands: Command[];
}

export interface Command {
  name: string;
  description: string;
  handler: (args: string[], context: CommandContext) => Promise<void> | void;
}

/**
 * Utility type for tool execution function
 */
export type ToolFunction<T = Record<string, any>> = (
  input: T,
  context: ToolContext
) => Promise<ToolResult>;

/**
 * Options for creating a tool
 */
export interface CreateToolOptions<T = Record<string, any>> {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: ToolFunction<T>;
}

/**
 * Helper function to create a tool with type safety
 */
export function createTool<T = Record<string, any>>(
  options: CreateToolOptions<T>
): Tool {
  return {
    name: options.name,
    description: options.description,
    input_schema: options.inputSchema,
    execute: options.execute as any,
  };
}
