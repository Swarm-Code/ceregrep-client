/**
 * Cerebras LLM Client
 * Uses OpenAI SDK with Cerebras base URL for compatibility
 */

import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { Tool } from '../core/tool.js';
import { AssistantMessage, UserMessage } from '../core/messages.js';
import { countTokens } from '../core/tokens.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
const CEREBRAS_COST_PER_MILLION_TOKENS = 2.0; // Both input and output

// Retry configuration
const MAX_RETRIES = 2; // 1-2 retries max as requested
const BASE_DELAY_MS = 1000; // 1 second base delay
const MAX_DELAY_MS = 60000; // 60 seconds max delay

// Progressive timeout configuration (in milliseconds)
const TIMEOUT_MS_BY_ATTEMPT = [
  15000,  // 15 seconds for first attempt
  30000,  // 30 seconds for first retry
  60000,  // 60 seconds for second retry
  120000  // 2 minutes for final retry
];

// Rate limiting - add delay between requests to prevent overwhelming Cerebras API
const REQUEST_DELAY_MS = 200; // 200ms delay between requests
let lastRequestTime = 0;

/**
 * Sleep for a specified duration
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * COMPREHENSIVE DATA CLEANER FOR CEREBRAS
 * Handles all malformed data issues from Cerebras/Qwen:
 * - Double-escaped JSON arrays
 * - Python dict formats
 * - Fragmented messages
 * - Unicode issues
 * - Null/undefined values
 * - Unescaped quotes in natural text
 */
function cleanDataForCerebras(data: any): any {
  // Handle null/undefined
  if (data === null || data === undefined) {
    return '';
  }

  // If it's a string, clean it thoroughly
  if (typeof data === 'string') {
    let cleaned = data;

    // 0. CRITICAL FIX: First normalize smart quotes and problematic characters
    // This prevents issues with curly quotes, apostrophes, etc.
    cleaned = cleaned
      .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes → standard "
      .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes → standard '
      .replace(/[\u2032\u2033]/g, "'")  // Prime symbols → standard '
      .replace(/\u2026/g, '...')        // Ellipsis → three dots
      .replace(/[\u2013\u2014]/g, '-'); // En/em dashes → hyphen

    // 1. Handle double-escaped JSON
    // Check if it looks like double-escaped JSON
    if (cleaned.includes('\\\\') || cleaned.includes('\\"')) {
      try {
        // Try to parse as JSON multiple times to handle double/triple escaping
        let parsed = cleaned;
        let attempts = 0;
        while (attempts < 3 && (parsed.includes('\\\\') || parsed.includes('\\"'))) {
          try {
            parsed = JSON.parse(`"${parsed}"`); // Parse as escaped string
          } catch {
            break;
          }
          attempts++;
        }
        if (parsed !== cleaned) {
          cleaned = parsed;
        }
      } catch {
        // If parsing fails, manually unescape
        cleaned = cleaned
          .replace(/\\\\/g, '\\')
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t');
      }
    }

    // 2. Handle Python dict format
    // Look for Python-style dict indicators
    if (cleaned.includes("'") && (cleaned.includes(': ') || cleaned.includes("={'") || cleaned.includes("': '"))) {
      // Try to convert Python dict to JSON
      // Replace single quotes with double quotes, but be careful with apostrophes in text
      const pythonDictPattern = /(\{[^}]*\}|\[[^\]]*\])/g;
      cleaned = cleaned.replace(pythonDictPattern, (match) => {
        // Only process if it looks like a dict/list
        if ((match.includes("'") && match.includes(':')) || (match.startsWith('[') && match.includes("'"))) {
          return match
            .replace(/'/g, '"') // Replace single quotes
            .replace(/True/g, 'true')  // Python True -> JSON true
            .replace(/False/g, 'false') // Python False -> JSON false
            .replace(/None/g, 'null');  // Python None -> JSON null
        }
        return match;
      });
    }

    // 3. Clean Unicode and special characters
    cleaned = cleaned
      // Remove broken Unicode characters (surrogate pairs)
      .replace(/[\uD800-\uDFFF]/g, '') // Remove lone surrogates
      .replace(/[^\x00-\x7F\u0080-\uFFFF]/g, '') // Remove invalid chars
      .replace(/\uFFFD/g, '') // Remove replacement character
      // Replace box drawing characters with simple alternatives
      .replace(/[\u2500-\u257F]/g, '-') // Box drawing chars
      .replace(/[╔╗╚╝║═╠╣╬]/g, '-') // Extended box chars
      // Remove other problematic characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control characters (except \t, \n, \r)

    // 4. Handle fragmented content
    // If content looks fragmented (e.g., incomplete JSON), try to clean it up
    if (cleaned.startsWith('{') && !cleaned.endsWith('}')) {
      // Incomplete JSON object
      cleaned = cleaned + '}';
    } else if (cleaned.startsWith('[') && !cleaned.endsWith(']')) {
      // Incomplete JSON array
      cleaned = cleaned + ']';
    }

    // 5. Final validation - if it's supposed to be JSON, validate it
    if ((cleaned.startsWith('{') && cleaned.endsWith('}')) ||
        (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
      try {
        const parsed = JSON.parse(cleaned);
        // If it parses successfully, re-stringify to ensure consistency
        cleaned = JSON.stringify(parsed);
      } catch {
        // If it doesn't parse, it's probably just text that happens to start/end with brackets
      }
    }

    return cleaned;
  }

  // If it's an object or array, recursively clean all values
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => cleanDataForCerebras(item));
    } else {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Clean the key too (in case it has issues)
        const cleanKey = typeof key === 'string' ? cleanDataForCerebras(key) : key;
        cleaned[cleanKey] = cleanDataForCerebras(value);
      }
      return cleaned;
    }
  }

  // For other types (numbers, booleans), return as-is
  return data;
}

