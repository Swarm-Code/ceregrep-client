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
  // Check for API key or OAuth token
  const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Anthropic authentication not configured.\n' +
      'Please either:\n' +
      '  1. Authenticate with OAuth: Run /model and select a Claude model\n' +
      '  2. Set ANTHROPIC_API_KEY environment variable\n' +
      '  3. Configure apiKey in your .swarmrc/providers/anthropic.json'
    );
  }

  // Detect OAuth token (starts with 'sk-ant-oat') and create appropriate client
  const isOAuthToken = apiKey.startsWith('sk-ant-oat');

  const anthropic = isOAuthToken
    ? new Anthropic({
        authToken: apiKey, // Use authToken for OAuth Bearer tokens
        maxRetries: 3,
        defaultHeaders: {
          'anthropic-beta': 'oauth-2025-04-20', // Required beta header for OAuth
        },
      } as any)
    : new Anthropic({
        apiKey, // Use apiKey for regular API keys
        maxRetries: 3,
      });

  const model = options.model || 'claude-sonnet-4-20250514';

  // Format messages for API
  const apiMessages = messages.map((msg) => ({
    role: msg.message.role,
    content: msg.message.content,
  })) as Anthropic.MessageParam[];

  // Debug: Log image content in tool_result messages
  if (process.env.DEBUG_IMAGES) {
    apiMessages.forEach((msg, idx) => {
      if (Array.isArray(msg.content)) {
        const toolResults = msg.content.filter((block: any) => block.type === 'tool_result');
        toolResults.forEach((tr: any) => {
          if (Array.isArray(tr.content)) {
            const images = tr.content.filter((c: any) => c.type === 'image');
            if (images.length > 0) {
              console.log(`[DEBUG_IMAGES] Message ${idx} has ${images.length} image(s) in tool_result`);
              images.forEach((img: any, imgIdx: number) => {
                console.log(`[DEBUG_IMAGES]   Image ${imgIdx}: type=${img.source?.type}, media_type=${img.source?.media_type}, data_length=${img.source?.data?.length}`);
              });
            }
          }
        });
      }
    });
  }

  // Validate that all messages have valid content
  // The Anthropic API requires non-empty content
  for (let i = 0; i < apiMessages.length; i++) {
    const msg = apiMessages[i];
    const content = msg.content;

    if (!content ||
        (Array.isArray(content) && content.length === 0) ||
        (typeof content === 'string' && content.trim().length === 0)) {
      throw new Error(
        `Invalid message at index ${i}: content is required and must be non-empty. ` +
        `Role: ${msg.role}, Content: ${JSON.stringify(content)}`
      );
    }
  }

  // Format tools
  const apiTools = formatToolsForAPI(tools);

  const startTime = Date.now();

  try {
    // Debug: Log the last few messages if debugging images
    if (process.env.DEBUG_IMAGES) {
      console.log(`[DEBUG_IMAGES] Sending ${apiMessages.length} messages to Anthropic API`);
      const lastMessages = apiMessages.slice(-3);
      lastMessages.forEach((msg, idx) => {
        console.log(`[DEBUG_IMAGES] Message ${apiMessages.length - 3 + idx} (${msg.role}):`);
        if (Array.isArray(msg.content)) {
          msg.content.forEach((block: any, blockIdx: number) => {
            if (block.type === 'tool_result') {
              console.log(`[DEBUG_IMAGES]   Block ${blockIdx}: tool_result, content is array: ${Array.isArray(block.content)}`);
              if (Array.isArray(block.content)) {
                block.content.forEach((c: any, cidx: number) => {
                  console.log(`[DEBUG_IMAGES]     Content ${cidx}: type=${c.type}`);
                });
              }
            } else {
              console.log(`[DEBUG_IMAGES]   Block ${blockIdx}: ${block.type}`);
            }
          });
        } else {
          console.log(`[DEBUG_IMAGES]   String content (length: ${msg.content?.length || 0})`);
        }
      });
    }

    // Build request parameters
    const requestParams: any = {
      model,
      max_tokens: 8192,
      messages: apiMessages,
      // CRITICAL: OAuth tokens require Claude Code system prompt for authentication
      system: isOAuthToken
        ? "You are Claude Code, Anthropic's official CLI for Claude."
        : systemPrompt.join('\n\n'),
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
