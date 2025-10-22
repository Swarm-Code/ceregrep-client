/**
 * AnsiOutputText Component
 * Renders ANSI-formatted terminal output with proper styling
 *
 * This component takes AnsiOutput data (from terminalSerializer) and renders
 * it with all the formatting preserved (colors, bold, italic, etc.)
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { AnsiOutput, AnsiToken, AnsiLine } from '../../utils/terminalSerializer.js';

interface AnsiOutputTextProps {
  /** The ANSI output data to render */
  output: AnsiOutput;
  /** Optional scroll offset (number of lines to skip from top) */
  scrollOffset?: number;
  /** Optional maximum lines to display */
  maxLines?: number;
}

/**
 * Renders a single ANSI token with proper styling
 */
const AnsiTokenText: React.FC<{ token: AnsiToken }> = ({ token }) => {
  // Build style props
  const styleProps: any = {};

  if (token.bold) {
    styleProps.bold = true;
  }

  if (token.italic) {
    styleProps.italic = true;
  }

  if (token.underline) {
    styleProps.underline = true;
  }

  if (token.dim) {
    styleProps.dimColor = true;
  }

  if (token.inverse) {
    styleProps.inverse = true;
  }

  // Handle colors
  if (token.fg && token.fg !== '') {
    styleProps.color = token.fg;
  }

  if (token.bg && token.bg !== '') {
    styleProps.backgroundColor = token.bg;
  }

  return <Text {...styleProps}>{token.text}</Text>;
};

/**
 * Renders a single ANSI line (array of tokens)
 */
const AnsiLineText: React.FC<{ line: AnsiLine }> = ({ line }) => {
  if (line.length === 0) {
    return <Text> </Text>;
  }

  return (
    <Box>
      {line.map((token, i) => (
        <AnsiTokenText key={i} token={token} />
      ))}
    </Box>
  );
};

/**
 * Main AnsiOutputText component
 */
export const AnsiOutputText: React.FC<AnsiOutputTextProps> = ({
  output,
  scrollOffset = 0,
  maxLines,
}) => {
  if (!output || output.length === 0) {
    return <Text dimColor>No output</Text>;
  }

  // Calculate visible lines based on scroll and max lines
  const startLine = scrollOffset;
  const endLine = maxLines !== undefined ? startLine + maxLines : output.length;
  const visibleLines = output.slice(startLine, endLine);

  return (
    <Box flexDirection="column">
      {visibleLines.map((line, i) => (
        <AnsiLineText key={startLine + i} line={line} />
      ))}
    </Box>
  );
};

/**
 * Helper function to check if output is AnsiOutput format
 */
export function isAnsiOutput(data: any): data is AnsiOutput {
  return Array.isArray(data) && data.every(line =>
    Array.isArray(line) && line.every(token =>
      typeof token === 'object' &&
      'text' in token &&
      'bold' in token &&
      'italic' in token
    )
  );
}
