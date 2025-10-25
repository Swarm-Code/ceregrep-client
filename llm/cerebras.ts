/**
 * OpenAI SDK-based LLM Client (Cerebras/OpenAI compatible)
 * Based on Kode implementation
 */

import { OpenAI } from 'openai';
import { randomUUID } from 'crypto';
import { Tool } from '../core/tool.js';
import { AssistantMessage, UserMessage } from '../core/messages.js';
import { countTokens } from '../core/tokens.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getConfig } from '../config/loader.js';

const CEREBRAS_BASE_URL = 'https://api.cerebras.ai/v1';
const CEREBRAS_COST_PER_MILLION_TOKENS = 2.0;

/**
 * Retry configuration constants for API calls
 */
const RETRY_CONFIG = {
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 32000,
  MAX_SERVER_DELAY_MS: 60000,
  JITTER_FACTOR: 0.1,
} as const;

/**
 * Calculate retry delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const retryAfterMs = parseInt(retryAfter) * 1000;
    if (!isNaN(retryAfterMs) && retryAfterMs > 0) {
      return Math.min(retryAfterMs, RETRY_CONFIG.MAX_SERVER_DELAY_MS);
    }
  }

  const delay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt - 1);
  const jitter = Math.random() * RETRY_CONFIG.JITTER_FACTOR * delay;

  return Math.min(delay + jitter, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Helper function to create an abortable delay
 */
function abortableDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Request was aborted'));
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, delayMs);

    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new Error('Request was aborted'));
      };
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

enum ModelErrorType {
  MaxLength = '1024',
  MaxCompletionTokens = 'max_completion_tokens',
  TemperatureRestriction = 'temperature_restriction',
  StreamOptions = 'stream_options',
  Citations = 'citations',
  RateLimit = 'rate_limit',
}

// Simple session state for model errors
const modelErrors: Record<string, string> = {};

function getModelErrorKey(
  baseURL: string,
  model: string,
  type: ModelErrorType,
): string {
  return `${baseURL}:${model}:${type}`;
}

function hasModelError(
  baseURL: string,
  model: string,
  type: ModelErrorType,
): boolean {
  return !!modelErrors[getModelErrorKey(baseURL, model, type)];
}

function setModelError(
  baseURL: string,
  model: string,
  type: ModelErrorType,
  error: string,
) {
  modelErrors[getModelErrorKey(baseURL, model, type)] = error;
}

type ErrorDetector = (errMsg: string) => boolean;
type ErrorFixer = (
  opts: OpenAI.ChatCompletionCreateParams,
) => Promise<void> | void;
interface ErrorHandler {
  type: ModelErrorType;
  detect: ErrorDetector;
  fix: ErrorFixer;
}

const GPT5_ERROR_HANDLERS: ErrorHandler[] = [
  {
    type: ModelErrorType.MaxCompletionTokens,
    detect: errMsg => {
      const lowerMsg = errMsg.toLowerCase();
      return (
        (lowerMsg.includes("unsupported parameter: 'max_tokens'") && lowerMsg.includes("'max_completion_tokens'")) ||
        (lowerMsg.includes("max_tokens") && lowerMsg.includes("max_completion_tokens")) ||
        (lowerMsg.includes("max_tokens") && lowerMsg.includes("not supported")) ||
        (lowerMsg.includes("max_tokens") && lowerMsg.includes("use max_completion_tokens")) ||
        (lowerMsg.includes("invalid parameter") && lowerMsg.includes("max_tokens")) ||
        (lowerMsg.includes("parameter error") && lowerMsg.includes("max_tokens"))
      );
    },
    fix: async opts => {
      console.log(`🔧 GPT-5 Fix: Converting max_tokens (${opts.max_tokens}) to max_completion_tokens`);
      if ('max_tokens' in opts) {
        opts.max_completion_tokens = opts.max_tokens;
        delete opts.max_tokens;
      }
    },
  },
  {
    type: ModelErrorType.TemperatureRestriction,
    detect: errMsg => {
      const lowerMsg = errMsg.toLowerCase();
      return (
        lowerMsg.includes("temperature") &&
        (lowerMsg.includes("only supports") || lowerMsg.includes("must be 1") || lowerMsg.includes("invalid temperature"))
      );
    },
    fix: async opts => {
      console.log(`🔧 GPT-5 Fix: Adjusting temperature from ${opts.temperature} to 1`);
      opts.temperature = 1;
    },
  },
];

