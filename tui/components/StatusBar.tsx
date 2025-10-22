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

  // Force exact colors (hex) to override terminal themes
  const BLUE = '#4169E1';
  const PURPLE = '#A855F7';
  const CYAN = '#22D3EE';
  const WHITE = '#FFFFFF';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Top line */}
      <Text color={BLUE}>{line}</Text>

      {/* Status content */}
      <Box paddingX={1} paddingY={0}>
        <Box flexGrow={1}>
          <Text bold color={BLUE}>👾 SWARM-CLI</Text>
          <Text color={WHITE}> │ </Text>
          <Text color={WHITE}>{conversationTitle}</Text>
          {agentId && (
            <>
              <Text color={WHITE}> │ </Text>
              <Text color={PURPLE}>{agentId}</Text>
            </>
          )}
          {isStreaming && (
            <>
              <Text color={WHITE}> │ </Text>
              <Text color={CYAN}>◉ STREAMING</Text>
            </>
          )}
        </Box>
      </Box>

      {/* Bottom line */}
      <Text color={BLUE}>{line}</Text>
    </Box>
  );
};
