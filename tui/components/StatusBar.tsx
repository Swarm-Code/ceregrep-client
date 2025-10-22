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
  tokenUsage?: { input: number; output: number; total: number };
  tokensPerMinute?: number;
  model?: string;
  provider?: string;
  agentMode?: string;
  autoMode?: boolean;
  modeColor?: string;
  showExitHint?: boolean;
  shellMode?: boolean;
  shellPid?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  agentId,
  conversationTitle,
  isStreaming,
  view,
  tokenUsage,
  tokensPerMinute,
  model,
  provider,
  agentMode,
  autoMode,
  modeColor,
  showExitHint,
  shellMode,
  shellPid,
}) => {
  // Get terminal width for line
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  // Force exact colors (hex) to override terminal themes
  const BLUE = '#4169E1';
  const PURPLE = '#A855F7';
  const CYAN = '#22D3EE';
  const WHITE = '#FFFFFF';
  const DIM_WHITE = '#6B7280';

  // Format numbers with K/M suffix for compactness
  const formatCompact = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Calculate context percentage
  const contextPct = tokenUsage ? ((tokenUsage.total / 131072) * 100).toFixed(0) : '0';

  // Get mode description
  const getModeDesc = () => {
    const baseMode = (() => {
      switch (agentMode) {
        case 'PLAN': return 'plan';
        case 'ACT': return 'act';
        case 'DEBUG': return 'debug';
        default: return '';
      }
    })();

    if (autoMode) {
      return `${baseMode} auto`;
    }
    return baseMode;
  };

  return (
    <Box flexDirection="column">
      {/* Minimal single row status - no lines */}
      <Box paddingX={2} paddingY={0} justifyContent="space-between">
        {/* Left side: Token info or exit hint */}
        <Box>
          {showExitHint ? (
            <Text color={CYAN}>Press Ctrl+C again to exit</Text>
          ) : tokenUsage && tokenUsage.total > 0 ? (
            <>
              <Text color={WHITE}>↑</Text>
              <Text color={CYAN}>{formatCompact(tokenUsage.input)}</Text>
              <Text color={DIM_WHITE}>  </Text>
              <Text color={WHITE}>↓</Text>
              <Text color={CYAN}>{formatCompact(tokenUsage.output)}</Text>
              <Text color={DIM_WHITE}>  </Text>
              <Text color={DIM_WHITE}>{contextPct}%</Text>
            </>
          ) : (
            <Text color={DIM_WHITE}>no tokens</Text>
          )}
          {isStreaming && !showExitHint && (
            <>
              <Text color={DIM_WHITE}>  </Text>
              <Text color={CYAN}>●</Text>
            </>
          )}
        </Box>

        {/* Right side: Shell Mode or Mode + Model */}
        <Box>
          {shellMode && shellPid ? (
            <>
              <Text color="#10B981" bold>[SHELL]</Text>
              <Text color={DIM_WHITE}> PID:{shellPid}</Text>
            </>
          ) : (
            <>
              {agentMode && (
                <>
                  <Text color={modeColor || CYAN}>{getModeDesc()}</Text>
                  <Text color={DIM_WHITE}>  </Text>
                </>
              )}
              {model && (
                <Text color={DIM_WHITE}>{model.split('-').pop()}</Text>
              )}
              {provider && (
                <>
                  <Text color={DIM_WHITE}>@</Text>
                  <Text color={DIM_WHITE}>{provider}</Text>
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};
