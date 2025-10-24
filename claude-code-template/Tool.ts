// Tool.ts - Core tool interface definitions for Claude Code Integration

import { ReactElement } from 'react';
import { ZodType } from 'zod';

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, any>;
  // Add specific properties that tools expect
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

export interface Tool {
  name: string;
  description: string | ((options?: any) => string | Promise<string>);
  input_schema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute?: (input: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
  render?: (toolUse: ToolUse, context: ToolContext) => ReactElement | null;

  // Additional properties for compatibility
  prompt?: string | ((options?: any) => string | Promise<string>);
  inputSchema?: ZodType<any> | {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  // Additional tool properties found in usage
  isReadOnly?: () => boolean;
  validateInput?: (input: any, context?: any) => ValidationResult | Promise<ValidationResult>;
  needsPermissions?: (input?: any) => boolean;
  isEnabled?: (context?: any) => boolean | Promise<boolean>;
  call?: (input: any, context: any, canUseTool?: any) => AsyncGenerator<any, any, any>;
  inputJSONSchema?: any;
  fn?: any;
  userFacingName?: string | (() => string) | ((input: any) => string);
  renderToolUseMessage?: (input: any, context?: any) => string | ReactElement;
  renderToolUseRejectedMessage?: (input: any, options?: any) => ReactElement;
  renderToolResultMessage?: (content: any, options: any) => ReactElement;
  renderResultForAssistant?: (data: any) => string | any[];
}

// Add missing ValidationResult type
export interface ValidationResult {
  success: boolean;
  error?: string;
  // Alternative properties for compatibility
  result?: boolean;
  message?: string;
  meta?: any;
}

export interface ToolContext {
  // Nested options structure used by permissions system
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
  // Required properties used throughout the codebase
  abortController: AbortController;
  messageId?: string;
  readFileTimestamps?: { [filename: string]: number };
  // Additional properties that may be needed
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

export type SetToolJSXFn = (jsx: { jsx: React.ReactNode | null; shouldHidePromptInput: boolean } | null) => void;

export interface CommandContext extends ToolContext {
  commands: Command[];
}

export interface Command {
  name: string;
  description: string;
  handler: (args: string[], context: CommandContext) => Promise<void> | void;
}

// Utility types for tool creation
export type ToolFunction<T = Record<string, any>> = (
  input: T,
  context: ToolContext
) => Promise<ToolResult>;

export type ToolRenderer<T = Record<string, any>> = (
  toolUse: ToolUse & { input: T },
  context: ToolContext
) => ReactElement | null;

export interface CreateToolOptions<T = Record<string, any>> {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: ToolFunction<T>;
  render?: ToolRenderer<T>;
}

export function createTool<T = Record<string, any>>(
  options: CreateToolOptions<T>
): Tool {
  return {
    name: options.name,
    description: options.description,
    input_schema: options.inputSchema,
    execute: options.execute,
    render: options.render
  };
}