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

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1 second base delay
const MAX_DELAY_MS = 60000; // 60 seconds max delay

// Progressive timeout configuration (in milliseconds)
const TIMEOUT_MS_BY_ATTEMPT = [
  15000,  // 15 seconds for first attempt
  30000,  // 30 seconds for first retry
  60000,  // 60 seconds for second retry
  120000  // 2 minutes for final retry
];

/**
 * Sleep for a specified duration
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
  // Add jitter (random variation of ±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on connection errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
    return true;
  }

  // Retry on specific HTTP status codes
  const status = error.status || error.response?.status;
  if (status === 408 || status === 409 || status === 429 || (status >= 500 && status < 600)) {
    return true;
  }

  return false;
}

/**
 * Format tools for OpenAI/Cerebras API
 */
function formatToolsForOpenAI(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools
    .filter((tool) => {
      // Validate tool has required fields
      if (!tool.name) {
        console.warn('⚠️  Skipping tool with null/undefined name:', tool);
        return false;
      }
      return true;
    })
    .map((tool) => {
      // Try to get schema from different sources
      let inputSchema: any = tool.inputJSONSchema || tool.inputSchema || tool.input_schema;

      // Convert Zod schema to JSON schema if needed
      if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
        inputSchema = zodToJsonSchema(inputSchema as z.ZodType);
      }

      // Extract actual schema if it's wrapped (zod-to-json-schema adds $schema, definitions, etc.)
      if (inputSchema && inputSchema.$schema) {
        // This is a full JSON Schema document from zod-to-json-schema
        // It might have a $ref pointing to definitions, so we need to resolve it
        if (inputSchema.$ref && inputSchema.definitions) {
          // Extract the referenced definition
          const refPath = inputSchema.$ref.replace('#/definitions/', '');
          if (inputSchema.definitions[refPath]) {
            inputSchema = inputSchema.definitions[refPath];
          }
        } else {
          // Just strip the wrapper fields
          const { $schema, definitions, ...actualSchema } = inputSchema;
          inputSchema = actualSchema;
        }
      }

      // Ensure proper format - must have at least type and properties
      if (!inputSchema || !inputSchema.type || !inputSchema.properties) {
        console.warn(`⚠️  Tool "${tool.name}" has invalid schema, using empty object`);
        inputSchema = {
          type: 'object',
          properties: {},
          required: []
        };
      }

      // Get description (handle both string and function)
      let description = 'A tool';
      if (typeof tool.description === 'string') {
        description = tool.description;
      } else if (typeof tool.description === 'function') {
        // For async functions, we can't await here, so use a default
        // The tool system should provide a sync description or string
        description = `Tool: ${tool.name}`;
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description,
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

  // CRITICAL FIX: OpenAI/Cerebras require strict message ordering:
  // assistant (with tool_calls) → tool → tool → tool → (next assistant)
  // We must collect all tool responses and flush them before adding the next assistant message
  const pendingToolResponses: any[] = [];

  // Helper function to flush pending tool responses
  const flushPendingToolResponses = () => {
    if (pendingToolResponses.length > 0) {
      // Add all pending tool responses to apiMessages
      apiMessages.push(...pendingToolResponses);
      pendingToolResponses.length = 0; // Clear the array
    }
  };

  // Add conversation messages
  for (const msg of messages) {
    if (msg.message.role === 'user') {
      const content = msg.message.content;

      // Check if this user message contains tool results (Anthropic format)
      if (Array.isArray(content)) {
        const toolResults = content.filter((item: any) => item.type === 'tool_result');
        const textContent = content.filter((item: any) => item.type === 'text' || typeof item === 'string');

        // If there are tool results, add them to pendingToolResponses
        if (toolResults.length > 0) {
          for (const toolResult of toolResults) {
            const tr = toolResult as any; // Type assertion for tool_result content

            // CRITICAL: Skip tool results without a valid tool_use_id
            if (!tr.tool_use_id) {
              console.warn('⚠️  Skipping tool result with null/undefined tool_use_id:', tr);
              continue;
            }

            // CRITICAL: Ensure tool content is never null/undefined
            let toolContent: string;
            if (typeof tr.content === 'string' && tr.content.trim()) {
              toolContent = tr.content;
            } else if (tr.content !== null && tr.content !== undefined) {
              const jsonStr = JSON.stringify(tr.content);
              toolContent = (jsonStr && jsonStr !== 'null') ? jsonStr : 'Tool executed successfully';
            } else {
              toolContent = 'Tool executed successfully';
            }

            // Add to pending tool responses (will be flushed before next assistant message)
            pendingToolResponses.push({
              role: 'tool',
              tool_call_id: tr.tool_use_id,
              content: toolContent,
            } as any);
          }

          // If there's also text content, flush tool responses first, then add user message
          if (textContent.length > 0) {
            flushPendingToolResponses();
            const textStr = textContent
              .map((item: any) => typeof item === 'string' ? item : item.text)
              .join('\n');
            if (textStr.trim()) {
              apiMessages.push({
                role: 'user',
                content: textStr,
              });
            }
          }
          continue; // Skip the regular user message handling
        }
      }

      // For regular user messages, flush any pending tool responses first
      flushPendingToolResponses();

      // Handle regular user message content
      let userContent: string;
      if (typeof content === 'string') {
        userContent = content;
      } else if (Array.isArray(content)) {
        // Extract text from structured content
        userContent = content
          .map((item: any) => {
            if (typeof item === 'string') return item;
            if (item.type === 'text') return item.text;
            return JSON.stringify(item);
          })
          .join('\n');
      } else {
        userContent = JSON.stringify(content);
      }

      apiMessages.push({
        role: 'user',
        content: userContent,
      });
    } else if (msg.message.role === 'assistant') {
      // CRITICAL: Flush all pending tool responses before adding assistant message
      // This ensures we never have: assistant → tool → assistant → tool
      // Instead we get: assistant → tool → tool → assistant
      flushPendingToolResponses();

      const content = msg.message.content;

      // Check if there are tool calls in the message
      const contentArray = Array.isArray(content) ? content : [];
      const toolCalls = contentArray
        .filter((c: any) => c.type === 'tool_use')
        .filter((c: any) => {
          // Validate tool call has required fields
          if (!c.id || !c.name) {
            console.warn('⚠️  Skipping tool call with null/undefined id or name:', c);
            return false;
          }
          return true;
        })
        .map((c: any) => ({
          id: c.id,
          type: 'function' as const,
          function: {
            name: c.name,
            arguments: JSON.stringify(c.input || {}), // Default to empty object if input is null
          },
        }));

      // Extract text content
      const textContent = contentArray
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      if (toolCalls.length > 0) {
        // When there are tool calls, follow llxprt approach:
        // Use null for content when there's no text (not omitted, not empty string)
        const trimmedContent = textContent.trim();

        apiMessages.push({
          role: 'assistant',
          content: trimmedContent || null,
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

  // CRITICAL: Flush any remaining tool responses at the end
  flushPendingToolResponses();

  // Format tools
  const apiTools = formatToolsForOpenAI(tools);

  const startTime = Date.now();
  const timestamp = Date.now();

  // Build request params (outside try block so we can log it on error)
  const requestParams: any = {
    model,
    messages: apiMessages,
    temperature: options.temperature ?? 0.7,
    top_p: options.top_p ?? 0.8,
    // Don't set max_tokens - let Cerebras use its default
  };

  // Add tools if there are any
  // CRITICAL: Add tool_choice: 'auto' for Cerebras to prevent tool hallucination errors
  // See: https://github.com/vybestack/llxprt-code (OpenAIProvider.ts:750)
  if (apiTools.length > 0) {
    requestParams.tools = apiTools;
    requestParams.tool_choice = 'auto';
  }

  try {
    // ALWAYS save requests for debugging - we need to see what's failing
    const filename = `/tmp/cerebras-request-${timestamp}-${requestParams.messages.length}msg.json`;
    try {
      await import('fs').then(fs =>
        fs.promises.writeFile(filename, JSON.stringify(requestParams, null, 2))
      );
      console.error(`🔍 [${new Date().toISOString()}] Saved ${requestParams.messages.length}-message request to ${filename}`);
    } catch (e) {
      console.error(`Failed to save request: ${e}`);
    }

    // Debug: Log full request payload to catch null values
    if (process.env.DEBUG_MCP || process.env.DEBUG_CEREBRAS) {
      console.error('\n📤 === CEREBRAS API REQUEST ===');
      console.error('⏰ Timestamp:', new Date().toISOString());
      console.error('🎯 Model:', model);
      console.error('📊 Request Details:');
      console.error('  - Temperature:', requestParams.temperature);
      console.error('  - Top P:', requestParams.top_p);
      console.error('  - Max Tokens:', requestParams.max_tokens);
      console.error('  - Message Count:', requestParams.messages.length);
      console.error('  - Tool Count:', requestParams.tools?.length || 0);

      console.error('\n💬 Messages Being Sent:');
      requestParams.messages.forEach((msg: any, idx: number) => {
        console.error(`\n  Message #${idx + 1}:`);
        console.error(`    Role: ${msg.role}`);

        if (msg.content) {
          const contentPreview = typeof msg.content === 'string'
            ? (msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content)
            : JSON.stringify(msg.content).substring(0, 200);
          console.error(`    Content: ${contentPreview}`);
          console.error(`    Content Length: ${typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length} chars`);
        } else {
          console.error(`    Content: <none>`);
        }

        if (msg.tool_calls) {
          console.error(`    Tool Calls: ${msg.tool_calls.length}`);
          msg.tool_calls.forEach((tc: any, tcIdx: number) => {
            console.error(`      [${tcIdx + 1}] ${tc.function.name} (id: ${tc.id})`);
            console.error(`          Args: ${tc.function.arguments}`);
          });
        }

        if (msg.tool_call_id) {
          console.error(`    Tool Call ID: ${msg.tool_call_id}`);
        }
      });

      if (requestParams.tools && requestParams.tools.length > 0) {
        console.error('\n🛠️  Available Tools:');
        requestParams.tools.forEach((tool: any, idx: number) => {
          console.error(`  [${idx + 1}] ${tool.function.name}`);
          console.error(`      Description: ${tool.function.description}`);
        });
      }

      console.error('\n📋 Full Request JSON:');
      console.error(JSON.stringify(requestParams, null, 2));
      console.error('\n=== END REQUEST ===\n');
    }

    // Validate no null values in critical fields
    for (const msg of apiMessages) {
      if (msg.role === 'assistant' && 'tool_calls' in msg && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          if (!tc.id || !tc.function?.name || tc.function?.arguments === null || tc.function?.arguments === undefined) {
            throw new Error(`Invalid tool call detected: id=${tc.id}, name=${tc.function?.name}, args=${tc.function?.arguments}`);
          }
        }
      }
    }

    // Execute API call with retry logic and progressive timeouts
    let lastError: any;
    let response: OpenAI.Chat.ChatCompletion | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create client with progressive timeout for this attempt
        const timeoutForAttempt = TIMEOUT_MS_BY_ATTEMPT[attempt] || TIMEOUT_MS_BY_ATTEMPT[TIMEOUT_MS_BY_ATTEMPT.length - 1];
        const client = new OpenAI({
          apiKey,
          baseURL: options.baseURL || CEREBRAS_BASE_URL,
          timeout: timeoutForAttempt,
          maxRetries: 0, // We handle retries manually
        });

        response = await client.chat.completions.create(requestParams);
        break; // Success! Exit retry loop
      } catch (error: any) {
        lastError = error;

        // Check if we should retry
        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          const delay = calculateBackoffDelay(attempt);
          const errorType = error.constructor?.name || 'Error';
          const status = error.status || error.response?.status || 'N/A';
          const nextTimeout = TIMEOUT_MS_BY_ATTEMPT[attempt + 1] || TIMEOUT_MS_BY_ATTEMPT[TIMEOUT_MS_BY_ATTEMPT.length - 1];

          console.error(`\n⚠️  Cerebras API Error (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
          console.error(`   Error Type: ${errorType}`);
          console.error(`   Status: ${status}`);
          console.error(`   Message: ${error.message}`);
          console.error(`   Retrying in ${(delay / 1000).toFixed(1)}s with ${(nextTimeout / 1000)}s timeout...\n`);

          await sleep(delay);
          continue;
        }

        // Not retryable or max retries exceeded
        throw error;
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to get response from Cerebras API');
    }

    // ALWAYS save successful responses
    try {
      const responseFilename = `/tmp/cerebras-response-${timestamp}-${requestParams.messages.length}msg.json`;
      await import('fs').then(fs =>
        fs.promises.writeFile(responseFilename, JSON.stringify(response, null, 2))
      );
      console.error(`✅ [${new Date().toISOString()}] Saved response to ${responseFilename}`);
    } catch (e) {
      console.error(`Failed to save response: ${e}`);
    }

    const durationMs = Date.now() - startTime;
    const costUSD = response.usage ? calculateCost(response.usage) : 0;

    // Debug: Log response details
    if (process.env.DEBUG_MCP || process.env.DEBUG_CEREBRAS) {
      console.error('\n📥 === CEREBRAS API RESPONSE ===');
      console.error('⏰ Timestamp:', new Date().toISOString());
      console.error('⏱️  Duration:', durationMs, 'ms');
      console.error('💰 Cost: $', costUSD.toFixed(6));
      console.error('📊 Response Details:');
      console.error('  - ID:', response.id);
      console.error('  - Model:', response.model);
      console.error('  - Finish Reason:', response.choices[0]?.finish_reason);
      console.error('  - Token Usage:');
      console.error('      Prompt:', response.usage?.prompt_tokens || 0);
      console.error('      Completion:', response.usage?.completion_tokens || 0);
      console.error('      Total:', (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0));

      const choice = response.choices[0];
      if (choice) {
        console.error('\n💬 Response Content:');
        if (choice.message.content) {
          const contentPreview = choice.message.content.length > 300
            ? choice.message.content.substring(0, 300) + '...'
            : choice.message.content;
          console.error('  Text:', contentPreview);
          console.error('  Length:', choice.message.content.length, 'chars');
        } else {
          console.error('  Text: <none>');
        }

        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          console.error('\n🛠️  Tool Calls in Response:', choice.message.tool_calls.length);
          choice.message.tool_calls.forEach((tc, idx) => {
            console.error(`  [${idx + 1}] ${tc.function.name} (id: ${tc.id})`);
            console.error(`      Args: ${tc.function.arguments}`);
          });
        }
      }

      console.error('\n📋 Full Response JSON:');
      console.error(JSON.stringify(response, null, 2));
      console.error('\n=== END RESPONSE ===\n');
    }

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
  } catch (error: any) {
    const errorType = error.constructor?.name || 'Error';
    const status = error.status || error.response?.status;

    // ALWAYS save failed requests for debugging
    try {
      const errorFilename = `/tmp/cerebras-error-${timestamp}-${apiMessages.length}msg.json`;
      await import('fs').then(fs =>
        fs.promises.writeFile(errorFilename, JSON.stringify({
          error: {
            type: errorType,
            message: error.message,
            status,
            stack: error.stack,
            response: error.response,
          },
          request: requestParams,
        }, null, 2))
      );
      console.error(`❌ [${new Date().toISOString()}] Saved error and request to ${errorFilename}`);
    } catch (e) {
      console.error(`Failed to save error: ${e}`);
    }

    console.error('\n❌ === CEREBRAS API ERROR ===');
    console.error('Error type:', errorType);
    console.error('Error message:', error.message);
    console.error('Status code:', status || 'N/A');

    // Provide helpful error messages based on error type
    if (status === 400) {
      console.error('\n💡 BadRequestError (400): The request was malformed.');
      console.error('   Possible causes:');
      console.error('   - Invalid model name');
      console.error('   - Malformed message content');
      console.error('   - Invalid tool schema');
      console.error('   - Request exceeds size limits');
    } else if (status === 401) {
      console.error('\n💡 AuthenticationError (401): Invalid API key.');
      console.error('   Please check your CEREBRAS_API_KEY.');
    } else if (status === 403) {
      console.error('\n💡 PermissionDeniedError (403): Access forbidden.');
      console.error('   Your API key may not have access to this model or feature.');
    } else if (status === 404) {
      console.error('\n💡 NotFoundError (404): Resource not found.');
      console.error('   The model or endpoint may not exist.');
    } else if (status === 429) {
      console.error('\n💡 RateLimitError (429): Rate limit exceeded.');
      console.error('   Please wait before retrying. (Already retried 3 times)');
    } else if (status >= 500) {
      console.error('\n💡 InternalServerError (5xx): Cerebras API is experiencing issues.');
      console.error('   Please try again later. (Already retried 3 times)');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      console.error('\n💡 ConnectionError: Unable to reach Cerebras API.');
      console.error('   Check your internet connection. (Already retried 3 times)');
    }

    // Try to get the actual API error response
    if (error.response) {
      console.error('\n📡 API Response:');
      console.error('  Status:', error.response.status);
      console.error('  Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }

    // Try to extract error from the error object itself
    if (error.error) {
      console.error('\n🔍 Error details:', JSON.stringify(error.error, null, 2));
    }

    // Try reading the body if it's available
    try {
      const errorBody = await error.response?.text?.();
      if (errorBody) {
        console.error('\n📄 Response body:', errorBody);
      }
    } catch (e) {
      // Ignore if we can't read the body
    }

    console.error('\n📊 Request summary:');
    console.error('  Model:', model);
    console.error('  Messages:', apiMessages.length);
    console.error('  Tools:', apiTools.length);
    console.error('  Temperature:', options.temperature ?? 0.7);
    console.error('  Top P:', options.top_p ?? 0.8);
    console.error('  Timeouts:', TIMEOUT_MS_BY_ATTEMPT.map(t => `${t/1000}s`).join(' → '));

    // Log detailed formatted messages and tools for debugging malformed requests
    if (process.env.DEBUG_MCP || process.env.DEBUG_CEREBRAS) {
      console.error('\n=== FULL REQUEST DEBUG ===');
      console.error('API messages:', JSON.stringify(apiMessages, null, 2));
      console.error('\nAPI tools:', JSON.stringify(apiTools, null, 2));
      console.error('=== END DEBUG ===\n');
    }

    throw error;
  }
}
