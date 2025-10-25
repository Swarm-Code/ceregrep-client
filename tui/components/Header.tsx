/**
 * Header Component
 * Beautiful ASCII art header like Claude Code
 */

import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../../../package.json');

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

// Rainbow colors for ASCII art
const RAINBOW_COLORS = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#00FFFF', // Cyan
  '#0000FF', // Blue
  '#8B00FF', // Violet
  '#FF1493', // Deep Pink
  '#00CED1', // Dark Turquoise
  '#FF69B4', // Hot Pink
  '#32CD32', // Lime Green
  '#FF4500', // Orange Red
];

export const Header: React.FC<HeaderProps> = ({ model, provider, cwd, agentMode, autoMode, modeColor }) => {
  // Randomly select a rainbow color on startup (memoized to stay consistent during session)
  const rainbowColor = useMemo(() => {
    return RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
  }, []);

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
          <Text color={rainbowColor}>  █   █</Text>
          <Text color={rainbowColor}>  █████</Text>
          <Text color={rainbowColor}>  █ █ █</Text>
          <Text color={rainbowColor}> ███████</Text>
          <Text color={rainbowColor}>   █ █</Text>
        </Box>

        {/* Right: Info */}
        <Box flexDirection="column">
          <Text color={WHITE} bold>Swarm-CLI v{version}</Text>
          <Text color={DIM_WHITE}>{shortModel} · {provider}</Text>
          <Text color={DIM_WHITE}>{cwd}</Text>
          <Text> </Text>
        </Box>
      </Box>
    </Box>
  );
};
