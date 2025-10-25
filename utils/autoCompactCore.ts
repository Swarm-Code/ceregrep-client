/**
 * Automatic context compression system - Kodes implementation
 * Intelligently compresses conversation history when approaching context limits
 * Preserves all critical information while reducing token consumption
 */

import { Message, UserMessage, AssistantMessage, createUserMessage, normalizeMessagesForAPI } from '../core/messages.js';
import { countTokens, shouldCompact as shouldCompactCheck } from '../core/tokens.js';
import { extractAllSections, mergeSections } from './autoCompactSections.js';
import fs from 'fs';
import path from 'path';

/**
 * Enhanced granular compression prompt for maximum context preservation
 * Extracts extremely detailed technical information in 12+ sections
 * Designed for accurate continuation of development work
 */
const COMPRESSION_PROMPT = `CRITICAL INSTRUCTION: Create an EXTREMELY DETAILED and GRANULAR summary of our conversation.

You MUST include specific file paths, line numbers, function names, variable names, and code snippets.
It is ALWAYS better to include too much detail than too little.
NEVER generalize or abstract away important information.

## 1. Technical Architecture & Environment
- Development environment: OS, runtime, Node version
- Technology stack: All languages, frameworks, libraries, versions
- Project structure: Directory tree, file organization
- Key configuration files: tsconfig.json, package.json, docker configs, etc.
- Build system: Compiler settings, build commands, output locations
- Deployment targets: Where code runs, environment variables needed

## 2. Codebase Structure & Organization
- Core modules and their purposes
- File dependencies and import relationships
- Module entry points and public APIs
- Design patterns used throughout
- Naming conventions and standards
- Folder organization and logical grouping

## 3. Implemented Features & Components
- Each component built: name, location, purpose, exports
- Data structures created: interfaces, types, schemas
- Functions implemented: signatures, parameters, return types
- Classes and their methods: visibility, inheritance
- Hooks and utilities: how they're used, what they depend on

## 4. Code Changes & Modifications
- Files created: path, purpose, initial structure
- Files modified: specific file paths, line numbers, what changed
- Code deleted: what was removed and why
- Refactoring performed: from what to what
- Include actual code snippets for major changes (50-200 lines of important code)
- Version numbers and compatibility concerns

## 5. API Endpoints & Route Definitions
- All endpoints: method, path, parameters, response format
- Request/response examples: actual JSON structures
- Authentication/authorization mechanisms
- Rate limits and constraints
- Error codes and error handling

## 6. Database & Data Models
- Tables/collections: names, schema, relationships
- Key fields: types, constraints, indexes
- Data migration notes: versions, changes
- Query patterns: common operations and patterns

## 7. Debugging & Error Resolution
- All errors encountered: error messages (exact text), stack traces
- Root causes: what was wrong and why
- Solutions applied: exact steps taken
- Files affected by bugs: specific line numbers
- Performance issues: metrics before/after
- Incomplete or failed attempts: why they didn't work

## 8. Test Coverage & Validation
- Tests written: describe what they test
- Test results: pass/fail status, coverage percentage
- Validation performed: manual checks, automated testing
- Known failing tests: which ones, why they fail
- Edge cases identified: what scenarios need attention

## 9. Performance & Metrics
- Token counts: conversation tokens, context usage
- Build times: before/after measurements
- Runtime performance: slow operations identified
- Memory usage: if discussed
- Optimization opportunities: what could be faster

## 10. Current Implementation Status
- What works: fully implemented features with all details
- What's incomplete: partial implementations, what's missing
- What's broken: bugs found, not yet fixed
- Current git status: what files are modified
- Next compilation/build result: errors or warnings

## 11. Dependencies & Integrations
- External libraries used: names, versions, why
- API integrations: which APIs, endpoints, credentials needed
- Third-party services: which ones, integration points
- Custom integrations: internal service connections

## 12. User Requirements & Preferences
- User's coding style: formatting, indentation, naming
- Architecture preferences: patterns they like/dislike
- Optimization priorities: speed vs. clarity vs. features
- Communication style: how detailed should responses be
- Tool preferences: which tools to use, avoid

## 13. Important Context & History
- Why specific decisions were made: full rationale
- Alternatives considered: what else was tried
- Trade-offs accepted: what was sacrificed for what
- Lessons learned: mistakes to avoid
- Previous iterations: what changed and why

## 14. Continuation Instructions
- Exact next steps: what needs to happen immediately
- Prerequisite work: what must be done first
- Dependencies: what other features need first
- Testing requirements: how to verify the work
- File locations to focus on: which files matter most

## OUTPUT FORMAT:
Use clear markdown formatting with headers, bullet points, and code blocks.
For code snippets, include file path and line numbers in the format: filename.ts:123
For complex logic, show before/after code comparisons.
Include token counts and context window status.

Remember: Include specific details, file paths, line numbers, and code snippets.
A summary that's 30% too detailed is better than one that's 10% too vague.`;

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

  // Extract all sections in parallel for maximum efficiency
  const sections = await extractAllSections(
    normalizeMessagesForAPI(messagesToSummarize),
    querySonnetFn,
    {
      dangerouslySkipPermissions: false,
      model: toolUseContext.options?.slowAndCapableModel || 'claude-3-5-sonnet-20241022',
      prependCLISysprompt: true,
      tools: toolUseContext.options?.tools || [],
      signal: toolUseContext.abortController?.signal || new AbortController().signal,
    },
  );

  // Merge all sections into a single comprehensive summary
  const mergedSummaryText = mergeSections(sections);

  // Create summary response message
  const summaryResponse: AssistantMessage = {
    type: 'assistant',
    message: {
      id: Math.random().toString(36).substring(7),
      model: toolUseContext.options?.slowAndCapableModel || 'claude-3-5-sonnet-20241022',
      role: 'assistant',
      stop_reason: 'end_turn',
      stop_sequence: null,
      type: 'message',
      content: [
        {
          type: 'text' as const,
          text: mergedSummaryText,
          citations: [],
        },
      ],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: null,
        server_tool_use: null,
        service_tier: null,
      },
    },
    costUSD: 0,
    durationMs: 0,
    uuid: Math.random().toString(36).substring(7) as any,
  };

  // Build new message array starting fresh with summary + recent
  const compactedMessages: Message[] = [
    createUserMessage('Context automatically compressed due to token limit. Essential information preserved with 8 parallel extraction sections.'),
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
