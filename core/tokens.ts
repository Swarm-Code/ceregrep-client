/**
 * Token counting utilities for ceregrep
 * Tracks conversation token usage to enable automatic context compaction
 */

import { Message } from './messages.js';

/**
 * Count total tokens used in conversation by examining the most recent assistant message with usage info
 * This gives us an accurate count of the last API call's token consumption
 */
export function countTokens(messages: Message[]): number {
  // Walk backwards through messages to find the most recent assistant message with usage
  let i = messages.length - 1;
  while (i >= 0) {
    const message = messages[i];
    if (
      message?.type === 'assistant' &&
      'usage' in message.message &&
      message.message.usage
    ) {
      const { usage } = message.message;
      // Total tokens = input + cache creation + cache read + output
      return (
        (usage.input_tokens || 0) +
        (usage.cache_creation_input_tokens || 0) +
        (usage.cache_read_input_tokens || 0) +
        (usage.output_tokens || 0)
      );
    }
    i--;
  }
  return 0;
}

/**
 * Count only cached tokens (cache creation + cache read)
 */
export function countCachedTokens(messages: Message[]): number {
  let i = messages.length - 1;
  while (i >= 0) {
    const message = messages[i];
    if (message?.type === 'assistant' && 'usage' in message.message) {
      const { usage } = message.message;
      return (
        (usage.cache_creation_input_tokens || 0) +
        (usage.cache_read_input_tokens || 0)
      );
    }
    i--;
  }
  return 0;
}

/**
 * Threshold ratio for triggering automatic context compression
 * When context usage exceeds 85% of the model's limit, auto-compact activates
 * (Lowered from 92% for more aggressive proactive management)
 */
const AUTO_COMPACT_THRESHOLD_RATIO = 0.85;

/**
 * Default context length for models (can be overridden per model)
 */
const DEFAULT_CONTEXT_LENGTH = 200000;

/**
 * Calculate dynamic threshold based on model context length
 * @param contextLength - Model's maximum context length
 * @returns Token threshold for auto-compaction
 */
export function calculateAutoCompactThreshold(contextLength: number = DEFAULT_CONTEXT_LENGTH): number {
  return Math.floor(contextLength * AUTO_COMPACT_THRESHOLD_RATIO);
}

/**
 * Estimate if we're approaching the context limit
 * Uses dynamic threshold calculation based on model capabilities
 * @param messages - Conversation messages
 * @param contextLength - Model's maximum context length (default 200k)
 * @returns Object with threshold status and metrics
 */
export function shouldCompact(
  messages: Message[],
  contextLength: number = DEFAULT_CONTEXT_LENGTH
): {
  shouldCompact: boolean;
  tokenCount: number;
  threshold: number;
  percentUsed: number;
  tokensRemaining: number;
} {
  const tokenCount = countTokens(messages);
  const threshold = calculateAutoCompactThreshold(contextLength);
  const percentUsed = Math.round((tokenCount / contextLength) * 100);
  const tokensRemaining = Math.max(0, threshold - tokenCount);

  return {
    shouldCompact: tokenCount >= threshold,
    tokenCount,
    threshold,
    percentUsed,
    tokensRemaining,
  };
}

/**
 * Get detailed token usage stats
 */
export function getTokenStats(messages: Message[]): {
  total: number;
  cached: number;
  input: number;
  output: number;
} {
  let i = messages.length - 1;
  while (i >= 0) {
    const message = messages[i];
    if (message?.type === 'assistant' && 'usage' in message.message) {
      const { usage } = message.message;
      return {
        total:
          (usage.input_tokens || 0) +
          (usage.cache_creation_input_tokens || 0) +
          (usage.cache_read_input_tokens || 0) +
          (usage.output_tokens || 0),
        cached:
          (usage.cache_creation_input_tokens || 0) +
          (usage.cache_read_input_tokens || 0),
        input: usage.input_tokens || 0,
        output: usage.output_tokens || 0,
      };
    }
    i--;
  }
  return { total: 0, cached: 0, input: 0, output: 0 };
}