const ERROR_HANDLERS: ErrorHandler[] = [
  {
    type: ModelErrorType.MaxLength,
    detect: errMsg =>
      errMsg.includes('Expected a string with maximum length 1024'),
    fix: async opts => {
      const toolDescriptions: Record<string, string> = {};
      for (const tool of opts.tools || []) {
        if (!tool.function.description || tool.function.description.length <= 1024) continue;
        let str = '';
        let remainder = '';
        for (let line of tool.function.description.split('\n')) {
          if (str.length + line.length < 1024) {
            str += line + '\n';
          } else {
            remainder += line + '\n';
          }
        }

        tool.function.description = str;
        toolDescriptions[tool.function.name] = remainder;
      }
      if (Object.keys(toolDescriptions).length > 0) {
        let content = '<additional-tool-usage-instructions>\n\n';
        for (const [name, description] of Object.entries(toolDescriptions)) {
          content += `<${name}>\n${description}\n</${name}>\n\n`;
        }
        content += '</additional-tool-usage-instructions>';

        for (let i = opts.messages.length - 1; i >= 0; i--) {
          if (opts.messages[i].role === 'system') {
            opts.messages.splice(i + 1, 0, {
              role: 'system',
              content,
            });
            break;
          }
        }
      }
    },
  },
  {
    type: ModelErrorType.MaxCompletionTokens,
    detect: errMsg => errMsg.includes("Use 'max_completion_tokens'"),
    fix: async opts => {
      opts.max_completion_tokens = opts.max_tokens;
      delete opts.max_tokens;
    },
  },
  {
    type: ModelErrorType.StreamOptions,
    detect: errMsg => errMsg.includes('stream_options'),
    fix: async opts => {
      delete opts.stream_options;
    },
  },
  {
    type: ModelErrorType.Citations,
    detect: errMsg =>
      errMsg.includes('Extra inputs are not permitted') &&
      errMsg.includes('citations'),
    fix: async opts => {
      if (!opts.messages) return;

      for (const message of opts.messages) {
        if (!message) continue;

        if (Array.isArray(message.content)) {
          for (const item of message.content) {
            if (item && typeof item === 'object') {
              const itemObj = item as unknown as Record<string, unknown>;
              if ('citations' in itemObj) {
                delete itemObj.citations;
              }
            }
          }
        } else if (message.content && typeof message.content === 'object') {
          const contentObj = message.content as unknown as Record<string, unknown>;
          if ('citations' in contentObj) {
            delete contentObj.citations;
          }
        }
      }
    },
  },
];

function isRateLimitError(errMsg: string): boolean {
  if (!errMsg) return false;
  const lowerMsg = errMsg.toLowerCase();
  return (
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests') ||
    lowerMsg.includes('429')
  );
}

interface ModelFeatures {
  usesMaxCompletionTokens: boolean;
  supportsResponsesAPI?: boolean;
  requiresTemperatureOne?: boolean;
  supportsVerbosityControl?: boolean;
  supportsCustomTools?: boolean;
  supportsAllowedTools?: boolean;
}

const MODEL_FEATURES: Record<string, ModelFeatures> = {
  o1: { usesMaxCompletionTokens: true },
  'o1-preview': { usesMaxCompletionTokens: true },
  'o1-mini': { usesMaxCompletionTokens: true },
  'o1-pro': { usesMaxCompletionTokens: true },
  'o3-mini': { usesMaxCompletionTokens: true },
  'gpt-5': {
    usesMaxCompletionTokens: true,
    supportsResponsesAPI: true,
    requiresTemperatureOne: true,
    supportsVerbosityControl: true,
    supportsCustomTools: true,
    supportsAllowedTools: true,
  },
  'gpt-5-mini': {
    usesMaxCompletionTokens: true,
    supportsResponsesAPI: true,
    requiresTemperatureOne: true,
    supportsVerbosityControl: true,
    supportsCustomTools: true,
    supportsAllowedTools: true,
  },
};

