/**
 * TypeScript SDK for Ceregrep Agent Framework
 * Provides programmatic access to the agent
 */

import { Tool } from '../../core/tool.js';
import { Message, createUserMessage } from '../../core/messages.js';
import { query as agentQuery, compact as agentCompact } from '../../core/agent.js';
import { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs';
import { getTools } from '../../tools/index.js';
import { getConfig } from '../../config/loader.js';
import { querySonnet, formatSystemPromptWithContext } from '../../llm/router.js';
import { shouldCompact, countTokens, getTokenStats } from '../../core/tokens.js';

export interface QueryOptions {
  model?: string;
  apiKey?: string;
  tools?: Tool[];
  maxThinkingTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  dangerouslySkipPermissions?: boolean;
  compactionThreshold?: number; // Token threshold for auto-compaction (default 100k)
  enableThinking?: boolean; // Enable extended thinking mode
  ultrathinkMode?: boolean; // Enable ultrathink mode (more tokens)
  abortController?: AbortController; // Optional abort controller for cancellation
  systemPrompt?: string[]; // Custom system prompt (overrides default)
}

export interface QueryResult {
  messages: Message[];
}

export interface StreamQueryResult {
  messages: AsyncGenerator<Message, void>;
}

/**
 * Ceregrep Client for programmatic agent invocation
 */
export class CeregrepClient {
  private config = getConfig();
  private messages: Message[] = [];
  private tools: Tool[] = [];
  private model: string;

  constructor(options: QueryOptions = {}) {
    this.model = options.model || this.config.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Initialize client (load tools)
   */
  async initialize() {
    this.tools = await getTools(true);
  }

  /**
   * Query the agent with a prompt
   */
  async query(prompt: string | ContentBlockParam[], options: QueryOptions = {}): Promise<QueryResult> {
    if (this.tools.length === 0) {
      await this.initialize();
    }

    const tools = options.tools || this.tools;
    const model = options.model || this.model;
    const apiKey = options.apiKey || this.config.apiKey;
    const compactionThreshold = options.compactionThreshold || this.config.compactionThreshold || 100000;

    // Silently compact if needed (no messages to AI to avoid lazy behavior)
    if (shouldCompact(this.messages, compactionThreshold)) {
      if (options.debug) {
        const stats = getTokenStats(this.messages);
        console.log(`[CEREGREP DEBUG] Auto-compacting conversation (${stats.total} tokens >= ${compactionThreshold})`);
      }
      await this.compact();
      if (options.debug) {
        const newStats = getTokenStats(this.messages);
        console.log(`[CEREGREP DEBUG] Compaction complete (reduced tokens: ${newStats.total})`);
      }
    }

    // Create user message
    const userMessage = createUserMessage(prompt);
    this.messages.push(userMessage);

    // System prompt (use custom if provided, otherwise default)
    const systemPrompt = options.systemPrompt || [
      'You are a helpful AI assistant with access to bash and file search tools.',
      'Use the tools available to help the user accomplish their tasks.',
      '',
      'CRITICAL INSTRUCTION - CONTEXT AND EXPLANATION REQUIREMENTS:',
      '- Give as much context as possible in your responses. It is ALWAYS better to add too much context than too little.',
      '- Use file references with line numbers in the format: filename.ts:123 or path/to/file.py:456',
      '- Explain everything in an ultra explanatory tone, assuming the user needs complete understanding.',
      '- Include specific details: function names, variable names, code snippets, file paths with line numbers.',
      '- When referencing code, ALWAYS include the file path and line number where it can be found.',
      '- Provide thorough explanations of how things work, why they work that way, and what each piece does.',
      '- Word for word: "Better to add too much context than necessary" - follow this principle strictly.',
      '',
      'CRITICAL INSTRUCTION - MUST USE TOOLS TO GATHER INFORMATION:',
      '- You MUST use grep to search for information before answering questions about code.',
      '- You CANNOT rely on stored context or prior knowledge about the codebase.',
      '- Everything must be read using tools before giving an explanation.',
      '- This is to ensure that you do not lazily answer questions without verifying current state.',
      '- Always grep for relevant files, read the actual code, and then provide your explanation.',
      '- Never answer based solely on assumptions or memory - always verify with tools first.',
    ];

    // Context
    const context = {
      cwd: process.cwd(),
      date: new Date().toISOString(),
    };

    // Permission checker (auto-approve for SDK usage unless specified)
    const canUseTool = async (toolName: string, input: any) => {
      if (options.dangerouslySkipPermissions) {
        return true;
      }
      // In SDK mode, default to auto-approve
      return true;
    };

    // Tool context
    const toolContext = {
      options: {
        tools,
        verbose: options.verbose || false,
        debug: options.debug || false,
        slowAndCapableModel: model,
        maxThinkingTokens: options.maxThinkingTokens || 0,
        enableThinking: options.enableThinking || false,
        ultrathinkMode: options.ultrathinkMode || false,
        dangerouslySkipPermissions: options.dangerouslySkipPermissions || false,
        commands: [],
        forkNumber: 0,
        messageLogName: 'sdk-query',
      },
      abortController: options.abortController || new AbortController(),
      readFileTimestamps: {},
    };

    // Execute query (pass a copy to avoid mutation issues)
    const queryMessages: Message[] = [];
    const messagesCopy = [...this.messages];
    for await (const message of agentQuery(
      messagesCopy,
      systemPrompt,
      context,
      canUseTool,
      toolContext,
      querySonnet,
      formatSystemPromptWithContext,
    )) {
      queryMessages.push(message);
    }

    // Add all new messages to history after completion
    this.messages.push(...queryMessages);

    return {
      messages: queryMessages,
    };
  }

  /**
   * Query the agent with streaming message output
   * Yields messages in real-time as they are generated
   */
  async* queryStream(prompt: string | ContentBlockParam[], options: QueryOptions = {}): AsyncGenerator<Message, void> {
    if (this.tools.length === 0) {
      await this.initialize();
    }

    const tools = options.tools || this.tools;
    const model = options.model || this.model;
    const apiKey = options.apiKey || this.config.apiKey;
    const compactionThreshold = options.compactionThreshold || this.config.compactionThreshold || 100000;

    // Silently compact if needed (no messages to AI to avoid lazy behavior)
    if (shouldCompact(this.messages, compactionThreshold)) {
      if (options.debug) {
        const stats = getTokenStats(this.messages);
        console.log(`[CEREGREP DEBUG] Auto-compacting conversation (${stats.total} tokens >= ${compactionThreshold})`);
      }
      await this.compact();
      if (options.debug) {
        const newStats = getTokenStats(this.messages);
        console.log(`[CEREGREP DEBUG] Compaction complete (reduced tokens: ${newStats.total})`);
      }
    }

    // Create user message
    const userMessage = createUserMessage(prompt);
    this.messages.push(userMessage);

    // System prompt (use custom if provided, otherwise default)
    const systemPrompt = options.systemPrompt || [
      'You are a helpful AI assistant with access to bash and file search tools.',
      'Use the tools available to help the user accomplish their tasks.',
      '',
      'CRITICAL INSTRUCTION - CONTEXT AND EXPLANATION REQUIREMENTS:',
      '- Give as much context as possible in your responses. It is ALWAYS better to add too much context than too little.',
      '- Use file references with line numbers in the format: filename.ts:123 or path/to/file.py:456',
      '- Explain everything in an ultra explanatory tone, assuming the user needs complete understanding.',
      '- Include specific details: function names, variable names, code snippets, file paths with line numbers.',
      '- When referencing code, ALWAYS include the file path and line number where it can be found.',
      '- Provide thorough explanations of how things work, why they work that way, and what each piece does.',
      '- Word for word: "Better to add too much context than necessary" - follow this principle strictly.',
      '',
      'CRITICAL INSTRUCTION - MUST USE TOOLS TO GATHER INFORMATION:',
      '- You MUST use grep to search for information before answering questions about code.',
      '- You CANNOT rely on stored context or prior knowledge about the codebase.',
      '- Everything must be read using tools before giving an explanation.',
      '- This is to ensure that you do not lazily answer questions without verifying current state.',
      '- Always grep for relevant files, read the actual code, and then provide your explanation.',
      '- Never answer based solely on assumptions or memory - always verify with tools first.',
    ];

    // Context
    const context = {
      cwd: process.cwd(),
      date: new Date().toISOString(),
    };

    // Permission checker
    const canUseTool = async (toolName: string, input: any) => {
      if (options.dangerouslySkipPermissions) {
        return true;
      }
      return true;
    };

    // Tool context
    const toolContext = {
      options: {
        tools,
        verbose: options.verbose || false,
        debug: options.debug || false,
        slowAndCapableModel: model,
        maxThinkingTokens: options.maxThinkingTokens || 0,
        enableThinking: options.enableThinking || false,
        ultrathinkMode: options.ultrathinkMode || false,
        dangerouslySkipPermissions: options.dangerouslySkipPermissions || false,
        commands: [],
        forkNumber: 0,
        messageLogName: 'sdk-query-stream',
      },
      abortController: options.abortController || new AbortController(),
      readFileTimestamps: {},
    };

    // Execute query and yield messages in real-time (pass a copy to avoid mutation issues)
    const messagesCopy = [...this.messages];
    for await (const message of agentQuery(
      messagesCopy,
      systemPrompt,
      context,
      canUseTool,
      toolContext,
      querySonnet,
      formatSystemPromptWithContext,
    )) {
      // Add message to history in real-time so getHistory() returns current state
      this.messages.push(message);
      yield message;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): Message[] {
    return [...this.messages];
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.messages = [];
  }

  /**
   * Compact conversation history (summarize with LLM)
   * Keeps recent messages and summarizes older context
   */
  async compact(keepRecentCount?: number) {
    const count = keepRecentCount || this.config.compactionKeepRecentCount || 10;
    const result = await agentCompact(
      this.messages,
      this.tools,
      querySonnet,
      this.model,
      new AbortController().signal,
      count,
    );

    // Replace messages with: [summary, ...recent messages]
    this.messages = [result.summary, ...result.recentMessages];
  }

  /**
   * Set tools for agent
   */
  setTools(tools: Tool[]) {
    this.tools = tools;
  }

  /**
   * Set model
   */
  setModel(model: string) {
    this.model = model;
  }
}
