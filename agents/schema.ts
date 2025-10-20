/**
 * Agent Configuration Schema
 * Defines the structure and validation for ceregrep agents
 */

import { z } from 'zod';

/**
 * System prompt mode determines how the agent's prompt is combined with base config
 */
export const SystemPromptModeSchema = z.enum(['replace', 'append']);

/**
 * MCP Server configuration for an agent
 */
export const AgentMCPServerConfigSchema = z.object({
  enabled: z.boolean().default(true),
  disabledTools: z.array(z.string()).default([]),
});

/**
 * Main Agent Configuration Schema
 */
export const AgentConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Agent ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(1),
  description: z.string().min(1),
  systemPrompt: z.string().min(1),
  systemPromptMode: SystemPromptModeSchema.default('replace'),
  tools: z.record(z.string(), z.boolean()).default({}),
  mcpServers: z.record(z.string(), AgentMCPServerConfigSchema).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * TypeScript types derived from schemas
 */
export type SystemPromptMode = z.infer<typeof SystemPromptModeSchema>;
export type AgentMCPServerConfig = z.infer<typeof AgentMCPServerConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

/**
 * Validation result interface
 */
export interface ValidationResult {
  success: boolean;
  data?: AgentConfig;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(data: unknown): ValidationResult {
  const result = AgentConfigSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
    code: issue.code,
  }));

  return {
    success: false,
    errors,
  };
}

/**
 * Format validation errors into human-readable message
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'Unknown validation error';

  const messages = errors.map((error) => {
    const pathStr = error.path.length > 0 ? `at ${error.path.join('.')}: ` : '';
    return `${pathStr}${error.message}`;
  });

  if (messages.length === 1 && messages[0]) {
    return messages[0];
  }

  return `Multiple validation errors:\n${messages.map((msg) => `  - ${msg}`).join('\n')}`;
}

/**
 * Create a new agent config with defaults
 */
export function createAgentConfig(
  partial: Omit<AgentConfig, 'createdAt' | 'updatedAt'>
): AgentConfig {
  const now = new Date().toISOString();
  return {
    ...partial,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update agent config with new timestamp
 */
export function updateAgentConfig(
  config: AgentConfig,
  updates: Partial<Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>>
): AgentConfig {
  return {
    ...config,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}
