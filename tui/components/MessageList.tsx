/**
 * Message List Component
 * Displays conversation messages with tool execution details
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Message, UserMessage, AssistantMessage } from '../../core/messages.js';
import { extractTextContent, extractToolUseBlocks } from '../../core/messages.js';
import { AnsiOutputText, isAnsiOutput } from './AnsiOutputText.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  verboseMode: boolean;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';

// Max lines to show in compact mode
const COMPACT_MAX_LINES = 8;
const VERBOSE_MAX_LINES = 50; // Even in verbose mode, cap at 50 lines
const MAX_TEXT_LENGTH = 10000; // Max characters per text block

export const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming, verboseMode }) => {
  // Build a map of tool executions: tool_use_id -> {name, input, output}
  const toolExecutions = new Map<string, { name: string; input: any; output: string }>();

  messages.forEach((msg) => {
    if (msg.type === 'user' && msg.toolUseResult) {
      // Extract tool result info
      const content = msg.message.content;
      if (Array.isArray(content)) {
        content.forEach((block: any) => {
          if (block.type === 'tool_result') {
            const output = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            // We'll fill in name and input when we process assistant messages
            toolExecutions.set(block.tool_use_id, {
              name: '',
              input: null,
              output,
            });
          }
        });
      }
    }

    if (msg.type === 'assistant') {
      // Extract tool use blocks and link them with their results
      const toolUseBlocks = extractToolUseBlocks(msg);
      toolUseBlocks.forEach((block: any) => {
        if (toolExecutions.has(block.id)) {
          const existing = toolExecutions.get(block.id)!;
          existing.name = block.name;
          existing.input = block.input;
        }
      });
    }
  });

  // Filter messages for display
  const displayMessages = messages.filter(msg => {
    if (msg.type === 'progress') return false;
    if (msg.type === 'user') {
      if (msg.toolUseResult) return false;
      if (Array.isArray(msg.message.content)) {
        const hasToolResult = msg.message.content.some(
          (block: any) => block.type === 'tool_result'
        );
        if (hasToolResult) return false;
      }
      return true;
    }
    return msg.type === 'assistant';
  });

  // Check if there are any pending tool executions (tools in assistant messages without results yet)
  const pendingTools: Array<{name: string; id: string}> = [];
  messages.forEach(msg => {
    if (msg.type === 'assistant') {
      const toolUseBlocks = extractToolUseBlocks(msg);
      toolUseBlocks.forEach((block: any) => {
        if (!toolExecutions.has(block.id) || !toolExecutions.get(block.id)?.name) {
          pendingTools.push({ name: block.name, id: block.id });
        }
      });
    }
  });

  return (
    <Box flexDirection="column">
      {/* Debug info */}
      {verboseMode && (
        <Box marginBottom={1}>
          <Text color={DIM_WHITE} dimColor>
            [Debug: {messages.length} total msgs, {displayMessages.length} displayed, streaming: {isStreaming ? 'yes' : 'no'}, pending tools: {pendingTools.length}]
          </Text>
        </Box>
      )}

      {displayMessages.map((message, index) => (
        <MessageItemWithTools
          key={index}
          message={message}
          verboseMode={verboseMode}
          isLastMessage={index === displayMessages.length - 1}
          toolExecutions={toolExecutions}
        />
      ))}

      {isStreaming && (
        <Box marginTop={1}>
          {pendingTools.length > 0 ? (
            <Text bold color={CYAN}>
              ◉ Executing {pendingTools.length} tool{pendingTools.length > 1 ? 's' : ''}... ({pendingTools.map(t => t.name).join(', ')})
            </Text>
          ) : (
            <Text bold color={CYAN}>◉ Thinking...</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

interface MessageItemProps {
  message: Message;
  verboseMode: boolean;
  isLastMessage: boolean;
  toolExecutions: Map<string, { name: string; input: any; output: string }>;
}

const MessageItemWithTools: React.FC<MessageItemProps> = ({ message, verboseMode, isLastMessage, toolExecutions }) => {
  // Render user message
  if (message.type === 'user') {
    if (message.toolUseResult) return null;

    const content = typeof message.message.content === 'string'
      ? message.message.content
      : JSON.stringify(message.message.content);

    const maxLines = isLastMessage ? VERBOSE_MAX_LINES * 2 : (verboseMode ? VERBOSE_MAX_LINES : COMPACT_MAX_LINES);
    const { text, truncated, charTruncated } = compactText(content, maxLines);

    return (
      <Box flexDirection="column" marginBottom={1} marginTop={1}>
        <Box marginBottom={0}>
          <Text bold color={BLUE}>▶ YOU</Text>
        </Box>
        <Box paddingLeft={2} flexDirection="column" marginTop={0}>
          <Text color={WHITE}>{text || '(empty message)'}</Text>
          {(truncated || charTruncated) && (
            <Text color={DIM_WHITE} dimColor>
              ... (Ctrl+O to expand)
            </Text>
          )}
        </Box>
      </Box>
    );
  }

  // Render assistant message with tool executions
  if (message.type === 'assistant') {
    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [message.message.content];

    const textBlocks = content.filter((c: any) => c.type === 'text');
    const toolUseBlocks = extractToolUseBlocks(message);

    return (
      <Box flexDirection="column" marginBottom={1} marginTop={1}>
        <Box marginBottom={0}>
          <Text bold color={PURPLE}>◀ ASSISTANT</Text>
        </Box>

        {/* Display text content */}
        {textBlocks.length > 0 && (
          <Box flexDirection="column" paddingLeft={2} marginTop={0}>
            {textBlocks.map((block: any, index: number) => {
              if (!block.text || !block.text.trim()) return null;

              const maxLines = isLastMessage ? VERBOSE_MAX_LINES * 2 : (verboseMode ? VERBOSE_MAX_LINES : COMPACT_MAX_LINES);
              const { text, truncated, charTruncated } = compactText(block.text, maxLines);

              return (
                <Box key={index} flexDirection="column">
                  <Text color={WHITE}>{text}</Text>
                  {(truncated || charTruncated) && (
                    <Text color={DIM_WHITE} dimColor>
                      ... (Ctrl+O to expand)
                    </Text>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Display tool executions - show immediately, update with results */}
        {toolUseBlocks.length > 0 && (
          <Box flexDirection="column" marginTop={0}>
            {toolUseBlocks.map((block: any, index: number) => {
              const execution = toolExecutions.get(block.id);
              // Always render tool immediately, even if result hasn't arrived yet
              return (
                <ToolExecution
                  key={index}
                  toolName={block.name}
                  toolInput={block.input}
                  toolOutput={execution?.output}
                  isComplete={!!execution}
                  verboseMode={verboseMode}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};

const compactText = (text: string, maxLines: number): { text: string; truncated: boolean; charTruncated: boolean } => {
  // First truncate by character length if needed
  let processedText = text;
  let charTruncated = false;

  if (text.length > MAX_TEXT_LENGTH) {
    processedText = text.substring(0, MAX_TEXT_LENGTH);
    charTruncated = true;
  }

  const lines = processedText.split('\n');
  if (lines.length <= maxLines && !charTruncated) {
    return { text: processedText, truncated: false, charTruncated: false };
  }

  return {
    text: lines.slice(0, maxLines).join('\n'),
    truncated: lines.length > maxLines,
    charTruncated,
  };
};

// Tool Execution Display Component
const ToolExecution: React.FC<{
  toolName: string;
  toolInput: any;
  toolOutput?: string | AnsiOutput;
  isComplete: boolean;
  verboseMode: boolean;
}> = ({ toolName, toolInput, toolOutput, isComplete, verboseMode }) => {
  // Only show most relevant input param
  const inputPreview = toolInput && Object.keys(toolInput).length > 0
    ? `${Object.keys(toolInput)[0]}: ${String(Object.values(toolInput)[0]).substring(0, 40)}`
    : '';

  // Check if output is AnsiOutput
  const hasAnsiOutput = toolOutput && isAnsiOutput(toolOutput);

  return (
    <Box flexDirection="column" paddingLeft={2} marginTop={0}>
      <Box>
        <Text color={CYAN}>⚙ {toolName}</Text>
        {inputPreview && !verboseMode && (
          <Text color={DIM_WHITE} dimColor> • {inputPreview}...</Text>
        )}
        {!isComplete && (
          <Text color={CYAN}> (running...)</Text>
        )}
      </Box>
      {isComplete && verboseMode && toolOutput && (
        <Box paddingLeft={2} marginTop={0}>
          {hasAnsiOutput ? (
            // Render ANSI output with formatting
            <AnsiOutputText
              output={toolOutput as AnsiOutput}
              maxLines={verboseMode ? 10 : 3}
            />
          ) : (
            // Render plain text output
            (() => {
              const outputStr = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
              const outputLines = outputStr.split('\n').filter(line => line.trim());
              const maxOutputLines = verboseMode ? 10 : 3;
              const truncatedOutput = outputLines.slice(0, maxOutputLines).join('\n');
              const hasMore = outputLines.length > maxOutputLines;

              return (
                <>
                  <Text color={DIM_WHITE} dimColor>{truncatedOutput}</Text>
                  {hasMore && (
                    <Text color={DIM_WHITE} dimColor>
                      ... (+{outputLines.length - maxOutputLines} more)
                    </Text>
                  )}
                </>
              );
            })()
          )}
        </Box>
      )}
    </Box>
  );
};

