/**
 * Anthropic LLM Client
 * Simplified from swarm-client/services/claude.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { Tool } from '../core/tool.js';
import { AssistantMessage, UserMessage, NormalizedMessage } from '../core/messages.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const SONNET_COST_PER_MILLION_INPUT_TOKENS = 3;
const SONNET_COST_PER_MILLION_OUTPUT_TOKENS = 15;

/**
 * Format tools for Anthropic API
 */
function formatToolsForAPI(tools: Tool[]): Anthropic.Tool[] {
  return tools.map((tool) => {
    let inputSchema: any = tool.inputSchema || tool.input_schema;

    // Convert Zod schema to JSON schema if needed
    if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
      inputSchema = zodToJsonSchema(inputSchema as z.ZodType);
    }

    // Ensure proper format
    if (!inputSchema) {
      inputSchema = { type: 'object', properties: {} };
    }

    return {
      name: tool.name,
      description: typeof tool.description === 'string' ? tool.description : 'A tool',
      input_schema: inputSchema as Anthropic.Tool.InputSchema,
    };
  });
}

/**
 * Calculate cost from usage
 */
function calculateCost(usage: Anthropic.Usage, model: string): number {
  const costPerMillionInput = model.includes('haiku') ? 0.8 : SONNET_COST_PER_MILLION_INPUT_TOKENS;
  const costPerMillionOutput = model.includes('haiku') ? 4 : SONNET_COST_PER_MILLION_OUTPUT_TOKENS;

  const inputCost = (usage.input_tokens / 1_000_000) * costPerMillionInput;
  const outputCost = (usage.output_tokens / 1_000_000) * costPerMillionOutput;

  return inputCost + outputCost;
}

/**
 * Query Anthropic API (Sonnet model)
 */
export async function querySonnet(
  messages: (UserMessage | AssistantMessage)[],
  systemPrompt: string[],
  maxThinkingTokens: number,
  tools: Tool[],
  abortSignal: AbortSignal,
  options: {
    dangerouslySkipPermissions?: boolean;
    model?: string;
    prependCLISysprompt?: boolean;
    apiKey?: string;
    enableThinking?: boolean;
    ultrathinkMode?: boolean;
  },
): Promise<AssistantMessage> {
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const anthropic = new Anthropic({
    apiKey,
    maxRetries: 3,
  });

  const model = options.model || 'claude-sonnet-4-20250514';

  // Format messages for API
  const apiMessages = messages.map((msg) => ({
    role: msg.message.role,
    content: msg.message.content,
  })) as Anthropic.MessageParam[];

  // Format tools
  const apiTools = formatToolsForAPI(tools);

  const startTime = Date.now();

  try {
    // Build request parameters
    const requestParams: any = {
      model,
      max_tokens: 8192,
      messages: apiMessages,
      system: systemPrompt.join('\n\n'),
      tools: apiTools.length > 0 ? apiTools : undefined,
      temperature: 1,
    };

    // Add thinking mode if enabled
    if (options.enableThinking || options.ultrathinkMode) {
      const thinkingBudgetTokens = maxThinkingTokens || (options.ultrathinkMode ? 20000 : 10000);
      requestParams.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudgetTokens,
      };
    }

    const response = await anthropic.messages.create(requestParams as any);

    const durationMs = Date.now() - startTime;
    const costUSD = calculateCost(response.usage, model);

    return {
      type: 'assistant',
      costUSD,
      durationMs,
      uuid: randomUUID(),
      message: {
        id: response.id,
        model: response.model,
        role: 'assistant',
        content: response.content as any,
        stop_reason: response.stop_reason,
        stop_sequence: response.stop_sequence || '',
        type: 'message',
        usage: response.usage as any,
      } as any,
    };
  } catch (error) {
    console.error('Error querying Anthropic API:', error);
    throw error;
  }
}

/**
 * Format system prompt with context
 */
export function formatSystemPromptWithContext(
  systemPrompt: string[],
  context: { [k: string]: string },
): string[] {
  return systemPrompt.map((line) => {
    let formatted = line;
    for (const [key, value] of Object.entries(context)) {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return formatted;
  });
}
