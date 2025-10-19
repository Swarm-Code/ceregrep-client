/**
 * Core agent execution loop for Ceregrep Framework
 * Recursive query loop that handles tool execution and LLM interaction
 * Headless version - no UI/React dependencies
 */

import { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs';
import { Tool, ToolContext } from './tool.js';
import {
  Message,
  UserMessage,
  AssistantMessage,
  createAssistantMessage,
  createUserMessage,
  normalizeMessagesForAPI,
  extractToolUseBlocks,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
} from './messages.js';
import { countTokens, shouldCompact } from './tokens.js';

export type CanUseToolFn = (
  toolName: string,
  input: Record<string, any>,
  shouldSkipPermissionCheck?: boolean,
) => Promise<boolean>;

/**
 * Main agent query loop
 * Recursively executes until conversation completes (no more tool calls)
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt array (will be formatted with context)
 * @param context - Environment context (cwd, git status, etc.)
 * @param canUseTool - Permission checker function
 * @param toolUseContext - Tool execution context
 * @param querySonnetFn - LLM query function (injected for modularity)
 * @returns AsyncGenerator yielding messages as they're created
 */
export async function* query(
  messages: Message[],
  systemPrompt: string[],
  context: { [k: string]: string },
  canUseTool: CanUseToolFn,
  toolUseContext: ToolContext,
  querySonnetFn: (
    messages: any[],
    systemPrompt: string[],
    maxThinkingTokens: number,
    tools: Tool[],
    signal: AbortSignal,
    options: any,
  ) => Promise<AssistantMessage>,
  formatSystemPromptFn: (
    systemPrompt: string[],
    context: { [k: string]: string },
  ) => string[],
): AsyncGenerator<Message, void> {
  const fullSystemPrompt = formatSystemPromptFn(systemPrompt, context);

  // Check token count before query (debug only, no warnings to AI)
  if (toolUseContext.options.debug) {
    const currentTokens = countTokens(messages);
    console.log('[AGENT] Starting query with:', {
      messageCount: messages.length,
      systemPromptLength: fullSystemPrompt.length,
      toolCount: toolUseContext.options.tools?.length || 0,
      toolNames: toolUseContext.options.tools?.map(t => t.name) || [],
      currentTokens,
    });
  }

  // Query LLM
  const assistantMessage = await querySonnetFn(
    normalizeMessagesForAPI(messages),
    fullSystemPrompt,
    toolUseContext.options.maxThinkingTokens || 0,
    toolUseContext.options.tools || [],
    toolUseContext.abortController.signal,
    {
      dangerouslySkipPermissions: toolUseContext.options.dangerouslySkipPermissions ?? false,
      model: toolUseContext.options.slowAndCapableModel,
      prependCLISysprompt: true,
      enableThinking: (toolUseContext.options as any).enableThinking ?? false,
      ultrathinkMode: (toolUseContext.options as any).ultrathinkMode ?? false,
    },
  );

  if (toolUseContext.abortController.signal.aborted) {
    yield createAssistantMessage(INTERRUPT_MESSAGE);
    return;
  }

  yield assistantMessage;

  // Extract tool use blocks
  const toolUseMessages = extractToolUseBlocks(assistantMessage);

  if (toolUseContext.options.debug) {
    console.log('[AGENT] Tool use blocks found:', toolUseMessages.length);
    toolUseMessages.forEach(tu => console.log('  -', tu.name));
  }

  // If no tool use, conversation is complete
  if (!toolUseMessages.length) {
    if (toolUseContext.options.debug) {
      console.log('[AGENT] No tool use found, conversation complete');
    }
    return;
  }

  const toolResults: UserMessage[] = [];

  // Execute tools
  // TODO: Add concurrent execution for read-only tools
  for await (const message of runToolsSerially(
    toolUseMessages,
    assistantMessage,
    canUseTool,
    toolUseContext,
    false, // shouldSkipPermissionCheck
  )) {
    yield message;
    if (message.type === 'user') {
      toolResults.push(message);
    }
  }

  if (toolUseContext.abortController.signal.aborted) {
    yield createAssistantMessage(INTERRUPT_MESSAGE_FOR_TOOL_USE);
    return;
  }

  // Sort tool results to match order of tool use messages
  const orderedToolResults = toolResults.sort((a, b) => {
    const aContent = Array.isArray(a.message.content) ? a.message.content[0] : null;
    const bContent = Array.isArray(b.message.content) ? b.message.content[0] : null;
    const aIndex = toolUseMessages.findIndex(
      tu => tu.id === (aContent as any)?.tool_use_id,
    );
    const bIndex = toolUseMessages.findIndex(
      tu => tu.id === (bContent as any)?.tool_use_id,
    );
    return aIndex - bIndex;
  });

  // Recursive call with tool results
  yield* await query(
    [...messages, assistantMessage, ...orderedToolResults],
    systemPrompt,
    context,
    canUseTool,
    toolUseContext,
    querySonnetFn,
    formatSystemPromptFn,
  );
}

/**
 * Execute tools serially (one at a time)
 */
async function* runToolsSerially(
  toolUseMessages: ToolUseBlock[],
  assistantMessage: AssistantMessage,
  canUseTool: CanUseToolFn,
  toolUseContext: ToolContext,
  shouldSkipPermissionCheck: boolean,
): AsyncGenerator<Message, void> {
  for (const toolUseMessage of toolUseMessages) {
    if (toolUseContext.options.debug) {
      console.log('[AGENT] Executing tool:', toolUseMessage.name);
    }

    const tool = toolUseContext.options.tools?.find(t => t.name === toolUseMessage.name);

    if (!tool) {
      console.error(`[AGENT] Tool not found: ${toolUseMessage.name}`);
      yield createUserMessage([
        {
          type: 'tool_result',
          tool_use_id: toolUseMessage.id,
          content: `Error: Tool "${toolUseMessage.name}" not found`,
          is_error: true,
        },
      ]);
      continue;
    }

    // Check permissions
    const hasPermission =
      shouldSkipPermissionCheck ||
      (await canUseTool(tool.name, toolUseMessage.input as Record<string, any>, shouldSkipPermissionCheck));

    if (!hasPermission) {
      console.log(`[AGENT] Permission denied for tool: ${tool.name}`);
      yield createUserMessage([
        {
          type: 'tool_result',
          tool_use_id: toolUseMessage.id,
          content: 'Permission denied by user',
          is_error: true,
        },
      ]);
      continue;
    }

    // Execute tool
    try {
      if (!tool.call) {
        throw new Error(`Tool ${tool.name} does not have a call method`);
      }

      // Execute tool and collect results
      let lastResult: any = null;
      for await (const result of tool.call(toolUseMessage.input, toolUseContext, canUseTool)) {
        if (result.type === 'result') {
          lastResult = result;
        }
      }

      if (!lastResult) {
        throw new Error(`Tool ${tool.name} did not return a result`);
      }

      // Format result for assistant
      const resultContent = tool.renderResultForAssistant
        ? tool.renderResultForAssistant(lastResult.data)
        : lastResult.resultForAssistant || JSON.stringify(lastResult.data);

      yield createUserMessage([
        {
          type: 'tool_result',
          tool_use_id: toolUseMessage.id,
          content: typeof resultContent === 'string' ? resultContent : JSON.stringify(resultContent),
          is_error: false,
        },
      ]);
    } catch (error) {
      console.error(`[AGENT] Tool execution error for ${tool.name}:`, error);
      yield createUserMessage([
        {
          type: 'tool_result',
          tool_use_id: toolUseMessage.id,
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          is_error: true,
        },
      ]);
    }
  }
}

/**
 * Compact conversation history by summarizing with LLM
 * Reduces token count while preserving recent context
 *
 * @param messages - Full conversation history
 * @param tools - Available tools
 * @param querySonnetFn - LLM query function
 * @param model - Model to use for summarization
 * @param abortSignal - Abort signal
 * @param keepRecentCount - Number of recent messages to preserve (default 10)
 */
export async function compact(
  messages: Message[],
  tools: Tool[],
  querySonnetFn: (
    messages: any[],
    systemPrompt: string[],
    maxThinkingTokens: number,
    tools: Tool[],
    signal: AbortSignal,
    options: any,
  ) => Promise<AssistantMessage>,
  model: string,
  abortSignal: AbortSignal,
  keepRecentCount: number = 10,
): Promise<{ summary: AssistantMessage; clearedMessages: Message[]; recentMessages: Message[] }> {
  // If not enough messages to compact, return as-is
  if (messages.length <= keepRecentCount) {
    return {
      summary: createAssistantMessage('No compaction needed.'),
      clearedMessages: [],
      recentMessages: messages,
    };
  }

  // Split messages into older (to summarize) and recent (to keep)
  const messagesToSummarize = messages.slice(0, -keepRecentCount);
  const recentMessages = messages.slice(-keepRecentCount);

  // Create summary request
  const summaryRequest = createUserMessage(
    'Provide a detailed but concise summary of the conversation above. ' +
      'Focus on: key decisions made, important context discovered, files analyzed, ' +
      'code patterns identified, and any outstanding tasks. ' +
      'Be specific with file paths, function names, and technical details.',
  );

  // Generate summary from older messages
  const summaryResponse = await querySonnetFn(
    normalizeMessagesForAPI([...messagesToSummarize, summaryRequest]),
    ['You are a helpful AI assistant tasked with summarizing technical conversations. ' +
     'Preserve all technical details, file paths, and specific implementation context.'],
    0,
    tools,
    abortSignal,
    {
      dangerouslySkipPermissions: false,
      model,
      prependCLISysprompt: false,
    },
  );

  return {
    summary: summaryResponse,
    clearedMessages: messagesToSummarize,
    recentMessages,
  };
}
