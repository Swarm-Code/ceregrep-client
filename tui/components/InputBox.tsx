/**
 * Input Box Component
 * Handles user input with command autocomplete
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputBoxProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

// Available commands
const COMMANDS = [
  { name: '/new', description: 'Create new conversation', usage: '/new [title]' },
  { name: '/agent', description: 'Switch agent', usage: '/agent [id]' },
  { name: '/checkpoint', description: 'Create checkpoint', usage: '/checkpoint [description]' },
  { name: '/restore', description: 'Restore to checkpoint', usage: '/restore <checkpoint-id>' },
  { name: '/list', description: 'Show conversations', usage: '/list' },
  { name: '/clear', description: 'Clear current conversation', usage: '/clear' },
  { name: '/help', description: 'Toggle help', usage: '/help' },
  { name: '/exit', description: 'Exit TUI', usage: '/exit' },
];

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';

export const InputBox: React.FC<InputBoxProps> = ({ onSubmit, disabled = false }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value);
      setValue('');
    }
  };

  // Get terminal width for line
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  // Filter commands based on input
  const suggestions = useMemo(() => {
    if (!value.startsWith('/') || value.length === 1) {
      return value === '/' ? COMMANDS : [];
    }

    const search = value.toLowerCase();
    return COMMANDS.filter(cmd => cmd.name.toLowerCase().startsWith(search));
  }, [value]);

  const showSuggestions = suggestions.length > 0 && value.startsWith('/');

  return (
    <Box flexDirection="column">
      {/* Command suggestions */}
      {showSuggestions && (
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
          <Text bold color={PURPLE}>AVAILABLE COMMANDS:</Text>
          {suggestions.slice(0, 5).map((cmd, index) => (
            <Box key={index}>
              <Text color={CYAN}>{cmd.usage}</Text>
              <Text color={DIM_WHITE}> - {cmd.description}</Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Top line */}
      <Text color={BLUE}>{line}</Text>

      {/* Input area */}
      <Box paddingX={1}>
        <Text color={BLUE} bold>▶ </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={disabled ? 'Waiting...' : 'Type a message or /help for commands...'}
          showCursor={!disabled}
        />
      </Box>
    </Box>
  );
};
