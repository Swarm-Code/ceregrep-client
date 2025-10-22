/**
 * Configuration schema for Ceregrep Client
 * Validates .ceregrep.json or .swarmrc files
 */

import { z } from 'zod';

export const MCPServerConfigSchema = z.union([
  z.object({
    type: z.literal('stdio'),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    disabled: z.boolean().optional(),
    disabledTools: z.array(z.string()).optional(),
  }).transform(obj => ({
    ...obj,
    disabled: obj.disabled ?? false,
    disabledTools: obj.disabledTools ?? [],
  })),
  z.object({
    type: z.literal('sse'),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    disabled: z.boolean().optional(),
    disabledTools: z.array(z.string()).optional(),
  }).transform(obj => ({
    ...obj,
    disabled: obj.disabled ?? false,
    disabledTools: obj.disabledTools ?? [],
  })),
]);

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// Hook configuration schema
export const HookConfigSchema = z.object({
  matcher: z.string(), // Tool name pattern (e.g., "Bash", "Edit|Write", "*" for all)
  hooks: z.array(
    z.object({
      type: z.literal('command'),
      command: z.string(), // Shell command to execute
    })
  ),
});

export type HookConfig = z.infer<typeof HookConfigSchema>;

export const HooksSchema = z.object({
  PreToolUse: z.array(HookConfigSchema).optional(),
  PostToolUse: z.array(HookConfigSchema).optional(),
}).optional();

export type Hooks = z.infer<typeof HooksSchema>;

export const ConfigSchema = z.object({
  // Model configuration
  model: z.string().optional().default('claude-sonnet-4-20250514'),
  slowAndCapableModel: z.string().optional(),

  // Provider configuration (for alternative LLM providers)
  provider: z
    .object({
      type: z.enum(['anthropic', 'cerebras', 'openai', 'openrouter', 'r1', 'google']),
      apiKey: z.string().optional(),
      baseURL: z.string().url().optional(),
      // Cerebras-specific settings
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
    })
    .optional(),

  // Anthropic API key (for backward compatibility)
  apiKey: z.string().optional(),

  // MCP servers
  mcpServers: z.record(MCPServerConfigSchema).optional(),

  // Hooks configuration
  hooks: HooksSchema,

  // Thinking mode settings (extended thinking)
  enableThinking: z.boolean().optional().default(false),
  ultrathinkMode: z.boolean().optional().default(false),

  // Other settings
  maxThinkingTokens: z.number().optional().default(0),
  verbose: z.boolean().optional().default(false),
  debug: z.boolean().optional().default(false),

  // Context compaction settings
  compactionThreshold: z.number().optional().default(100000), // 100k tokens (75% of 131k context)
  compactionKeepRecentCount: z.number().optional().default(10), // Keep last 10 messages
});

export type Config = z.infer<typeof ConfigSchema>;
