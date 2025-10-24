/**
 * Shortcut Bar Component
 * Zellij-like keyboard shortcut display at the bottom of the screen
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ShortcutBarProps {
  view?: string;
  isStreaming?: boolean;
}

// Force exact colors (hex) to override terminal themes
const BLACK = '#000000';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const GRAY_BG = '#374151';

interface Shortcut {
  key: string;
  label: string;
  condition?: (view: string, isStreaming: boolean) => boolean;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'H', label: 'Help' },
  { key: 'L', label: 'List' },
  { key: 'A', label: 'Agent' },
  { key: 'T', label: 'MCP' },
  { key: 'R', label: 'Search', condition: (view) => view === 'chat' },
  { key: 'O', label: 'Verbose', condition: (view) => view === 'chat' },
  { key: 'B', label: 'Branch', condition: (view) => view === 'chat' },
  { key: '/', label: 'Cmd', condition: (view) => view === 'chat' },
  { key: '@', label: 'File', condition: (view) => view === 'chat' },
  { key: 'Esc', label: 'Stop', condition: (_, isStreaming) => isStreaming },
];

export const ShortcutBar: React.FC<ShortcutBarProps> = ({ view = 'chat', isStreaming = false }) => {
  // Filter shortcuts based on conditions
  const visibleShortcuts = SHORTCUTS.filter(shortcut => {
    if (!shortcut.condition) return true;
    return shortcut.condition(view, isStreaming);
  });

  return (
    <Box flexDirection="row" gap={0}>
      <Text color={GRAY_BG}> </Text>
      {visibleShortcuts.map((shortcut, index) => (
        <React.Fragment key={index}>
          <Text backgroundColor={GRAY_BG} color={BLACK} bold> {shortcut.key} </Text>
          <Text backgroundColor={GRAY_BG} color={WHITE}> {shortcut.label} </Text>
          {index < visibleShortcuts.length - 1 && <Text color={GRAY_BG}> </Text>}
        </React.Fragment>
      ))}
      <Text color={GRAY_BG}> </Text>
    </Box>
  );
};
