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

export const MessageList: React.FC<MessageListProps> = ({ messages, isStreaming }) => {
  return (
    <Box flexDirection="column">
      {messages.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}

      {isStreaming && (
        <Box marginTop={1}>
          <Text color="cyan">● Thinking...</Text>
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
        <Text bold color="blue">You:</Text>
        <Text>{content || '(empty message)'}</Text>
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
        <Text bold color="green">Assistant:</Text>

        {/* Display text content */}
        {textBlocks.map((block: any, index: number) => (
          <Text key={index}>{block.text}</Text>
        ))}

        {/* Display tool calls */}
        {toolUseBlocks.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            {toolUseBlocks.map((block: any, index: number) => (
              <Box key={index} marginLeft={2}>
                <Text color="yellow">🔧 {block.name}</Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  return null;
};
