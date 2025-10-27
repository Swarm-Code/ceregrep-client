/**
 * Efficient text input component using Kode's Cursor-based approach.
 * This provides high-performance text input that doesn't degrade with conversation length.
 *
 * Features:
 * - Immutable Cursor class for efficient text manipulation
 * - Minimal re-renders (only when text actually changes)
 * - Controlled value and onChange
 * - Cursor positioning with cursor Offset prop
 * - Placeholder support
 * - Focus management
 * - Special key handling via callback
 * - Submit on Enter
 * - Emacs-style keyboard shortcuts (Ctrl+A, Ctrl+E, Ctrl+K, Ctrl+U, Ctrl+W)
 * - Meta/Option key word navigation (Meta+B, Meta+F, Meta+D)
 * - Home/End key support
 */

import React from 'react';
import { Text, useInput, type Key } from 'ink';
import chalk from 'chalk';
import { useTextInput } from '../../hooks/useTextInput.js';

export interface EfficientTextInputProps {
  /** Current value of the input */
  value: string;

  /** Callback when value changes */
  onChange: (value: string) => void;

  /** Callback when Enter is pressed */
  onSubmit?: (value: string) => void;

  /** Placeholder text to display when value is empty */
  placeholder?: string;

  /** Whether this input should receive keyboard input */
  focus?: boolean;

  /** Whether to show the cursor */
  showCursor?: boolean;

  /** External cursor offset (0-based position in string) */
  cursorOffset?: number;

  /** Callback when internal cursor position changes */
  onCursorOffsetChange?: (offset: number) => void;

  /**
   * Callback for special key combinations before default input processing.
   * Return true to prevent default handling.
   */
  onSpecialKey?: (input: string, key: Key) => boolean;
}

export const EfficientTextInput: React.FC<EfficientTextInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  focus = true,
  showCursor = true,
  cursorOffset = 0,
  onCursorOffsetChange = () => {},
  onSpecialKey,
}) => {
  // Get terminal width for text wrapping
  const columns = process.stdout.columns || 80;

  // Use the Cursor-based input hook for efficient text manipulation
  const { onInput: handleInput, renderedValue } = useTextInput({
    value,
    onChange,
    onSubmit,
    mask: '',
    cursorChar: showCursor ? ' ' : '',
    invert: (text: string) => chalk.inverse(text),
    columns,
    externalOffset: cursorOffset,
    onOffsetChange: onCursorOffsetChange,
  });

  // Wrap the onInput handler to support special key handling
  useInput((input, key) => {
    if (!focus) return;

    // Check for special key combinations first
    if (onSpecialKey && onSpecialKey(input, key)) {
      return;
    }

    // Pass through to the hook's input handler
    handleInput(input, key);
  }, { isActive: focus });

  // Render placeholder with cursor
  const renderPlaceholder = (): string => {
    if (!showCursor || !focus) {
      return chalk.grey(placeholder);
    }

    if (placeholder.length === 0) {
      return chalk.inverse(' ');
    }

    return chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1));
  };

  const showPlaceholder = value.length === 0 && placeholder;

  return (
    <Text wrap="truncate-end">
      {showPlaceholder ? renderPlaceholder() : renderedValue}
    </Text>
  );
};