function getModelFeatures(modelName: string): ModelFeatures {
  if (!modelName || typeof modelName !== 'string') {
    return { usesMaxCompletionTokens: false };
  }

  if (MODEL_FEATURES[modelName]) {
    return MODEL_FEATURES[modelName];
  }

  if (modelName.toLowerCase().includes('gpt-5')) {
    return {
      usesMaxCompletionTokens: true,
      supportsResponsesAPI: true,
      requiresTemperatureOne: true,
      supportsVerbosityControl: true,
      supportsCustomTools: true,
      supportsAllowedTools: true,
    };
  }

  for (const [key, features] of Object.entries(MODEL_FEATURES)) {
    if (modelName.includes(key)) {
      return features;
    }
  }

  return { usesMaxCompletionTokens: false };
}

function applyModelSpecificTransformations(
  opts: OpenAI.ChatCompletionCreateParams,
): void {
  if (!opts.model || typeof opts.model !== 'string') {
    return;
  }

  const features = getModelFeatures(opts.model);
  const isGPT5 = opts.model.toLowerCase().includes('gpt-5');

  if (isGPT5 || features.usesMaxCompletionTokens) {
    if ('max_tokens' in opts && !('max_completion_tokens' in opts)) {
      console.log(`🔧 Transforming max_tokens (${opts.max_tokens}) to max_completion_tokens for ${opts.model}`);
      opts.max_completion_tokens = opts.max_tokens;
      delete opts.max_tokens;
    }

    if (features.requiresTemperatureOne && 'temperature' in opts) {
      if (opts.temperature !== 1 && opts.temperature !== undefined) {
        console.log(
          `🔧 GPT-5 temperature constraint: Adjusting temperature from ${opts.temperature} to 1 for ${opts.model}`
        );
        opts.temperature = 1;
      }
    }

    if (isGPT5) {
      delete opts.frequency_penalty;
      delete opts.presence_penalty;
      delete opts.logit_bias;
      delete opts.user;

      if (!opts.reasoning_effort && features.supportsVerbosityControl) {
        opts.reasoning_effort = 'medium' as any;
      }
    }
  } else {
    if (
      features.usesMaxCompletionTokens &&
      'max_tokens' in opts &&
      !('max_completion_tokens' in opts)
    ) {
      opts.max_completion_tokens = opts.max_tokens;
      delete opts.max_tokens;
    }
  }
}

async function applyModelErrorFixes(
  opts: OpenAI.ChatCompletionCreateParams,
  baseURL: string,
) {
  const isGPT5 = opts.model.startsWith('gpt-5');
  const handlers = isGPT5 ? [...GPT5_ERROR_HANDLERS, ...ERROR_HANDLERS] : ERROR_HANDLERS;

  for (const handler of handlers) {
    if (hasModelError(baseURL, opts.model, handler.type)) {
      await handler.fix(opts);
      return;
    }
  }
}

/**
 * Format tools for OpenAI/Cerebras API
 */
