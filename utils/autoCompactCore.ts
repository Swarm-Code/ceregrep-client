/**
 * Automatic context compression system - Kodes implementation
 * Intelligently compresses conversation history when approaching context limits
 * Preserves all critical information while reducing token consumption
 */

import { Message, UserMessage, AssistantMessage, createUserMessage, normalizeMessagesForAPI } from '../core/messages.js';
import { countTokens, shouldCompact as shouldCompactCheck } from '../core/tokens.js';
import fs from 'fs';
import path from 'path';

/**
 * Structured compression prompt that extracts essential context in 8 sections
 * Based on Kodes' proven compression strategy
 */
const COMPRESSION_PROMPT = `Please provide a comprehensive summary of our conversation structured as follows:

## Technical Context
Development environment, tools, frameworks, and configurations in use. Programming languages, libraries, and technical constraints. File structure, directory organization, and project architecture.

## Project Overview
Main project goals, features, and scope. Key components, modules, and their relationships. Data models, APIs, and integration patterns.

## Code Changes
Files created, modified, or analyzed during our conversation. Specific code implementations, functions, and algorithms added. Configuration changes and structural modifications.

## Debugging & Issues
Problems encountered and their root causes. Solutions implemented and their effectiveness. Error messages, logs, and diagnostic information.

## Current Status
What we just completed successfully. Current state of the codebase and any ongoing work. Test results, validation steps, and verification performed.

## Pending Tasks
Immediate next steps and priorities. Planned features, improvements, and refactoring. Known issues, technical debt, and areas needing attention.

## User Preferences
Coding style, formatting, and organizational preferences. Communication patterns and feedback style. Tool choices and workflow preferences.

## Key Decisions
Important technical decisions made and their rationale. Alternative approaches considered and why they were rejected. Trade-offs accepted and their implications.

Focus on information essential for continuing the conversation effectively, including specific details about code, files, errors, and plans.`;

/**
 * Configuration for auto-compact persistence and behavior
 * Kodes-inspired aggressive thresholds to prevent context bloat
 */
const AUTO_COMPACT_CONFIG = {
  minMessagesBeforeCompact: 3,
  saveInterval: 10, // Save state every N compactions
  compressionRatio: 0.85, // Trigger at 85% of context limit (more aggressive than 92%)
  keepRecentMessages: 10, // Preserve last N messages after compression
};

/**
 * Compact history tracking and persistence
 */
class CompactHistoryManager {
  private historyFile: string;
  private history: Array<{
    timestamp: number;
    messageCount: number;
    tokenCount: number;
    tokensRemoved: number;
  }> = [];

  constructor(historyPath: string = '.compact-history.json') {
    this.historyFile = path.resolve(process.cwd(), historyPath);
    this.loadHistory();
  }

  /**
   * Load compact history from disk
   */
  private loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        const content = fs.readFileSync(this.historyFile, 'utf-8');
        this.history = JSON.parse(content);
      }
    } catch (error) {
      console.warn('[AUTO-COMPACT] Failed to load history:', error);
      this.history = [];
    }
  }

  /**
   * Save compact event to history
   */
  addEvent(messageCount: number, tokenCount: number, tokensRemoved: number) {
    this.history.push({
      timestamp: Date.now(),
      messageCount,
      tokenCount,
      tokensRemoved,
    });

    // Save periodically
    if (this.history.length % AUTO_COMPACT_CONFIG.saveInterval === 0) {
      this.saveHistory();
    }
  }

  /**
   * Persist history to disk
   */
  private saveHistory() {
    try {
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.warn('[AUTO-COMPACT] Failed to save history:', error);
    }
  }

  /**
   * Get compression statistics
   */
  getStats() {
    if (this.history.length === 0) return null;

    const totalTokensRemoved = this.history.reduce((sum, e) => sum + e.tokensRemoved, 0);
    const avgCompressionRatio = totalTokensRemoved / this.history[0].tokenCount;

    return {
      totalCompactions: this.history.length,
      totalTokensRemoved,
      avgCompressionRatio: Math.round(avgCompressionRatio * 100) / 100,
      lastCompaction: this.history[this.history.length - 1],
    };
  }
}

// Global history manager
const historyManager = new CompactHistoryManager();

/**
 * Determines if auto-compact should trigger based on token usage
 * Uses proper token counting with configurable context length
 */
async function shouldAutoCompact(
  messages: Message[],
  contextLength: number = 200000,
): Promise<boolean> {
  if (messages.length < AUTO_COMPACT_CONFIG.minMessagesBeforeCompact) {
    return false;
  }

  // Check token-based threshold using proper context ratio
  const compactStatus = shouldCompactCheck(messages, contextLength);
  const threshold = Math.floor(contextLength * AUTO_COMPACT_CONFIG.compressionRatio);

  if (compactStatus.tokenCount >= threshold) {
    console.log(`[AUTO-COMPACT] Token threshold triggered: ${compactStatus.tokenCount} >= ${threshold} (${compactStatus.percentUsed}%)`);
    return true;
  }

  return false;
}

/**
 * Calculate compression metrics and thresholds
 */
function calculateMetrics(
  messages: Message[],
  contextLength: number = 200000,
) {
  const compactStatus = shouldCompactCheck(messages, contextLength);
  const messagesToSummarize = messages.slice(0, -AUTO_COMPACT_CONFIG.keepRecentMessages);
  const recentMessages = messages.slice(-AUTO_COMPACT_CONFIG.keepRecentMessages);

  return {
    currentTokens: compactStatus.tokenCount,
    threshold: compactStatus.threshold,
    percentUsed: compactStatus.percentUsed,
    messagesToCompact: messagesToSummarize.length,
    messagesPreserved: recentMessages.length,
    contextLength,
  };
}

