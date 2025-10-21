/**
 * Status Bar Component
 * Displays current status and context
 */

import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  agentId?: string;
  conversationTitle: string;
  isStreaming: boolean;
  view: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  agentId,
  conversationTitle,
  isStreaming,
  view,
}) => {
  // Get terminal width for line
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top line */}
      <Text color="blue">{line}</Text>

      {/* Status content */}
      <Box paddingX={1} paddingY={0}>
        <Box flexGrow={1}>
          <Text bold color="blue">CEREGREP</Text>
          <Text color="white"> │ </Text>
          <Text color="white">{conversationTitle}</Text>
          {agentId && (
            <>
              <Text color="white"> │ </Text>
              <Text color="magenta">{agentId}</Text>
            </>
          )}
          {isStreaming && (
            <>
              <Text color="white"> │ </Text>
              <Text color="cyan">◉ STREAMING</Text>
            </>
          )}
        </Box>
      </Box>

      {/* Bottom line */}
      <Text color="blue">{line}</Text>
    </Box>
  );
};
