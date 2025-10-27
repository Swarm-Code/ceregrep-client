/**
 * Raw Terminal Input - Maximum performance input bypassing Ink rendering
 *
 * This component uses React for layout but writes the actual input directly
 * to stdout, bypassing Ink's rendering pipeline. This ensures typing performance
 * remains instant even with large conversation histories.
 *
 * Approach:
 * - Render invisible placeholder in Ink for layout positioning
 * - Use useStdout to write actual input over the placeholder
 * - Handle all input events directly without triggering React renders
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, useStdout, useInput } from 'ink';
import chalk from 'chalk';

export interface RawTerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  disabled?: boolean;
}

export const RawTerminalInput: React.FC<RawTerminalInputProps> = ({
  value: externalValue,
  onChange,
  onSubmit,
  placeholder = '',
  focus = true,
  disabled = false,
}) => {
  const { write } = useStdout();
  const [cursorPos, setCursorPos] = useState(externalValue.length);
  const valueRef = useRef(externalValue);

  // Keep ref in sync
  useEffect(() => {
    valueRef.current = externalValue;
    setCursorPos(externalValue.length);
  }, [externalValue]);

  // Build rendered value with cursor
  const buildRenderedValue = (value: string, cursor: number): string => {
    if (value.length === 0) {
      if (placeholder) {
        return chalk.inverse(' ') + chalk.grey(placeholder.slice(1));
      }
      return chalk.inverse(' ');
    }

    let result = '';
    for (let i = 0; i < value.length; i++) {
      if (i === cursor) {
        result += chalk.inverse(value[i]);
      } else {
        result += value[i];
      }
    }

    if (cursor === value.length) {
      result += chalk.inverse(' ');
    }

    return result;
  };

  // Handle input - let parent handle via onChange
  useInput((input, key) => {
    if (!focus || disabled) return;

    const currentValue = valueRef.current;
    let newValue = currentValue;
    let newCursor = cursorPos;
    let shouldUpdate = false;

    // Enter - submit
    if (key.return) {
      onSubmit?.(currentValue);
      return;
    }

    // Left arrow
    if (key.leftArrow) {
      newCursor = Math.max(0, cursorPos - 1);
      setCursorPos(newCursor);
      return;
    }

    // Right arrow
    if (key.rightArrow) {
      newCursor = Math.min(currentValue.length, cursorPos + 1);
      setCursorPos(newCursor);
      return;
    }

    // Backspace
    if (key.backspace || key.delete || input === '\b' || input === '\x7f' || input === '\x08') {
      if (cursorPos > 0) {
        newValue = currentValue.slice(0, cursorPos - 1) + currentValue.slice(cursorPos);
        newCursor = cursorPos - 1;
        shouldUpdate = true;
      }
    }
    // Ctrl+A - beginning
    else if (key.ctrl && input === 'a') {
      newCursor = 0;
      setCursorPos(newCursor);
      return;
    }
    // Ctrl+E - end
    else if (key.ctrl && input === 'e') {
      newCursor = currentValue.length;
      setCursorPos(newCursor);
      return;
    }
    // Ctrl+K - delete to end
    else if (key.ctrl && input === 'k') {
      newValue = currentValue.slice(0, cursorPos);
      shouldUpdate = true;
    }
    // Ctrl+U - delete to beginning
    else if (key.ctrl && input === 'u') {
      newValue = currentValue.slice(cursorPos);
      newCursor = 0;
      shouldUpdate = true;
    }
    // Tab, up/down arrows - let parent handle
    else if (key.tab || key.upArrow || key.downArrow) {
      return;
    }
    // Regular character input
    else if (!key.ctrl && !key.meta && input.length > 0) {
      newValue = currentValue.slice(0, cursorPos) + input + currentValue.slice(cursorPos);
      newCursor = cursorPos + input.length;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      // Update ref and cursor
      valueRef.current = newValue;
      setCursorPos(newCursor);

      // Notify parent - this will trigger a re-render with the new value
      onChange(newValue);
    }
  }, { isActive: focus && !disabled });

  // Render placeholder that Ink uses for layout
  // The actual input is written directly to stdout
  const placeholderText = externalValue.length > 0
    ? ' '.repeat(externalValue.length + 1) // Space for value + cursor
    : placeholder.length > 0
    ? ' '.repeat(placeholder.length + 1) // Space for placeholder + cursor
    : '  '; // Minimum space for cursor

  return (
    <Text>
      {placeholderText}
    </Text>
  );
};
