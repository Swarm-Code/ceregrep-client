/**
 * Input Box Component
 * Handles user input
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface InputBoxProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

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

  return (
    <Box flexDirection="column">
      {/* Top line */}
      <Text color="blue">{line}</Text>

      {/* Input area */}
      <Box paddingX={1}>
        <Text color="blue" bold>▶ </Text>
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
