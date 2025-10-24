/**
 * Message List Component
 * Displays conversation messages with tool execution details
 * PERFORMANCE OPTIMIZED: Uses Static component for old messages
 */

import React, { useMemo } from 'react';
import { Box, Text, Static } from 'ink';
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

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
export const MessageList = React.memo<MessageListProps>(({ messages, isStreaming, verboseMode }) => {
  // PERFORMANCE: Memoize tool executions map
  const toolExecutions = useMemo(() => {
    const executions = new Map<string, { name: string; input: any; output: string }>();

    messages.forEach((msg) => {
    // Extract tool results from user messages (don't rely on toolUseResult flag)
    if (msg.type === 'user') {
      const content = msg.message.content;
      if (Array.isArray(content)) {
        content.forEach((block: any) => {
          if (block.type === 'tool_result') {
            const output = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            // We'll fill in name and input when we process assistant messages
            executions.set(block.tool_use_id, {
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
        if (executions.has(block.id)) {
          const existing = executions.get(block.id)!;
          existing.name = block.name;
          existing.input = block.input;
        }
      });
    }
  });

    return executions;
  }, [messages]); // Memoize based on messages

  // Filter messages for display
  const displayMessages = messages.filter(msg => {
    if (msg.type === 'progress') return false;
    if (msg.type === 'user') {
      // Hide user messages that contain tool results
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
            (() => {
              const lastTool = pendingTools[pendingTools.length - 1];
              const toolBaseName = lastTool.name.replace(/^mcp__[^_]+__/, '');
              return (
                <Text bold color={CYAN}>
                  ● {toolBaseName} (running...)
                </Text>
              );
            })()
          ) : (
            <Text bold color={CYAN}>● Thinking...</Text>
          )}
        </Box>
      )}
    </Box>
  );
}); // React.memo - end of MessageList component

interface MessageItemProps {
  message: Message;
  verboseMode: boolean;
  isLastMessage: boolean;
  toolExecutions: Map<string, { name: string; input: any; output: string }>;
}

const MessageItemWithTools: React.FC<MessageItemProps> = ({ message, verboseMode, isLastMessage, toolExecutions }) => {
  // Render user message
  if (message.type === 'user') {
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
          <Text bold color={PURPLE}>◀ 👾 SCOUT</Text>
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

// Tool Execution Display Component (Claude Code style)
const ToolExecution: React.FC<{
  toolName: string;
  toolInput: any;
  toolOutput?: string | AnsiOutput;
  isComplete: boolean;
  verboseMode: boolean;
}> = ({ toolName, toolInput, toolOutput, isComplete, verboseMode }) => {
  // Format tool display based on tool type
  const formatToolDisplay = () => {
    const toolBaseName = toolName.replace(/^mcp__[^_]+__/, ''); // Remove MCP prefix if present

    // Handle empty or missing input
    if (!toolInput || typeof toolInput !== 'object') {
      return toolBaseName;
    }

    // Format input parameters based on tool type
    if (toolBaseName === 'Read' || toolBaseName === 'read') {
      const file = toolInput.file_path || toolInput.path || '';
      return `Read(${file})`;
    } else if (toolBaseName === 'Edit' || toolBaseName === 'edit' || toolBaseName === 'Update' || toolBaseName === 'Write') {
      const file = toolInput.file_path || toolInput.path || '';
      return `${toolBaseName}(${file})`;
    } else if (toolBaseName === 'Bash' || toolBaseName === 'bash' || toolBaseName === 'exec') {
      const cmd = toolInput.command || toolInput.cmd || '';
      const shortCmd = cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd;
      return `Bash(${shortCmd})`;
    } else if (toolBaseName === 'Grep' || toolBaseName === 'grep' || toolBaseName === 'search') {
      const pattern = toolInput.pattern || toolInput.query || '';
      const path = toolInput.path || '.';
      return `Grep("${pattern}" in ${path})`;
    } else {
      // Generic format for other tools
      const firstParam = Object.keys(toolInput)[0];
      if (firstParam) {
        const value = String(toolInput[firstParam]).substring(0, 40);
        return `${toolBaseName}(${value}${value.length >= 40 ? '...' : ''})`;
      }
      return toolBaseName;
    }
  };

  // Format output summary based on tool type - returns {summary, totalLines}
  const formatOutputSummary = (): { summary: string; totalLines: number } | null => {
    if (!toolOutput) return null;

    const toolBaseName = toolName.replace(/^mcp__[^_]+__/, '');
    const outputStr = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
    const lines = outputStr.split('\n').filter(line => line.trim());

    // In verbose mode, show EVERYTHING - no summaries or truncation
    if (verboseMode) {
      return {
        summary: lines.join('\n'),
        totalLines: 0 // No remaining lines to show
      };
    }

    // In compact mode, show summaries
    if (toolBaseName === 'Read' || toolBaseName === 'read') {
      return { summary: `Read ${lines.length} lines`, totalLines: 0 };
    } else if (toolBaseName === 'Edit' || toolBaseName === 'edit' || toolBaseName === 'Update') {
      const file = toolInput.file_path || toolInput.path || 'file';
      return { summary: `Updated ${file} with changes`, totalLines: 0 };
    } else if (toolBaseName === 'Write') {
      const file = toolInput.file_path || toolInput.path || 'file';
      return { summary: `Created ${file} (${lines.length} lines)`, totalLines: 0 };
    } else if (toolBaseName === 'Grep' || toolBaseName === 'grep' || toolBaseName === 'search') {
      const matches = lines.filter(l => l.includes(':')).length;
      return { summary: `Found ${matches} match${matches !== 1 ? 'es' : ''}`, totalLines: 0 };
    } else if (toolBaseName === 'Bash' || toolBaseName === 'bash' || toolBaseName === 'exec') {
      // Show first 3 lines of output in compact mode
      const displayLines = lines.slice(0, 3);
      return {
        summary: displayLines.join('\n'),
        totalLines: lines.length
      };
    }
    return null;
  };

  // Check if output is AnsiOutput
  const hasAnsiOutput = toolOutput && isAnsiOutput(toolOutput);

  return (
    <Box flexDirection="column" paddingLeft={2} marginTop={0}>
      <Box>
        <Text color={CYAN}>● {formatToolDisplay()}</Text>
        {!isComplete && (
          <Text color={DIM_WHITE} dimColor> (running...)</Text>
        )}
      </Box>
      {isComplete && toolOutput && (
        <Box paddingLeft={2} marginTop={0}>
          <Box>
            <Text color={DIM_WHITE}>⎿ </Text>
            {(() => {
              const result = formatOutputSummary();
              if (result) {
                const { summary, totalLines } = result;
                const summaryLines = summary.split('\n');
                const displayedCount = summaryLines.length;
                const remainingLines = totalLines > displayedCount ? totalLines - displayedCount : 0;

                return (
                  <Box flexDirection="column">
                    <Text color={DIM_WHITE}>{summary}</Text>
                    {remainingLines > 0 && (
                      <Text color={DIM_WHITE} dimColor>
                        … +{remainingLines} lines
                      </Text>
                    )}
                  </Box>
                );
              }

              // Fallback to original display for unknown tools
              if (hasAnsiOutput) {
                return (
                  <AnsiOutputText
                    output={toolOutput as AnsiOutput}
                    maxLines={verboseMode ? 999999 : 3}  // Show all lines in verbose mode
                  />
                );
              } else {
                const outputStr = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput);
                const outputLines = outputStr.split('\n').filter(line => line.trim());

                // In verbose mode, show ALL lines; in compact mode, show 3
                const maxOutputLines = verboseMode ? outputLines.length : 3;
                const displayLines = outputLines.slice(0, maxOutputLines);
                const remainingLines = outputLines.length - displayLines.length;

                return (
                  <Box flexDirection="column">
                    <Text color={DIM_WHITE}>{displayLines.join('\n')}</Text>
                    {remainingLines > 0 && (
                      <Text color={DIM_WHITE} dimColor>
                        … +{remainingLines} lines
                      </Text>
                    )}
                  </Box>
                );
              }
            })()}
          </Box>
        </Box>
      )}
    </Box>
  );
};

