/**
 * Message List Component
 * Displays conversation messages
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../../core/messages.js';
import { extractTextContent } from '../../core/messages.js';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';

export const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
  return (
    <Box flexDirection="column">
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}

      {isStreaming && (
        <Box marginTop={1}>
          <Text bold color={CYAN}>◉ Thinking...</Text>
        </Box>
      )}
    </Box>
  );
};

interface MessageItemProps {
  message: Message;
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  if (message.type === 'user') {
    const content = typeof message.message.content === 'string'
      ? message.message.content
      : JSON.stringify(message.message.content);

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={BLUE}>▶ YOU</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color={WHITE}>{content || '(empty message)'}</Text>
        </Box>
      </Box>
    );
  }

  if (message.type === 'assistant') {
    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [message.message.content];

    // Extract text blocks
    const textBlocks = content.filter((c: any) => c.type === 'text');
    const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');

    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={PURPLE}>◀ ASSISTANT</Text>
        </Box>

        {/* Display text content */}
        <Box flexDirection="column" paddingLeft={2}>
          {textBlocks.map((block: any, index: number) => (
            <Text key={index} color={WHITE}>{block.text}</Text>
          ))}
        </Box>

        {/* Display tool calls */}
        {toolUseBlocks.length > 0 && (
          <Box flexDirection="column" marginTop={1} paddingLeft={2}>
            {toolUseBlocks.map((block: any, index: number) => (
              <Box key={index}>
                <Text color={CYAN}>⚙ {block.name}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};
