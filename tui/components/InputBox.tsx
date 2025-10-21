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

  return (
    <Box>
      <Text color="cyan" bold>{'> '}</Text>
      <TextInput
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        placeholder={disabled ? 'Waiting...' : 'Type a message or /help for commands...'}
        showCursor={!disabled}
      />
    </Box>
  );
};
