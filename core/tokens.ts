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
 * Estimate if we're approaching the context limit
 * @param messages - Conversation messages
 * @param threshold - Token threshold (default 100k for 75% of 131k context)
 * @returns true if we should compact
 */
export function shouldCompact(messages: Message[], threshold: number = 100000): boolean {
  const totalTokens = countTokens(messages);
  return totalTokens >= threshold;
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