function formatToolsForOpenAI(tools: Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools
    .filter((tool) => {
      if (!tool.name) {
        console.warn('⚠️  Skipping tool with null/undefined name:', tool);
        return false;
      }
      return true;
    })
    .map((tool) => {
      let inputSchema: any = tool.inputJSONSchema || tool.inputSchema || tool.input_schema;

      if (inputSchema && typeof inputSchema === 'object' && '_def' in inputSchema) {
        inputSchema = zodToJsonSchema(inputSchema as z.ZodType);
      }

      if (inputSchema && inputSchema.$schema) {
        if (inputSchema.$ref && inputSchema.definitions) {
          const refPath = inputSchema.$ref.replace('#/definitions/', '');
          if (inputSchema.definitions[refPath]) {
            inputSchema = inputSchema.definitions[refPath];
          }
        } else {
          const { $schema, definitions, ...actualSchema } = inputSchema;
          inputSchema = actualSchema;
        }
      }

      if (!inputSchema || !inputSchema.type || !inputSchema.properties) {
        console.warn(`⚠️  Tool "${tool.name}" has invalid schema, using empty object`);
        inputSchema = {
          type: 'object',
          properties: {},
        };
      }

      const cleanedSchema: any = {
        type: inputSchema.type,
        properties: {},
      };

      if (inputSchema.properties) {
        for (const [propName, propSchema] of Object.entries(inputSchema.properties)) {
          const prop = propSchema as any;
          const cleanedProp: any = {
            type: prop.type,
          };

          if (prop.description) {
            cleanedProp.description = prop.description;
          }

          if (prop.enum) {
            cleanedProp.enum = prop.enum;
          }

          if (prop.items) {
            cleanedProp.items = prop.items;
          }

          if (prop.properties) {
            cleanedProp.properties = prop.properties;
          }

          cleanedSchema.properties[propName] = cleanedProp;
        }
      }

      if (inputSchema.required && inputSchema.required.length > 0) {
        cleanedSchema.required = inputSchema.required;
      }

      let description = 'A tool';
      if (typeof tool.description === 'string') {
        description = tool.description;
      } else if (typeof tool.description === 'function') {
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

async function getCompletionWithProfile(
  modelProfile: any,
  opts: OpenAI.ChatCompletionCreateParams,
  attempt: number = 0,
  maxAttempts: number = 10,
  signal?: AbortSignal,
): Promise<OpenAI.ChatCompletion | AsyncIterable<OpenAI.ChatCompletionChunk>> {
  if (attempt >= maxAttempts) {
    throw new Error('Max attempts reached');
  }

  const baseURL = modelProfile?.baseURL;
  const apiKey = modelProfile?.apiKey;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  applyModelSpecificTransformations(opts);
  await applyModelErrorFixes(opts, baseURL || '');

  // Make sure all tool messages have string content
  opts.messages = opts.messages.map(msg => {
    if (msg.role === 'tool') {
      if (Array.isArray(msg.content)) {
        return {
          ...msg,
          content:
            msg.content
              .map((c: any) => c.text || '')
              .filter(Boolean)
              .join('\n\n') || '(empty content)',
        };
      } else if (typeof msg.content !== 'string') {
        return {
          ...msg,
          content:
            typeof msg.content === 'undefined'
              ? '(empty content)'
              : JSON.stringify(msg.content),
        };
      }
    }
    return msg;
  });

  const endpoint = '/chat/completions';

  try {
    if (opts.stream) {
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...opts, stream: true }),
        signal: signal,
      });

      if (!response.ok) {
        if (signal?.aborted) {
          throw new Error('Request cancelled by user');
        }

        try {
          const errorData = await response.json();
          const hasError = (data: unknown): data is { error?: { message?: string }; message?: string } => {
            return typeof data === 'object' && data !== null;
          };
          const errorMessage = hasError(errorData)
            ? (errorData.error?.message || errorData.message || `HTTP ${response.status}`)
            : `HTTP ${response.status}`;

          const isGPT5 = opts.model.startsWith('gpt-5');
          const handlers = isGPT5 ? [...GPT5_ERROR_HANDLERS, ...ERROR_HANDLERS] : ERROR_HANDLERS;

          for (const handler of handlers) {
            if (handler.detect(errorMessage)) {
              console.log(`🔧 Detected ${handler.type} error for ${opts.model}: ${errorMessage}`);
              setModelError(baseURL || '', opts.model, handler.type, errorMessage);
              await handler.fix(opts);
              console.log(`🔧 Applied fix for ${handler.type}, retrying...`);

              return getCompletionWithProfile(
                modelProfile,
                opts,
                attempt + 1,
                maxAttempts,
                signal,
              );
            }
          }

          console.log(`⚠️  Unhandled API error (${response.status}): ${errorMessage}`);
        } catch (parseError: unknown) {
          const err = parseError as Error;
          console.log(`⚠️  Could not parse error response (${response.status}): ${err.message}`);
        }

        const delayMs = getRetryDelay(attempt);
        console.log(
          `  ⎿  API error (${response.status}), retrying in ${Math.round(delayMs / 1000)}s... (attempt ${attempt + 1}/${maxAttempts})`,
        );
        try {
          await abortableDelay(delayMs, signal);
        } catch (error: unknown) {
          const err = error as Error;
          if (err.message === 'Request was aborted') {
            throw new Error('Request cancelled by user');
          }
          throw error;
        }
        return getCompletionWithProfile(
          modelProfile,
          opts,
          attempt + 1,
          maxAttempts,
          signal,
        );
      }

      const stream = createStreamProcessor(response.body as any, signal);
      return stream;
    }

    // Non-streaming request
    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(opts),
      signal: signal,
    });

    if (!response.ok) {
      if (signal?.aborted) {
        throw new Error('Request cancelled by user');
      }

      try {
        const errorData = await response.json();
        const hasError = (data: unknown): data is { error?: { message?: string }; message?: string } => {
          return typeof data === 'object' && data !== null;
        };
        const errorMessage = hasError(errorData)
          ? (errorData.error?.message || errorData.message || `HTTP ${response.status}`)
          : `HTTP ${response.status}`;

        const isGPT5 = opts.model.startsWith('gpt-5');
        const handlers = isGPT5 ? [...GPT5_ERROR_HANDLERS, ...ERROR_HANDLERS] : ERROR_HANDLERS;

        for (const handler of handlers) {
          if (handler.detect(errorMessage)) {
            console.log(`🔧 Detected ${handler.type} error for ${opts.model}: ${errorMessage}`);
            setModelError(baseURL || '', opts.model, handler.type, errorMessage);
            await handler.fix(opts);
            console.log(`🔧 Applied fix for ${handler.type}, retrying...`);

            return getCompletionWithProfile(
              modelProfile,
              opts,
              attempt + 1,
              maxAttempts,
              signal,
            );
          }
        }

        console.log(`⚠️  Unhandled API error (${response.status}): ${errorMessage}`);
      } catch (parseError: unknown) {
        const err = parseError as Error;
        console.log(`⚠️  Could not parse error response (${response.status}): ${err.message}`);
      }

      const delayMs = getRetryDelay(attempt);
      console.log(
        `  ⎿  API error (${response.status}), retrying in ${Math.round(delayMs / 1000)}s... (attempt ${attempt + 1}/${maxAttempts})`,
      );
      try {
        await abortableDelay(delayMs, signal);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message === 'Request was aborted') {
          throw new Error('Request cancelled by user');
        }
        throw error;
      }
      return getCompletionWithProfile(
        modelProfile,
        opts,
        attempt + 1,
        maxAttempts,
        signal,
      );
    }

    const responseData = (await response.json()) as OpenAI.ChatCompletion;
    return responseData;
  } catch (error: unknown) {
    if (signal?.aborted) {
      throw new Error('Request cancelled by user');
    }

    if (attempt < maxAttempts) {
      if (signal?.aborted) {
        throw new Error('Request cancelled by user');
      }

      const delayMs = getRetryDelay(attempt);
      console.log(
        `  ⎿  Network error, retrying in ${Math.round(delayMs / 1000)}s... (attempt ${attempt + 1}/${maxAttempts})`,
      );
      try {
        await abortableDelay(delayMs, signal);
      } catch (error: unknown) {
        const err = error as Error;
        if (err.message === 'Request was aborted') {
          throw new Error('Request cancelled by user');
        }
        throw error;
      }
      return getCompletionWithProfile(
        modelProfile,
        opts,
        attempt + 1,
        maxAttempts,
        signal,
      );
    }
    throw error;
  }
}

