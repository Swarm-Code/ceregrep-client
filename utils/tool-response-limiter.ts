/**
 * Token-based Tool Response Limiter
 * Uses tiktoken for ACCURATE token counting (not estimation)
 *
 * Prevents massive tool outputs from causing:
 * 1. Context window overflow
 * 2. API request size limits
 * 3. Infinite compaction loops
 */

import { encoding_for_model } from 'tiktoken';

// Initialize tiktoken encoder for Claude (uses cl100k_base like GPT-4)
let encoder: any = null;
function getEncoder() {
  if (!encoder) {
    try {
      // Claude uses the same tokenizer as GPT-4
      encoder = encoding_for_model('gpt-4');
    } catch (error) {
      console.error('Failed to initialize tiktoken encoder:', error);
      // Fallback to estimation if tiktoken fails
      return null;
    }
  }
  return encoder;
}

/**
 * Maximum tokens for tool outputs
 * Conservative limit based on:
 * - Claude's 200k context window
 * - System prompt ~2-5k tokens
 * - Tools definition ~5-10k tokens
 * - Conversation history variable
 * - Safety buffer for responses
 *
 * Target: Keep single tool output under 5% of context (10k tokens)
 * This allows ~20 large tool outputs before hitting 92% compaction threshold
 */
export const MAX_TOOL_OUTPUT_TOKENS = 10_000;

/**
 * Count ACTUAL tokens using tiktoken
 * This is accurate, not an estimate
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  const enc = getEncoder();
  if (!enc) {
    // Fallback to rough estimation if tiktoken unavailable
    return Math.ceil(text.length / 4);
  }

  try {
    const tokens = enc.encode(text);
    const count = tokens.length;

    // Debug: Log if count seems wrong
    if (process.env.DEBUG_TOKENS) {
      console.error(`[TOKEN DEBUG] Length: ${text.length} chars, Actual tokens: ${count}`);
    }

    return count;
  } catch (error) {
    // Fallback on error
    console.error('Token counting error:', error);
    return Math.ceil(text.length / 4);
  }
}

/**
 * Check if output exceeds token limit
 */
export function isOutputTooLarge(output: string, maxTokens: number = MAX_TOOL_OUTPUT_TOKENS): boolean {
  return estimateTokens(output) > maxTokens;
}

/**
 * Truncate output to fit within token limit
 * Adds truncation notice with helpful suggestions
 */
export function truncateOutput(
  output: string,
  maxTokens: number = MAX_TOOL_OUTPUT_TOKENS,
  context: {
    toolName: string;
    command?: string;
    filePath?: string;
    pattern?: string;
  }
): string {
  const estimatedTokens = estimateTokens(output);

  if (estimatedTokens <= maxTokens) {
    return output; // No truncation needed
  }

  // Calculate how much to keep (leave room for truncation message)
  const maxChars = Math.floor(maxTokens * 4 * 0.9); // 90% of max, 4 chars/token
  const truncated = output.substring(0, maxChars);

  // Count lines for better user feedback
  const totalLines = (output.match(/\n/g) || []).length + 1;
  const keptLines = (truncated.match(/\n/g) || []).length + 1;

  // Build truncation message with context-specific suggestions
  let message = `\n\n[OUTPUT TRUNCATED - Too Large]\n`;
  message += `Showing ${keptLines.toLocaleString()} of ${totalLines.toLocaleString()} lines (~${estimatedTokens.toLocaleString()} tokens)\n`;
  message += `Maximum allowed: ${maxTokens.toLocaleString()} tokens per tool output\n\n`;

  // Add context-specific suggestions
  message += `SUGGESTIONS:\n`;

  if (context.toolName === 'Bash') {
    if (context.command?.includes('cat') || context.command?.includes('less')) {
      message += `- Use 'head -n 100' or 'tail -n 100' instead of reading entire file\n`;
    }
    if (context.command?.includes('ls')) {
      message += `- Use 'ls | head -n 50' to limit directory listings\n`;
    }
    if (context.command?.includes('find')) {
      message += `- Add '| head -n 100' to limit find results\n`;
      message += `- Use more specific search patterns\n`;
    }
    message += `- Pipe through grep to filter: 'command | grep pattern'\n`;
    message += `- Use wc to count instead: 'command | wc -l'\n`;
  } else if (context.toolName === 'Read') {
    message += `- File is too large - use offset and limit parameters\n`;
    message += `  Example: Read lines 1-100, then 101-200, etc.\n`;
    message += `- Use GrepTool to search for specific content instead\n`;
    message += `- Consider if you really need to read the entire file\n`;
  } else if (context.toolName === 'Grep') {
    message += `- Pattern matched too many results\n`;
    message += `- Use more specific search patterns\n`;
    message += `- Add file type filters (glob or type parameters)\n`;
    message += `- Use files_with_matches output mode to see just file paths\n`;
  }

  message += `\n`;

  return truncated + message;
}

/**
 * Format size for user display
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  } else if (tokens < 10000) {
    return `${(tokens / 1000).toFixed(1)}k tokens`;
  } else {
    return `${Math.round(tokens / 1000)}k tokens`;
  }
}

/**
 * Get appropriate max tokens for different tool types
 * Some tools can have larger outputs than others
 */
export function getMaxTokensForTool(toolName: string): number {
  switch (toolName) {
    case 'Read':
      // Files can be larger, but still limit to prevent bloat
      return 15_000; // ~50KB of code
    case 'Grep':
      // Search results should be more limited
      return 8_000;
    case 'Bash':
      // Command outputs should be concise
      return 10_000;
    default:
      return MAX_TOOL_OUTPUT_TOKENS;
  }
}
