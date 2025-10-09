/**
 * TypeScript SDK for Ceregrep Agent Framework
 * Provides programmatic access to the agent
 */

import { Tool } from '../../core/tool.js';
import { Message, createUserMessage } from '../../core/messages.js';
import { query as agentQuery, compact as agentCompact } from '../../core/agent.js';
import { getTools } from '../../tools/index.js';
import { getConfig } from '../../config/loader.js';
import { querySonnet, formatSystemPromptWithContext } from '../../llm/router.js';

export interface QueryOptions {
  model?: string;
  apiKey?: string;
  tools?: Tool[];
  maxThinkingTokens?: number;
  verbose?: boolean;
  debug?: boolean;
  dangerouslySkipPermissions?: boolean;
}

export interface QueryResult {
  messages: Message[];
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
  async query(prompt: string, options: QueryOptions = {}): Promise<QueryResult> {
    if (this.tools.length === 0) {
      await this.initialize();
    }

    const tools = options.tools || this.tools;
    const model = options.model || this.model;
    const apiKey = options.apiKey || this.config.apiKey;

    // Create user message
    const userMessage = createUserMessage(prompt);
    this.messages.push(userMessage);

    // Simple system prompt
    const systemPrompt = [
      'You are a helpful AI assistant with access to bash and file search tools.',
      'Use the tools available to help the user accomplish their tasks.',
      'Be concise and direct in your responses.',
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
        dangerouslySkipPermissions: options.dangerouslySkipPermissions || false,
        commands: [],
        forkNumber: 0,
        messageLogName: 'sdk-query',
      },
      abortController: new AbortController(),
      readFileTimestamps: {},
    };

    // Execute query
    const queryMessages: Message[] = [];
    for await (const message of agentQuery(
      this.messages,
      systemPrompt,
      context,
      canUseTool,
      toolContext,
      querySonnet,
      formatSystemPromptWithContext,
    )) {
      queryMessages.push(message);
      this.messages.push(message);
    }

    return {
      messages: queryMessages,
    };
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
   */
  async compact() {
    const result = await agentCompact(
      this.messages,
      this.tools,
      querySonnet,
      this.model,
      new AbortController().signal,
    );

    this.messages = [result.summary];
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
