/**
 * Controllable text input based on ink-text-input with cursor override support.
 */

import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';
import chalk from 'chalk';

export interface ControllableTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focus?: boolean;
  mask?: string;
  highlightPastedText?: boolean;
  showCursor?: boolean;
  cursorOverride?: number;
}

export const ControllableTextInput: React.FC<ControllableTextInputProps> = ({
  value: originalValue,
  onChange,
  onSubmit,
  placeholder = '',
  focus = true,
  mask,
  highlightPastedText = false,
  showCursor = true,
  cursorOverride,
}) => {
  const [state, setState] = useState(() => ({
    cursorOffset: (originalValue || '').length,
    cursorWidth: 0,
  }));

  const { cursorOffset, cursorWidth } = state;

  useEffect(() => {
    setState(previous => {
      if (!focus || !showCursor) {
        return previous;
      }
      const newValue = originalValue || '';
      if (previous.cursorOffset > newValue.length) {
        return {
          cursorOffset: newValue.length,
          cursorWidth: 0,
        };
      }
      return previous;
    });
  }, [originalValue, focus, showCursor]);

  useEffect(() => {
    if (!focus || !showCursor) return;
    if (cursorOverride === undefined) return;

    const newValue = originalValue || '';
    const clamped = Math.max(0, Math.min(cursorOverride, newValue.length));

    setState(prev => {
      if (prev.cursorOffset === clamped && prev.cursorWidth === 0) {
        return prev;
      }
      return {
        cursorOffset: clamped,
        cursorWidth: 0,
      };
    });
  }, [cursorOverride, originalValue, focus, showCursor]);

  const cursorActualWidth = highlightPastedText ? cursorWidth : 0;
  const maskedValue = mask ? mask.repeat(originalValue.length) : originalValue;

  let renderedValue = maskedValue;
  let renderedPlaceholder = placeholder ? chalk.grey(placeholder) : undefined;

  if (showCursor && focus) {
    renderedPlaceholder =
      placeholder.length > 0
        ? chalk.inverse(placeholder[0]) + chalk.grey(placeholder.slice(1))
        : chalk.inverse(' ');
    renderedValue = maskedValue.length > 0 ? '' : chalk.inverse(' ');

    let i = 0;
    for (const char of maskedValue) {
      renderedValue +=
        i >= cursorOffset - cursorActualWidth && i <= cursorOffset
          ? chalk.inverse(char)
          : char;
      i++;
    }

    if (maskedValue.length > 0 && cursorOffset === maskedValue.length) {
      renderedValue += chalk.inverse(' ');
    }
  }

  useInput((input, key) => {
    if (
      key.upArrow ||
      key.downArrow ||
      (key.ctrl && input === 'c') ||
      key.tab ||
      (key.shift && key.tab)
    ) {
      return;
    }

    if (key.return) {
      onSubmit?.(originalValue);
      return;
    }

    let nextCursorOffset = cursorOffset;
    let nextValue = originalValue;
    let nextCursorWidth = 0;

    if (key.leftArrow) {
      if (showCursor) {
        nextCursorOffset--;
      }
    } else if (key.rightArrow) {
      if (showCursor) {
        nextCursorOffset++;
      }
    } else if (key.backspace || key.delete) {
      if (cursorOffset > 0) {
        nextValue =
          originalValue.slice(0, cursorOffset - 1) +
          originalValue.slice(cursorOffset);
        nextCursorOffset--;
      }
    } else {
      nextValue =
        originalValue.slice(0, cursorOffset) +
        input +
        originalValue.slice(cursorOffset);
      nextCursorOffset += input.length;
      if (input.length > 1) {
        nextCursorWidth = input.length;
      }
    }

    if (nextCursorOffset < 0) {
      nextCursorOffset = 0;
    }

    if (nextCursorOffset > nextValue.length) {
      nextCursorOffset = nextValue.length;
    }

    setState({
      cursorOffset: nextCursorOffset,
      cursorWidth: nextCursorWidth,
    });

    if (nextValue !== originalValue) {
      onChange(nextValue);
    }
  }, { isActive: focus });

  return (
    <Text>
      {placeholder
        ? maskedValue.length > 0
          ? renderedValue
          : renderedPlaceholder
        : renderedValue}
    </Text>
  );
};

