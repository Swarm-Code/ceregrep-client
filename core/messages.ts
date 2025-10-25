/**
 * Message utilities for Ceregrep Agent Framework
 * Headless version - no UI/React dependencies
 */

import { randomUUID, UUID } from 'crypto';
import {
  Message as APIMessage,
  MessageParam,
  ContentBlock,
  ContentBlockParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/index.mjs';
import { last } from 'lodash-es';

export type { ToolUseBlock };

export const INTERRUPT_MESSAGE = '[Request interrupted by user]';
export const INTERRUPT_MESSAGE_FOR_TOOL_USE = '[Request interrupted by user for tool use]';
export const CANCEL_MESSAGE =
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.";
export const REJECT_MESSAGE =
  "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file). STOP what you are doing and wait for the user to tell you how to proceed.";
export const NO_RESPONSE_REQUESTED = 'No response requested.';
export const NO_CONTENT_MESSAGE = '[No content]';

export const SYNTHETIC_ASSISTANT_MESSAGES = new Set([
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  CANCEL_MESSAGE,
  REJECT_MESSAGE,
  NO_RESPONSE_REQUESTED,
]);

export type FullToolUseResult = {
  data: unknown;
  resultForAssistant: ToolResultBlockParam['content'];
};

export type UserMessage = {
  message: MessageParam;
  type: 'user';
  uuid: UUID;
  id?: string; // Message ID for conversation navigation
  timestamp?: number; // Message creation timestamp
  toolUseResult?: FullToolUseResult;
  displayContent?: string | ContentBlockParam[];
  // Kodes enhancement: Additional context for specialized use cases
  options?: {
    isKodingRequest?: boolean;
    kodingContext?: string;
    isCustomCommand?: boolean;
    commandName?: string;
    commandArgs?: string;
  };
};

export type AssistantMessage = {
  costUSD: number;
  durationMs: number;
  message: APIMessage & {
    tool_use?: ToolUseBlock[];
  };
  type: 'assistant';
  uuid: UUID;
  id?: string; // Message ID for conversation navigation
  timestamp?: number; // Message creation timestamp
  isApiErrorMessage?: boolean;
};

export type ProgressMessage = {
  content: AssistantMessage;
  normalizedMessages: NormalizedMessage[];
  siblingToolUseIDs: Set<string>;
  tools: any[];
  toolUseID: string;
  type: 'progress';
  uuid: UUID;
};

export type Message = UserMessage | AssistantMessage | ProgressMessage;

export type NormalizedMessage = UserMessage | AssistantMessage;

function baseCreateAssistantMessage(
  content: ContentBlock[],
  extra?: Partial<AssistantMessage>,
): AssistantMessage {
  return {
    type: 'assistant',
    costUSD: 0,
    durationMs: 0,
    uuid: randomUUID(),
    timestamp: Date.now(),
    message: {
      id: randomUUID(),
      model: '<synthetic>',
      role: 'assistant',
      stop_reason: 'stop_sequence',
      stop_sequence: '',
      type: 'message',
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: null,
        server_tool_use: null,
        service_tier: null,
      },
      content,
    },
    ...extra,
  };
}

export function createAssistantMessage(content: string): AssistantMessage {
  return baseCreateAssistantMessage([
    {
      type: 'text' as const,
      text: content === '' ? NO_CONTENT_MESSAGE : content,
      citations: [],
    },
  ]);
}

export function createAssistantAPIErrorMessage(content: string): AssistantMessage {
  return baseCreateAssistantMessage(
    [
      {
        type: 'text' as const,
        text: content === '' ? NO_CONTENT_MESSAGE : content,
        citations: [],
      },
    ],
    { isApiErrorMessage: true },
  );
}

export function createUserMessage(
  content: string | ContentBlockParam[],
  toolUseResult?: FullToolUseResult,
  displayContent?: string | ContentBlockParam[],
  options?: UserMessage['options'],
): UserMessage {
  return {
    type: 'user',
    message: {
      role: 'user',
      content,
    },
    uuid: randomUUID(),
    timestamp: Date.now(),
    toolUseResult,
    displayContent,
    options,
  };
}

