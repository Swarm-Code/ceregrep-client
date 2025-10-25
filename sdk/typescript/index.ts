/**
 * TypeScript SDK for Scout Agent Framework
 * STATELESS VERSION - Matches Claude Code's architecture
 *
 * Key principles:
 * 1. SDK does NOT maintain message history
 * 2. Messages are passed as parameters to every query
 * 3. UI owns all state management
 * 4. No internal message accumulation
 */

import { Tool } from '../../core/tool.js';
import { Message, createUserMessage } from '../../core/messages.js';
import { query as agentQuery } from '../../core/agent.js';
import { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs';
import { getTools } from '../../tools/index.js';
import { getConfig } from '../../config/loader.js';
import { querySonnet, formatSystemPromptWithContext } from '../../llm/router.js';
import { shouldCompact, countTokens, getTokenStats } from '../../core/tokens.js';
import { checkAutoCompact } from '../../utils/autoCompactCore.js';

export interface QueryOptions {
  model?: string;
  apiKey?: string;
  tools?: Tool[];
  maxThinkingTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  dangerouslySkipPermissions?: boolean;
  enableThinking?: boolean;
  ultrathinkMode?: boolean;
  abortController?: AbortController;
  systemPrompt?: string[];
}

export interface QueryResult {
  messages: Message[];
}

export interface StreamQueryResult {
  messages: AsyncGenerator<Message, void>;
}

/**
 * Scout Client - STATELESS implementation
 * Matches Claude Code's architecture where the SDK doesn't maintain state
 */
export class ScoutClient {
  private config = getConfig();
  private tools: Tool[] = [];
  private model: string;
  private initialized: boolean = false;

  constructor(options: QueryOptions = {}) {
    this.model = options.model || this.config.model || 'claude-sonnet-4-20250514';
  }

  /**
   * Initialize client (load tools)
   * MEMOIZED: Tools are loaded once and cached for the entire client instance
   */
  async initialize() {
    if (this.initialized && this.tools.length > 0) {
      return; // Already initialized
    }

    // Load MCP tools but NOT agent tools
    this.tools = await getTools(true, false);
    this.initialized = true;
  }

  /**
   * Query the agent with existing messages and a new prompt
   * STATELESS: Receives full message history as parameter
   *
   * @param messages - Existing conversation messages (owned by UI)
   * @param prompt - New user input to add
   * @param options - Query options
   */
  async query(
    messages: Message[],
    prompt: string | ContentBlockParam[],
    options: QueryOptions = {}
  ): Promise<QueryResult> {
    // Ensure tools are initialized
    await this.initialize();

    // Use client tools unless explicitly overridden
    const tools = options.tools || this.tools;
    const model = options.model || this.model;
    const apiKey = options.apiKey || this.config.apiKey;

    // Create user message for the new prompt
    const userMessage = createUserMessage(prompt);

    // Build the complete message array for this query
    // This matches Claude Code's pattern of [...messages, newUserMessage]
    const messagesForQuery = [...messages, userMessage];

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
      'IMPORTANT - USE TOOLS WHEN NEEDED:',
      '- Use grep or bash tools to search for specific information when asked about code.',
      '- For general explanations or high-level overviews, you can provide answers based on what you discover.',
      '- Once you have gathered sufficient information, provide a comprehensive answer.',
      '- Avoid excessive tool usage - gather what you need, then synthesize and respond.',
      '- If asked for specific code or files, use tools to verify current state.',
      '- Balance thoroughness with efficiency - do not search indefinitely.',
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
      return true; // In SDK mode, default to auto-approve
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

    // Execute query and collect all messages
    const queryMessages: Message[] = [];
    for await (const message of agentQuery(
      messagesForQuery,
      systemPrompt,
      context,
      canUseTool,
      toolContext,
      querySonnet,
      formatSystemPromptWithContext,
    )) {
      queryMessages.push(message);
    }

    // Return ONLY the new messages from this query
    // The UI will append these to its existing conversation
    return {
      messages: queryMessages,
    };
  }

  /**
   * Query the agent with streaming message output
   * STATELESS: Receives full message history as parameter
   *
   * @param messages - Existing conversation messages (owned by UI)
   * @param prompt - New user input to add
   * @param options - Query options
   */
  async* queryStream(
    messages: Message[],
    prompt: string | ContentBlockParam[],
    options: QueryOptions = {}
  ): AsyncGenerator<Message, void> {
    // Ensure tools are initialized
    await this.initialize();

    // Use client tools unless explicitly overridden
    const tools = options.tools || this.tools;
    const model = options.model || this.model;
    const apiKey = options.apiKey || this.config.apiKey;

    // Create user message for the new prompt
    const userMessage = createUserMessage(prompt);

    // Build the complete message array for this query
    // This matches Claude Code's pattern of [...messages, newUserMessage]
    const messagesForQuery = [...messages, userMessage];

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
      'IMPORTANT - USE TOOLS WHEN NEEDED:',
      '- Use grep or bash tools to search for specific information when asked about code.',
      '- For general explanations or high-level overviews, you can provide answers based on what you discover.',
      '- Once you have gathered sufficient information, provide a comprehensive answer.',
      '- Avoid excessive tool usage - gather what you need, then synthesize and respond.',
      '- If asked for specific code or files, use tools to verify current state.',
      '- Balance thoroughness with efficiency - do not search indefinitely.',
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

    // First yield the user message so UI can display it immediately
    yield userMessage;

    // Execute query and stream messages in real-time
    for await (const message of agentQuery(
      messagesForQuery,
      systemPrompt,
      context,
      canUseTool,
      toolContext,
      querySonnet,
      formatSystemPromptWithContext,
    )) {
      // Yield each message as it comes
      // The UI will collect and append these to its conversation
      yield message;
    }
  }

  /**
   * Compact a conversation (UI-initiated) - FOLLOWS CLAUDE CODE PATTERN
   * Generates a summary and returns ONLY the summary messages
   * The UI should clear its history and use these new messages
   *
   * @param messages - Current conversation to compact
   * @returns New messages containing just the compact command and summary
   */
  async compactConversation(
    messages: Message[]
  ): Promise<Message[]> {
    // If there are very few messages, don't compact
    if (messages.length < 10) {
      return messages;
    }

    // Create summary request - EXACT same prompt as Claude Code
    const summaryPrompt =
      "Provide a detailed but concise summary of our conversation above. " +
      "Focus on information that would be helpful for continuing the conversation, " +
      "including what we did, what we're doing, which files we're working on, " +
      "and what we're going to do next.";

    // Generate summary using a separate query
    const summaryMessages: Message[] = [];

    for await (const message of this.queryStream(messages, summaryPrompt, {
      systemPrompt: ['You are a helpful AI assistant tasked with summarizing conversations.'],
      model: this.model,
      dangerouslySkipPermissions: true,
    })) {
      summaryMessages.push(message);
    }

    // Extract the summary from the response
    const assistantMessage = summaryMessages.find(m => m.type === 'assistant');
    if (!assistantMessage) {
      throw new Error('Failed to generate conversation summary - no assistant response');
    }

    // Return new conversation with ONLY the compact command and summary
    // This exactly matches Claude Code's approach
    return [
      createUserMessage('Use the /compact command to clear the conversation history, and start a new conversation with the summary in context.'),
      assistantMessage,
    ];
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

// Export the stateless client as the default
export { ScoutClient as CeregrepClient };