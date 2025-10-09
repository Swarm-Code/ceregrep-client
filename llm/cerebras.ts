/**
 * Cerebras LLM Client
 * Uses OpenAI SDK with Cerebras base URL for compatibility
 */

import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { Tool } from '../core/tool.js';
import { AssistantMessage, UserMessage } from '../core/messages.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
const CEREBRAS_COST_PER_MILLION_TOKENS = 2.0; // Both input and output

/**
 * Format tools for OpenAI/Cerebras API
 */
function formatToolsForOpenAI(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
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
      type: 'function' as const,
      function: {
        name: tool.name,
        description: typeof tool.description === 'string' ? tool.description : 'A tool',
        parameters: inputSchema,
      },
    };
  });
}

/**
 * Calculate cost from token usage
 */
function calculateCost(usage: OpenAI.CompletionUsage): number {
  const totalTokens = (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
  return (totalTokens / 1_000_000) * CEREBRAS_COST_PER_MILLION_TOKENS;
}

/**
 * Query Cerebras API using OpenAI SDK
 */
export async function queryCerebras(
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
    baseURL?: string;
    temperature?: number;
    top_p?: number;
  },
): Promise<AssistantMessage> {
  const apiKey = options.apiKey || process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error('CEREBRAS_API_KEY is not set. Please set it in your config or environment.');
  }

  const client = new OpenAI({
    apiKey,
    baseURL: options.baseURL || CEREBRAS_BASE_URL,
  });

  const model = options.model || 'qwen-3-coder-480b';

  // Format messages for OpenAI API
  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // Add system prompt
  if (systemPrompt.length > 0) {
    apiMessages.push({
      role: 'system',
      content: systemPrompt.join('\n\n'),
    });
  }

  // Add conversation messages
  for (const msg of messages) {
    if (msg.message.role === 'user') {
      const content = msg.message.content;
      apiMessages.push({
        role: 'user',
        content: typeof content === 'string' ? content : JSON.stringify(content),
      });
    } else if (msg.message.role === 'assistant') {
      const content = msg.message.content;

      // Check if there are tool calls in the message
      const contentArray = Array.isArray(content) ? content : [];
      const toolCalls = contentArray
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => ({
          id: c.id,
          type: 'function' as const,
          function: {
            name: c.name,
            arguments: JSON.stringify(c.input),
          },
        }));

      // Extract text content
      const textContent = contentArray
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      if (toolCalls.length > 0) {
        apiMessages.push({
          role: 'assistant',
          content: textContent || null,
          tool_calls: toolCalls,
        });
      } else {
        apiMessages.push({
          role: 'assistant',
          content: textContent || 'No response',
        });
      }
    }
  }

  // Format tools
  const apiTools = formatToolsForOpenAI(tools);

  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: apiMessages,
      tools: apiTools.length > 0 ? apiTools : undefined,
      temperature: options.temperature ?? 0.7, // Cerebras recommended
      top_p: options.top_p ?? 0.8, // Cerebras recommended
      max_tokens: 8192,
    });

    const durationMs = Date.now() - startTime;
    const costUSD = response.usage ? calculateCost(response.usage) : 0;

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from Cerebras API');
    }

    // Convert OpenAI format to Anthropic format for consistency
    const content: any[] = [];

    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content,
        citations: [],
      });
    }

    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return {
      type: 'assistant',
      costUSD,
      durationMs,
      uuid: randomUUID(),
      message: {
        id: response.id,
        model: response.model,
        role: 'assistant',
        content,
        stop_reason: choice.finish_reason === 'stop' ? 'end_turn' : (choice.finish_reason as any),
        stop_sequence: '',
        type: 'message',
        usage: {
          input_tokens: response.usage?.prompt_tokens || 0,
          output_tokens: response.usage?.completion_tokens || 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cache_creation: null,
          server_tool_use: null,
          service_tier: null,
        },
      } as any,
    };
  } catch (error) {
    console.error('Error querying Cerebras API:', error);
    throw error;
  }
}