/**
 * Sanitize string content to ensure it's safe for JSON serialization
 * This is a critical fix for the 400 error issue with malformed quotes
 */
function sanitizeForJSON(str: string): string {
  if (typeof str !== 'string') return str;

  // CRITICAL: The main issue is unescaped quotes in natural text
  // We need to ensure all special JSON characters are properly escaped

  // First, normalize the string by unescaping any existing escapes to avoid double-escaping
  let normalized = str;

  // Then properly escape for JSON
  // We use JSON.stringify and then remove the wrapping quotes to get properly escaped content
  try {
    // JSON.stringify will properly escape all special characters
    const jsonSafe = JSON.stringify(normalized);
    // Remove the wrapping quotes that JSON.stringify adds
    return jsonSafe.slice(1, -1);
  } catch (error) {
    // Fallback: manual escaping if JSON.stringify fails
    return normalized
      .replace(/\\/g, '\\\\')   // Backslash must be first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t')    // Escape tabs
      .replace(/\f/g, '\\f')    // Escape form feeds
      .replace(/\b/g, '\\b');   // Escape backspaces
  }
}

/**
 * Validate and prepare a message for Cerebras API
 * CRITICAL: This is for OUTGOING messages TO Cerebras, NOT for cleaning responses FROM Cerebras
 */
