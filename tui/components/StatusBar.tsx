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
  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      marginBottom={1}
    >
      <Box flexGrow={1}>
        <Text bold color="cyan">Ceregrep TUI</Text>
        <Text dimColor> | </Text>
        <Text>{conversationTitle}</Text>
        {agentId && (
          <>
            <Text dimColor> | </Text>
            <Text color="magenta">Agent: {agentId}</Text>
          </>
        )}
        {isStreaming && (
          <>
            <Text dimColor> | </Text>
            <Text color="yellow">● Streaming</Text>
          </>
        )}
        <Text dimColor> | </Text>
        <Text dimColor>View: {view}</Text>
      </Box>
    </Box>
  );
};