function createStreamProcessor(
  stream: any,
  signal?: AbortSignal,
): AsyncGenerator<OpenAI.ChatCompletionChunk, void, unknown> {
  if (!stream) {
    throw new Error('Stream is null or undefined');
  }

  return (async function* () {
    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) {
          break;
        }

        let readResult;
        try {
          readResult = await reader.read();
        } catch (e) {
          if (signal?.aborted) {
            break;
          }
          console.error('Error reading from stream:', e);
          break;
        }

        const { done, value } = readResult;
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        let lineEnd = buffer.indexOf('\n');
        while (lineEnd !== -1) {
          const line = buffer.substring(0, lineEnd).trim();
          buffer = buffer.substring(lineEnd + 1);

          if (line === 'data: [DONE]') {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data) as OpenAI.ChatCompletionChunk;
              yield parsed;
            } catch (e) {
              console.error('Error parsing JSON:', data, e);
            }
          }

          lineEnd = buffer.indexOf('\n');
        }
      }

      if (buffer.trim()) {
        const lines = buffer.trim().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const parsed = JSON.parse(data) as OpenAI.ChatCompletionChunk;
              yield parsed;
            } catch (e) {
              console.error('Error parsing final JSON:', data, e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Unexpected error in stream processing:', e);
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        console.error('Error releasing reader lock:', e);
      }
    }
  })();
}