export function createProgressMessage(
  toolUseID: string,
  siblingToolUseIDs: Set<string>,
  content: AssistantMessage,
  normalizedMessages: NormalizedMessage[],
  tools: any[],
): ProgressMessage {
  return {
    type: 'progress',
    content,
    normalizedMessages,
    siblingToolUseIDs,
    tools,
    toolUseID,
    uuid: randomUUID(),
  };
}

export function createToolResultStopMessage(toolUseID: string): ToolResultBlockParam {
  return {
    type: 'tool_result',
    content: CANCEL_MESSAGE,
    is_error: true,
    tool_use_id: toolUseID,
  };
}

/**
 * Normalize messages for API consumption
 * Filters out progress messages and consolidates tool results
 */
export function normalizeMessagesForAPI(
  messages: Message[],
): (UserMessage | AssistantMessage)[] {
  const result: (UserMessage | AssistantMessage)[] = [];

  messages
    .filter(_ => _.type !== 'progress')
    .forEach(message => {
      switch (message.type) {
        case 'user': {
          // If the current message is not a tool result, add it to the result
          if (
            !Array.isArray(message.message.content) ||
            message.message.content[0]?.type !== 'tool_result'
          ) {
            result.push(message);
            return;
          }

          // If the last message is not a tool result, add it to the result
          const lastMessage = last(result);
          if (
            !lastMessage ||
            lastMessage.type !== 'user' ||
            !Array.isArray(lastMessage.message.content) ||
            lastMessage.message.content[0]?.type !== 'tool_result'
          ) {
            result.push(message);
            return;
          }

          // Merge tool results
          const mergedContent = [
            ...(Array.isArray(lastMessage.message.content) ? lastMessage.message.content : []),
            ...(Array.isArray(message.message.content) ? message.message.content : []),
          ];

          result[result.length - 1] = {
            ...lastMessage,
            message: {
              ...lastMessage.message,
              content: mergedContent,
            },
          };
          break;
        }
        case 'assistant': {
          result.push(message);
          break;
        }
      }
    });

  return result;
}

/**
 * Extract tool use blocks from assistant message
 */
export function extractToolUseBlocks(message: AssistantMessage): ToolUseBlock[] {
  return [
    ...(message.message.content?.filter(_ => _.type === 'tool_use') || []),
    ...(message.message.tool_use || []),
  ] as ToolUseBlock[];
}

/**
 * Extract text content from assistant message
 */
export function extractTextContent(message: AssistantMessage): string {
  return message.message.content
    .filter(c => c.type === 'text')
    .map(c => (c as any).text)
    .join(' ');
}

/**
 * Get message summary for debugging
 * Extracts key information about a message for logging/debugging
 */
export function getMessageSummary(message: Message): {
  type: string;
  length: number;
  toolUseCount?: number;
  hasError?: boolean;
  timestamp?: number;
} {
  const base = {
    type: message.type,
    timestamp: 'timestamp' in message ? message.timestamp : undefined,
  };

  if (message.type === 'user') {
    const content = (message as UserMessage).message.content;
    const length = typeof content === 'string' ? content.length : JSON.stringify(content).length;
    return { ...base, length };
  }

  if (message.type === 'assistant') {
    const msg = (message as AssistantMessage);
    const content = msg.message.content;
    const length = JSON.stringify(content).length;
    const toolUseCount = content.filter(c => c.type === 'tool_use').length;
    const hasError = msg.isApiErrorMessage;
    return { ...base, length, toolUseCount, hasError };
  }

  if (message.type === 'progress') {
    const length = JSON.stringify((message as ProgressMessage).content).length;
    return { ...base, length };
  }

  return { ...base, length: 0 };
}

/**
 * Filter messages by type
 */
export function filterMessagesByType<T extends Message['type']>(
  messages: Message[],
  type: T,
): Extract<Message, { type: T }>[] {
  return messages.filter(m => m.type === type) as Extract<Message, { type: T }>[];
}