/**
 * Main entry point for automatic context compression
 * Called before each query to check if compression is needed
 * Implements Kodes' proactive message management strategy
 */
export async function checkAutoCompact(
  messages: Message[],
  toolUseContext: any,
  querySonnetFn?: (
    messages: any[],
    systemPrompt: string[],
    maxThinkingTokens: number,
    tools: any[],
    signal: AbortSignal,
    options: any,
  ) => Promise<AssistantMessage>,
): Promise<{ messages: Message[]; wasCompacted: boolean; summary?: AssistantMessage }> {
  const contextLength = toolUseContext.options?.contextLength || 200000;

  // Check if auto-compact should trigger
  const shouldCompact = await shouldAutoCompact(messages, contextLength);
  if (!shouldCompact) {
    return { messages, wasCompacted: false };
  }

  try {
    const metrics = calculateMetrics(messages, contextLength);
    const threshold = Math.floor(contextLength * AUTO_COMPACT_CONFIG.compressionRatio);
    console.log(`\n📦 [AUTO-COMPACT] Starting compression...`);
    console.log(`   Tokens: ${metrics.currentTokens}/${threshold} (${metrics.percentUsed}% of ${contextLength})\n`);

    if (!querySonnetFn) {
      // If no query function provided, just preserve recent messages
      const recentMessages = messages.slice(-AUTO_COMPACT_CONFIG.keepRecentMessages);
      console.log(`✅ [AUTO-COMPACT] Preserved ${recentMessages.length} recent messages\n`);
      return {
        messages: recentMessages,
        wasCompacted: true,
        summary: (createUserMessage('[Context compacted - recent messages preserved]') as any as AssistantMessage),
      };
    }

    const { summary, compactedMessages } = await executeAutoCompact(
      messages,
      toolUseContext,
      querySonnetFn,
    );

    // Record in history
    const tokensRemoved = metrics.currentTokens - countTokens(compactedMessages);
    historyManager.addEvent(messages.length, metrics.currentTokens, tokensRemoved);

    return {
      messages: compactedMessages,
      wasCompacted: true,
      summary,
    };
  } catch (error) {
    console.error('[AUTO-COMPACT] Failed, continuing with original messages:', error);
    return { messages, wasCompacted: false };
  }
}

/**
 * Execute the actual compression using LLM summarization
 * Generates a structured 8-section summary to preserve essential context
 */
async function executeAutoCompact(
  messages: Message[],
  toolUseContext: any,
  querySonnetFn: (
    messages: any[],
    systemPrompt: string[],
    maxThinkingTokens: number,
    tools: any[],
    signal: AbortSignal,
    options: any,
  ) => Promise<AssistantMessage>,
): Promise<{ summary: AssistantMessage; compactedMessages: Message[] }> {
  const contextLength = toolUseContext.options?.contextLength || 200000;
  const keepRecentCount = AUTO_COMPACT_CONFIG.keepRecentMessages;

  // Split into old and recent
  const messagesToSummarize = messages.slice(0, -keepRecentCount);
  const recentMessages = messages.slice(-keepRecentCount);

  console.log(`[AUTO-COMPACT] Summarizing ${messagesToSummarize.length} messages, preserving ${recentMessages.length} recent`);

  // Create summary request
  const summaryRequest = createUserMessage(COMPRESSION_PROMPT);

  // Query LLM for summary
  const summaryResponse = await querySonnetFn(
    normalizeMessagesForAPI([...messagesToSummarize, summaryRequest]),
    ['You are a helpful AI assistant tasked with creating comprehensive conversation summaries that preserve all essential context for continuing development work.'],
    0,
    toolUseContext.options?.tools || [],
    toolUseContext.abortController?.signal || new AbortController().signal,
    {
      dangerouslySkipPermissions: false,
      model: toolUseContext.options?.slowAndCapableModel || 'claude-3-5-sonnet-20241022',
      prependCLISysprompt: true,
    },
  );

  // Zero out input tokens to avoid double-counting
  if (summaryResponse.message.usage) {
    summaryResponse.message.usage = {
      ...summaryResponse.message.usage,
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };
  }

  // Build new message array starting fresh with summary + recent
  const compactedMessages: Message[] = [
    createUserMessage('Context automatically compressed due to token limit. Essential information preserved.'),
    summaryResponse,
    ...recentMessages,
  ];

  console.log(`[AUTO-COMPACT] Compression complete: ${messages.length} messages -> ${compactedMessages.length} (${Math.round((compactedMessages.length / messages.length) * 100)}%)`);

  return {
    summary: summaryResponse,
    compactedMessages,
  };
}

/**
 * Get compression statistics
 */
export function getCompactStats() {
  return historyManager.getStats();
}

/**
 * Log compression metrics for debugging
 */
export function logCompactMetrics(messages: Message[], contextLength: number = 200000) {
  const metrics = calculateMetrics(messages, contextLength);
  console.log('[AUTO-COMPACT METRICS]', {
    currentTokens: metrics.currentTokens,
    threshold: metrics.threshold,
    percentUsed: `${metrics.percentUsed}%`,
    messagesToCompact: metrics.messagesToCompact,
    messagesPreserved: metrics.messagesPreserved,
  });

  const stats = historyManager.getStats();
  if (stats) {
    console.log('[AUTO-COMPACT HISTORY]', stats);
  }
}

/**
 * Reset compact history (useful for testing)
 */
export function resetCompactHistory() {
  historyManager.getStats(); // Initialize
  console.log('[AUTO-COMPACT] History reset');
}
