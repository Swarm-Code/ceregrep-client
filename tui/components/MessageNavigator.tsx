/**
 * Message Navigator Component
 * Allows navigation through conversation history and forking
 */

import React from 'react';
import { Box, Text } from 'ink';

interface MessageNavigatorProps {
  currentIndex: number;
  totalMessages: number;
  branchName: string;
  isHistorical: boolean;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onFork: () => void;
  onReturnToLive: () => void;
}

// Force exact colors
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const YELLOW = '#F59E0B';
const DIM_WHITE = '#9CA3AF';

export const MessageNavigator: React.FC<MessageNavigatorProps> = ({
  currentIndex,
  totalMessages,
  branchName,
  isHistorical,
  canNavigateBack,
  canNavigateForward,
  onNavigateBack,
  onNavigateForward,
  onFork,
  onReturnToLive,
}) => {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={CYAN} paddingX={1} marginBottom={1}>
      {/* Navigation Controls */}
      <Box>
        {canNavigateBack ? (
          <Text color={CYAN}>◀ Ctrl+←</Text>
        ) : (
          <Text color={DIM_WHITE} dimColor>◀ Ctrl+←</Text>
        )}

        <Text color={WHITE}>  Message {currentIndex + 1}/{totalMessages} on branch: </Text>
        <Text bold color={PURPLE}>{branchName}</Text>

        {canNavigateForward ? (
          <Text color={CYAN}>  Ctrl+→ ▶</Text>
        ) : (
          <Text color={DIM_WHITE} dimColor>  Ctrl+→ ▶</Text>
        )}

        <Text color={CYAN}>  |  Ctrl+F Fork</Text>
      </Box>

      {/* Historical Mode Warning */}
      {isHistorical && (
        <Box marginTop={0}>
          <Text color={YELLOW}>⚠ Viewing history - submitting will create a fork  </Text>
          <Text color={CYAN}>(Ctrl+0 to return to live)</Text>
        </Box>
      )}
    </Box>
  );
};
