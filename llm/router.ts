/**
 * LLM Provider Router
 * Routes to appropriate LLM provider based on configuration
 */

import { Tool } from '../core/tool.js';
import { AssistantMessage, UserMessage } from '../core/messages.js';
import { querySonnet as queryAnthropic, formatSystemPromptWithContext } from './anthropic.js';
import { queryCerebras } from './cerebras.js';
import { getConfig } from '../config/loader.js';

export { formatSystemPromptWithContext };

/**
 * Query LLM with automatic provider routing
 * Detects provider from config and routes accordingly
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
  const config = getConfig();

  // Determine provider
  const provider = config.provider?.type || 'anthropic';

  // Use thinking settings from config if not provided in options
  const enableThinking = options.enableThinking ?? config.enableThinking ?? false;
  const ultrathinkMode = options.ultrathinkMode ?? config.ultrathinkMode ?? false;

  // Route to appropriate provider
  switch (provider) {
    case 'cerebras':
      return await queryCerebras(messages, systemPrompt, maxThinkingTokens, tools, abortSignal, {
        ...options,
        apiKey: options.apiKey || config.provider?.apiKey || config.apiKey,
        baseURL: config.provider?.baseURL,
        temperature: config.provider?.temperature,
        top_p: config.provider?.top_p,
        model: options.model || config.model,
      });

    case 'anthropic':
    default:
      return await queryAnthropic(messages, systemPrompt, maxThinkingTokens, tools, abortSignal, {
        ...options,
        apiKey: options.apiKey || config.provider?.apiKey || config.apiKey,
        model: options.model || config.model,
        enableThinking,
        ultrathinkMode,
      });
  }
}