/**
 * Query Cerebras/OpenAI API
 * Main export function compatible with existing codebase
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
  const baseURL = options.baseURL || CEREBRAS_BASE_URL;

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // Add system prompt
  if (systemPrompt.length > 0) {
    apiMessages.push({
      role: 'system',
      content: systemPrompt.join('\n\n'),
    });
  }

  const pendingToolResponses: any[] = [];

  const flushPendingToolResponses = () => {
    if (pendingToolResponses.length > 0) {
      apiMessages.push(...pendingToolResponses);
      pendingToolResponses.length = 0;
    }
  };

  // Add conversation messages
  for (const msg of messages) {
    if (msg.message.role === 'user') {
      const content = msg.message.content;

      if (Array.isArray(content)) {
        const toolResults = content.filter((item: any) => item.type === 'tool_result');
        const textContent = content.filter((item: any) => item.type === 'text' || typeof item === 'string');

        if (toolResults.length > 0) {
          for (const toolResult of toolResults) {
            const tr = toolResult as any;

            if (!tr.tool_use_id) {
              console.warn('⚠️  Skipping tool result with null/undefined tool_use_id:', tr);
              continue;
            }

            let toolContent = tr.content || '';
            if (typeof toolContent !== 'string') {
              toolContent = JSON.stringify(toolContent);
            }
            if (!toolContent || toolContent === '') {
              toolContent = 'Tool executed successfully';
            }

            pendingToolResponses.push({
              role: 'tool',
              tool_call_id: tr.tool_use_id,
              content: toolContent,
            } as any);
          }

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
          continue;
        }
      }

      flushPendingToolResponses();

      let userContent: string;
      if (typeof content === 'string') {
        userContent = content;
      } else if (Array.isArray(content)) {
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
      flushPendingToolResponses();

      const content = msg.message.content;

      const contentArray = Array.isArray(content) ? content : [];
      const toolCalls = contentArray
        .filter((c: any) => c.type === 'tool_use')
        .filter((c: any) => {
          if (!c.id || !c.name) {
            console.warn('⚠️  Skipping tool call with null/undefined id or name:', c);
            return false;
          }
          return true;
        })
        .map((c: any) => {
          const toolInput = c.input || {};
          return {
            id: c.id,
            type: 'function' as const,
            function: {
              name: c.name,
              arguments: JSON.stringify(toolInput),
            },
          };
        });

      const textContent = contentArray
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');

      if (toolCalls.length > 0) {
        const trimmedTextContent = textContent.trim();

        const msgContent: any = {
          role: 'assistant',
          tool_calls: toolCalls,
        };

        if (trimmedTextContent) {
          msgContent.content = trimmedTextContent;
        } else {
          msgContent.content = ' ';
        }

        apiMessages.push(msgContent);
      } else {
        apiMessages.push({
          role: 'assistant',
          content: textContent || 'No response',
        });
      }
    }
  }

  flushPendingToolResponses();

  const apiTools = formatToolsForOpenAI(tools);

  const totalTokens = countTokens(messages);
  const contextThreshold = 170000;
  if (totalTokens >= contextThreshold) {
    const percentUsed = Math.round((totalTokens / 200000) * 100);
    console.warn(`⚠️  Large conversation (${totalTokens.toLocaleString()} tokens, ${percentUsed}%) - auto-compact should have triggered earlier`);
  }

  const requestParams: any = {
    model,
    messages: apiMessages,
    temperature: options.temperature ?? 0.7,
    top_p: options.top_p ?? 0.8,
    ...(apiTools.length > 0
      ? {
          tools: JSON.parse(JSON.stringify(apiTools)),
          tool_choice: 'auto',
        }
      : {}),
  };

  const modelProfile = {
    apiKey,
    baseURL,
  };

  const startTime = Date.now();

  try {
    const response = await getCompletionWithProfile(
      modelProfile,
      requestParams,
      0,
      10,
      abortSignal,
    ) as OpenAI.ChatCompletion;

    const durationMs = Date.now() - startTime;
    const costUSD = response.usage ? calculateCost(response.usage) : 0;

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from API');
    }

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
    console.error('Cerebras API Error:', error);
    throw error;
  }
}