function cleanMessageForCerebras(message: any): any {
  // Create a deep copy to avoid mutation
  const cleaned = JSON.parse(JSON.stringify(message));

  // CRITICAL: For outgoing messages, we should NOT aggressively clean content
  // The content is already properly formatted from our side
  // We only need to ensure it's not null/undefined

  // Ensure content is never empty for assistant messages with tool calls
  if (cleaned.role === 'assistant' && cleaned.tool_calls && (!cleaned.content || cleaned.content === '')) {
    cleaned.content = ' '; // Use space to avoid empty string issues
  }

  // Ensure user/system messages have content
  if ((cleaned.role === 'user' || cleaned.role === 'system') && !cleaned.content) {
    cleaned.content = '';
  }

  // Clean tool calls if present
  if (cleaned.tool_calls) {
    cleaned.tool_calls = cleaned.tool_calls.map((tc: any) => {
      const cleanedTc = { ...tc };
      if (cleanedTc.function?.arguments) {
        // CRITICAL FIX: DO NOT over-process tool arguments
        // They should already be a valid JSON string from the conversion above

        // If it's not a string, stringify it
        if (typeof cleanedTc.function.arguments !== 'string') {
          cleanedTc.function.arguments = JSON.stringify(cleanedTc.function.arguments);
        } else {
          // CRITICAL: Just validate it's valid JSON, but DON'T clean/re-process it
          // This prevents over-escaping
          try {
            JSON.parse(cleanedTc.function.arguments);
            // It's valid - leave it as-is
          } catch (error) {
            // Only if it's invalid, try to fix by parsing and re-stringifying ONCE
            console.error(`⚠️  Invalid JSON in tool arguments for ${cleanedTc.function?.name}, attempting single fix...`);
            try {
              // Parse and re-stringify ONCE - no cleaning
              const parsed = JSON.parse(cleanedTc.function.arguments);
              cleanedTc.function.arguments = JSON.stringify(parsed);
            } catch {
              // If still fails, it's truly malformed - log and keep as-is
              console.error(`❌ Cannot fix tool arguments for ${cleanedTc.function?.name}:`, cleanedTc.function.arguments);
            }
          }
        }
      }
      return cleanedTc;
    });
  }

  // For tool messages, ensure content is not empty
  // Tool responses might contain raw output that needs basic sanitization
  if (cleaned.role === 'tool') {
    // Ensure tool responses are never empty
    if (!cleaned.content || cleaned.content === '') {
      cleaned.content = 'Tool executed successfully';
    }
    // Tool content is already a string from tool execution - leave it as-is
    // JSON.stringify will handle any special characters during serialization
  }

  return cleaned;
}

/**
 * Validate that request parameters can be safely serialized to JSON
 * This prevents 400 errors from malformed JSON
 */
