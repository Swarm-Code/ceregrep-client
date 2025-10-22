/**
 * Header Component
 * Beautiful ASCII art header like Claude Code
 */

import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  model: string;
  provider: string;
  cwd: string;
  agentMode: string;
  autoMode: boolean;
  modeColor: string;
}

// Force exact colors (hex) to override terminal themes
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#6B7280';
const PURPLE = '#A855F7';

export const Header: React.FC<HeaderProps> = ({ model, provider, cwd, agentMode, autoMode, modeColor }) => {
  // Get terminal width for line
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  // Extract short model name
  const shortModel = model.split('-').pop() || model;

  // Get mode display text
  const getModeText = () => {
    const baseMode = (() => {
      switch (agentMode) {
        case 'PLAN': return 'plan';
        case 'ACT': return 'act';
        case 'DEBUG': return 'debug';
        default: return agentMode.toLowerCase();
      }
    })();

    if (autoMode) {
      return `${baseMode} auto`;
    }
    return baseMode;
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ASCII Art + Info */}
      <Box paddingX={2} paddingY={1}>
        {/* Left: ASCII Art */}
        <Box flexDirection="column" marginRight={2}>
          <Text color={CYAN}>  ▗▄▄▖</Text>
          <Text color={CYAN}> ▐▛▀▀▘</Text>
          <Text color={CYAN}> ▐▙▄▄▖</Text>
          <Text color={CYAN}>  ▀▀▀▘</Text>
        </Box>

        {/* Right: Info */}
        <Box flexDirection="column">
          <Text color={WHITE} bold>Swarm-CLI v0.2.2</Text>
          <Text color={DIM_WHITE}>{shortModel} · {provider}</Text>
          <Text color={DIM_WHITE}>{cwd}</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  );
};