function validateRequestJSON(requestParams: any): { valid: true } | { valid: false; error: string; location: string } {
  try {
    // Try to stringify the entire request
    const serialized = JSON.stringify(requestParams);

    // Try to parse it back to ensure it's valid
    JSON.parse(serialized);

    // Validate individual messages
    if (requestParams.messages) {
      for (let i = 0; i < requestParams.messages.length; i++) {
        const msg = requestParams.messages[i];

        // Check content field
        if (msg.content !== undefined && msg.content !== null) {
          try {
            // Ensure content can be serialized
            JSON.stringify(msg.content);
          } catch (error) {
            return {
              valid: false,
              error: `Message #${i + 1} content cannot be serialized: ${error}`,
              location: `messages[${i}].content`
            };
          }
        }

        // Check tool_calls if present
        if (msg.tool_calls) {
          for (let j = 0; j < msg.tool_calls.length; j++) {
            const tc = msg.tool_calls[j];
            if (tc.function?.arguments) {
              try {
                // Arguments should be a valid JSON string
                if (typeof tc.function.arguments === 'string') {
                  JSON.parse(tc.function.arguments);
                } else {
                  return {
                    valid: false,
                    error: `Tool call arguments must be a string, got ${typeof tc.function.arguments}`,
                    location: `messages[${i}].tool_calls[${j}].function.arguments`
                  };
                }
              } catch (error) {
                return {
                  valid: false,
                  error: `Invalid JSON in tool call arguments: ${error}`,
                  location: `messages[${i}].tool_calls[${j}].function.arguments`
                };
              }
            }
          }
        }
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Request cannot be serialized to JSON: ${error}`,
      location: 'requestParams'
    };
  }
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
  // Retry on timeout errors (OpenAI SDK throws APIConnectionTimeoutError)
  if (error.constructor?.name === 'APIConnectionTimeoutError' || error.message?.includes('timed out')) {
    return true;
  }

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
        };
      }

      // CRITICAL FIX: Remove fields that Cerebras might not support
      // Cerebras/OpenAI may reject schemas with certain JSON Schema keywords
      const cleanedSchema: any = {
        type: inputSchema.type,
        properties: {}, // Will populate below
      };

      // Clean each property recursively to remove unsupported fields
      if (inputSchema.properties) {
        for (const [propName, propSchema] of Object.entries(inputSchema.properties)) {
          const prop = propSchema as any;
          const cleanedProp: any = {
            type: prop.type,
          };

          // Add description if present
          if (prop.description) {
            cleanedProp.description = prop.description;
          }

          // Add enum if present
          if (prop.enum) {
            cleanedProp.enum = prop.enum;
          }

          // Add items for arrays
          if (prop.items) {
            cleanedProp.items = prop.items;
          }

          // Add properties for nested objects
          if (prop.properties) {
            cleanedProp.properties = prop.properties;
          }

          cleanedSchema.properties[propName] = cleanedProp;
        }
      }

      // Only add required if it exists and is non-empty
      if (inputSchema.required && inputSchema.required.length > 0) {
        cleanedSchema.required = inputSchema.required;
      }

      // CRITICAL: additionalProperties, $schema, definitions removed
      // These might cause Cerebras to reject the request

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
          parameters: cleanedSchema,
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
  // Rate limiting: ensure minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    const delayNeeded = REQUEST_DELAY_MS - timeSinceLastRequest;
    await sleep(delayNeeded);
  }
  lastRequestTime = Date.now();

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

            // CRITICAL FIX: Tool content is already clean - don't over-process it
            // Tool responses come from our own tools, not from Cerebras
            let toolContent = tr.content || '';
            if (typeof toolContent !== 'string') {
              toolContent = JSON.stringify(toolContent);
            }
            if (!toolContent || toolContent === '') {
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
              // CRITICAL FIX: Don't clean user content - it's already properly formatted
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

      // CRITICAL FIX: Don't clean user content - it's already properly formatted
      // JSON.stringify will handle any special characters during final serialization
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
        .map((c: any) => {
          // CRITICAL FIX: DO NOT clean tool input - it's already a proper object
          // Just stringify it directly to avoid over-escaping
          const toolInput = c.input || {};
          return {
            id: c.id,
            type: 'function' as const,
            function: {
              name: c.name,
              arguments: JSON.stringify(toolInput), // Direct stringify - NO cleaning
            },
          };
        });

      // Extract text content
      const textContent = contentArray
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      if (toolCalls.length > 0) {
        // When there are tool calls:
        // CRITICAL: OpenAI/Cerebras API requires content when tool_calls present
        // CRITICAL FIX: Don't clean assistant content - it's already properly formatted
        const trimmedTextContent = textContent.trim();

        const msgContent: any = {
          role: 'assistant',
          tool_calls: toolCalls,
        };

        // Only include content if it's not empty
        if (trimmedTextContent) {
          msgContent.content = trimmedTextContent;
        } else {
          // Don't omit content field - set to space to avoid API issues
          msgContent.content = ' ';
        }

        apiMessages.push(msgContent);
      } else {
        // CRITICAL FIX: Don't clean assistant content - it's already properly formatted
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

  // COMPREHENSIVE FINAL CLEANING: Clean all messages before sending to Cerebras
  // This ensures we never send malformed data regardless of what Cerebras sent us
  let cleanedApiMessages = apiMessages.map(msg => cleanMessageForCerebras(msg));

  const startTime = Date.now();
  const timestamp = Date.now();

  // Build request params (outside try block so we can log it on error)
  // CRITICAL: Following llxprt-code pattern for Cerebras/Qwen compatibility
  // Reference: https://github.com/vybestack/llxprt-code OpenAIProvider.ts:742-755
  let requestParams: any = {
    model,
    messages: cleanedApiMessages,  // Use cleaned messages
    temperature: options.temperature ?? 0.7,
    top_p: options.top_p ?? 0.8,
    // Don't set max_tokens - let Cerebras use its default
    // Add tools with tool_choice if tools exist
    ...(apiTools.length > 0
      ? {
          // Deep clone tools array to prevent mutation issues (llxprt pattern)
          tools: JSON.parse(JSON.stringify(apiTools)),
          // CRITICAL: Add tool_choice for Qwen/Cerebras to prevent tool hallucination
          tool_choice: 'auto',
        }
      : {}),
  }

  // No truncation here - compaction should happen at agent level BEFORE reaching this point
  // If we're getting too many tokens here, it means auto-compact didn't trigger
  // Log a warning but don't truncate (truncation creates broken context)
  const totalTokens = countTokens(messages);
  const contextThreshold = 170000; // 85% of 200k context limit
  if (totalTokens >= contextThreshold) {
    const percentUsed = Math.round((totalTokens / 200000) * 100);
    console.warn(`⚠️  Large conversation (${totalTokens.toLocaleString()} tokens, ${percentUsed}%) - auto-compact should have triggered earlier`);
  }

  // CRITICAL VALIDATION: Ensure request can be safely serialized to JSON
  // This prevents 400 errors from malformed JSON before sending to API
  const validationResult = validateRequestJSON(requestParams);
  if (!validationResult.valid) {
    // Type narrowing: TypeScript now knows validationResult has error and location properties
    const failedResult = validationResult as { valid: false; error: string; location: string };
    console.error('\n❌ === REQUEST VALIDATION FAILED ===');
    console.error('Error:', failedResult.error);
    console.error('Location:', failedResult.location);
    console.error('\nProblematic request params:');
    console.error(JSON.stringify(requestParams, null, 2));
    console.error('=== END VALIDATION ERROR ===\n');

    throw new Error(`Request validation failed at ${failedResult.location}: ${failedResult.error}`);
  }

  try {
    // ALWAYS save requests for debugging - we need to see what's failing
    const filename = `/tmp/cerebras-request-${timestamp}-${requestParams.messages.length}msg.json`;
    try {
      await import('fs').then(fs =>
        fs.promises.writeFile(filename, JSON.stringify(requestParams, null, 2))
      );
      // console.error(`🔍 [${new Date().toISOString()}] Saved ${requestParams.messages.length}-message request to ${filename}`);
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

        const errorType = error.constructor?.name || 'Error';
        const status = error.status || error.response?.status || 'N/A';

        // CRITICAL: Log response body if available for 400 errors
        if (status === 400) {
          console.error(`\n❌ [${new Date().toISOString()}] 400 Bad Request Error - FULL DEBUGGING:`);
          console.error(`   Error Type: ${errorType}`);
          console.error(`   Message: ${error.message}`);

          // Try to extract actual error from response
          if (error.response?.data) {
            console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
          }
          if (error.error) {
            console.error('   Error Object:', JSON.stringify(error.error, null, 2));
          }

          // Log the malformed request details
          console.error(`\n   Request Summary:`);
          console.error(`   - Request Size: ${JSON.stringify(requestParams).length} bytes`);
          console.error(`   - Message Count: ${requestParams.messages.length}`);
          console.error(`   - Tool Count: ${requestParams.tools?.length || 0}`);

          // CRITICAL: Show the FULL request being sent
          console.error(`\n   🔍 FULL REQUEST PAYLOAD:`);
          console.error(JSON.stringify(requestParams, null, 2));

          // ENHANCED: Analyze each message for potential issues
          console.error(`\n   📋 DETAILED MESSAGE-BY-MESSAGE ANALYSIS:`);
          console.error(`   ============================================`);
          requestParams.messages.forEach((msg: any, idx: number) => {
            console.error(`\n   📧 MESSAGE #${idx + 1} of ${requestParams.messages.length} - ROLE: ${msg.role}`);
            console.error(`   ${'─'.repeat(60)}`);

            // Check content
            if (msg.content !== undefined) {
              const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
              const contentLen = contentStr.length;

              console.error(`   📝 Content (${contentLen} chars):`);
              console.error(`   ${contentStr.substring(0, 500)}${contentLen > 500 ? '...[TRUNCATED]' : ''}`);
              console.error(``);

              // Look for problematic patterns
              const hasUnescapedQuotes = contentStr.match(/[^\\]"/g);
              const hasSingleQuotes = contentStr.includes("'");
              const hasNewlines = contentStr.includes('\n');
              const hasBackslashes = contentStr.includes('\\');

              // Flag potential issues
              const warnings = [];
              if (hasUnescapedQuotes) warnings.push('⚠️  Potentially unescaped quotes');
              if (hasSingleQuotes) warnings.push('ℹ️  Single quotes/apostrophes');
              if (hasNewlines) warnings.push('ℹ️  Newlines');
              if (hasBackslashes) warnings.push('⚠️  Backslashes (check escaping)');

              if (warnings.length > 0) {
                console.error(`   🔍 Flags: ${warnings.join(' | ')}`);
              }
            } else {
              console.error(`   📝 Content: <undefined>`);
            }

            // Check tool_calls
            if (msg.tool_calls) {
              console.error(`   🛠️  Tool Calls (${msg.tool_calls.length}):`);
              msg.tool_calls.forEach((tc: any, tcIdx: number) => {
                console.error(`     [${tcIdx + 1}] ${tc.function?.name} (id: ${tc.id})`);
                if (tc.function?.arguments) {
                  console.error(`         Arguments: ${tc.function.arguments}`);
                  try {
                    JSON.parse(tc.function.arguments);
                    console.error(`         ✓ Valid JSON`);
                  } catch (e) {
                    console.error(`         ❌ INVALID JSON: ${e}`);
                    console.error(`         ⚠️  THIS IS LIKELY THE ISSUE!`);
                  }
                }
              });
            }

            // Check tool_call_id for tool messages
            if (msg.role === 'tool' && msg.tool_call_id) {
              console.error(`   🔗 Tool Call ID: ${msg.tool_call_id}`);
            }
          });
          console.error(`\n   ============================================`);

          console.error(`\n   💡 Common 400 Error Causes:`);
          console.error(`   1. Unescaped quotes in message content (e.g., "project"s" instead of "project's")`);
          console.error(`   2. Invalid JSON in tool call arguments`);
          console.error(`   3. Malformed message structure`);
          console.error(`   4. Invalid characters in content`);
        }

        // 400 ERROR HANDLING: Don't retry same malformed request
        // Instead, throw error to trigger conversation rollback at agent level
        if (status === 400) {
          console.error(`\n🔄 400 Bad Request - Will rollback and retry from previous state`);

          // Import error class
          const { BadRequestRetryError } = await import('./errors.js');

          throw new BadRequestRetryError(
            '400 Bad Request - Malformed request, needs conversation rollback',
            error,
            {
              messageCount: requestParams.messages.length,
              requestSize: JSON.stringify(requestParams).length,
            }
          );
        }

        // Check if we should retry for other retryable errors
        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          const delay = calculateBackoffDelay(attempt);
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
      // console.error(`✅ [${new Date().toISOString()}] Saved response to ${responseFilename}`);
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
          choice.message.tool_calls.forEach((tc: any, idx: number) => {
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

    // CRITICAL: Enhance error with request details for TUI display
    if (status === 400) {
      const enhancedError = new Error(error.message);
      (enhancedError as any).statusCode = 400;
      (enhancedError as any).requestDetails = {
        messageCount: requestParams.messages.length,
        toolCount: requestParams.tools?.length || 0,
        requestSize: JSON.stringify(requestParams).length,
        messages: requestParams.messages.map((msg: any, idx: number) => ({
          index: idx + 1,
          role: msg.role,
          contentLength: msg.content ? msg.content.length : 0,
          contentPreview: msg.content ? msg.content.substring(0, 200) : '<none>',
          hasToolCalls: !!msg.tool_calls,
          toolCallCount: msg.tool_calls?.length || 0,
        })),
        lastMessage: requestParams.messages[requestParams.messages.length - 1],
      };
      throw enhancedError;
    }

    throw error;
  }
}
