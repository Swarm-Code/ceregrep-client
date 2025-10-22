/**
 * Example Usage of keyToAnsi Utility
 * Demonstrates how to use keyToAnsi in a real TUI component
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { keyToAnsi, shouldHandleInTUI } from './keyToAnsi.js';

/**
 * Example 1: Simple PTY Integration
 * Forwards all key events to a pseudo-terminal
 */
export const SimplePTYExample: React.FC<{ pty: any }> = ({ pty }) => {
  useInput((input, key) => {
    // Convert key to ANSI sequence
    const ansiSequence = keyToAnsi(input, key);

    if (ansiSequence) {
      // Send to PTY
      pty.write(ansiSequence);
    }
  });

  return <Text>Terminal output here...</Text>;
};

/**
 * Example 2: TUI with Command Interception
 * Handles some keys in the TUI, forwards others to PTY
 */
export const SmartPTYExample: React.FC<{ pty: any; onExit: () => void }> = ({
  pty,
  onExit,
}) => {
  const [output, setOutput] = useState('');

  useInput((input, key) => {
    // Check if TUI should handle this key
    if (shouldHandleInTUI(input, key)) {
      if (key.ctrl && input === 'c') {
        // Graceful exit
        onExit();
        return;
      }
    }

    // Otherwise, convert and send to PTY
    const ansiSequence = keyToAnsi(input, key);
    if (ansiSequence) {
      pty.write(ansiSequence);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Press Ctrl+C to exit, or interact with terminal:</Text>
      <Text>{output}</Text>
    </Box>
  );
};

/**
 * Example 3: Debug Mode - Show ANSI Sequences
 * Useful for debugging terminal interactions
 */
export const DebugKeyExample: React.FC = () => {
  const [lastKey, setLastKey] = useState<string>('');
  const [lastAnsi, setLastAnsi] = useState<string>('');

  useInput((input, key) => {
    const ansiSequence = keyToAnsi(input, key);

    // Format key info
    const keyInfo = Object.entries(key)
      .filter(([_, value]) => value === true)
      .map(([name]) => name)
      .join(', ');

    setLastKey(input ? `'${input}' + ${keyInfo}` : keyInfo);
    setLastAnsi(ansiSequence ? formatAnsi(ansiSequence) : 'null');
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">Key Debug Mode</Text>
      <Text>Last Key: {lastKey}</Text>
      <Text>ANSI Sequence: {lastAnsi}</Text>
    </Box>
  );
};

// Helper to format ANSI sequences for display
function formatAnsi(seq: string): string {
  return seq
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code < 32 || code === 127) {
        return `\\x${code.toString(16).padStart(2, '0')}`;
      }
      return char;
    })
    .join('');
}

/**
 * Example 4: Terminal Emulator with Mode Support
 * Shows how to handle different terminal modes
 */
export const TerminalEmulatorExample: React.FC<{ pty: any }> = ({ pty }) => {
  const [mode, setMode] = useState<'normal' | 'insert'>('normal');

  useInput((input, key) => {
    // Handle mode switching (like vim)
    if (mode === 'normal') {
      if (input === 'i') {
        setMode('insert');
        return;
      }
      // In normal mode, handle navigation
      // Don't send to PTY
      return;
    }

    if (mode === 'insert') {
      if (key.escape) {
        setMode('normal');
        return;
      }

      // In insert mode, send everything to PTY
      const ansiSequence = keyToAnsi(input, key);
      if (ansiSequence) {
        pty.write(ansiSequence);
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text color={mode === 'insert' ? 'green' : 'blue'}>
        Mode: {mode.toUpperCase()}
      </Text>
      <Text>
        {mode === 'normal'
          ? 'Press i to enter insert mode'
          : 'Press ESC to exit insert mode'}
      </Text>
    </Box>
  );
};

/**
 * Example 5: Selective Key Forwarding
 * Demonstrates filtering which keys to send to PTY
 */
export const SelectiveForwardingExample: React.FC<{ pty: any }> = ({ pty }) => {
  const [captureMode, setCaptureMode] = useState(false);

  useInput((input, key) => {
    // F1 toggles capture mode
    if ('name' in key && key.name === 'f1') {
      setCaptureMode(!captureMode);
      return;
    }

    if (!captureMode) {
      // Don't forward when capture is off
      return;
    }

    // Forward to PTY
    const ansiSequence = keyToAnsi(input, key);
    if (ansiSequence) {
      pty.write(ansiSequence);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>F1 to toggle capture mode</Text>
      <Text color={captureMode ? 'green' : 'red'}>
        Capture: {captureMode ? 'ON' : 'OFF'}
      </Text>
    </Box>
  );
};

/**
 * Example 6: Key Macro System
 * Shows how to intercept and expand key combinations
 */
export const KeyMacroExample: React.FC<{ pty: any }> = ({ pty }) => {
  // Define macros
  const macros: Record<string, string> = {
    'ctrl+g': 'git status\r',
    'ctrl+p': 'npm run build\r',
  };

  useInput((input, key) => {
    // Check for macro
    let macroKey = '';
    if (key.ctrl && input) {
      macroKey = `ctrl+${input}`;
    }

    if (macroKey in macros) {
      // Expand macro - send raw string
      pty.write(macros[macroKey]);
      return;
    }

    // Normal key handling
    const ansiSequence = keyToAnsi(input, key);
    if (ansiSequence) {
      pty.write(ansiSequence);
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Available Macros:</Text>
      <Text>  Ctrl+G - git status</Text>
      <Text>  Ctrl+P - npm run build</Text>
    </Box>
  );
};

/**
 * Example 7: Complete Terminal Panel with Full Features
 * Production-ready example with all best practices
 */
interface TerminalPanelProps {
  pty: any;
  onExit?: () => void;
  enableMacros?: boolean;
  debugMode?: boolean;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  pty,
  onExit,
  enableMacros = false,
  debugMode = false,
}) => {
  const [lastKey, setLastKey] = useState('');

  useInput((input, key) => {
    // Debug output
    if (debugMode) {
      const ansiSeq = keyToAnsi(input, key);
      setLastKey(ansiSeq ? formatAnsi(ansiSeq) : 'null');
    }

    // Handle TUI-specific keys
    if (shouldHandleInTUI(input, key)) {
      if (key.ctrl && input === 'c') {
        onExit?.();
        return;
      }
    }

    // Check for macros
    if (enableMacros && key.ctrl) {
      // Handle macro expansion here
      // (simplified for example)
    }

    // Convert and forward to PTY
    const ansiSequence = keyToAnsi(input, key);
    if (ansiSequence) {
      try {
        pty.write(ansiSequence);
      } catch (error) {
        console.error('Failed to write to PTY:', error);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {debugMode && (
        <Box borderStyle="single" borderColor="gray">
          <Text color="gray">Last ANSI: {lastKey}</Text>
        </Box>
      )}
      {/* Terminal output would be rendered here */}
    </Box>
  );
};

/**
 * Example 8: Testing Helper
 * Useful for unit tests
 */
export function simulateKeyPress(
  input: string,
  keyOverrides: Partial<any> = {}
): string | null {
  const key = {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageDown: false,
    pageUp: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    ...keyOverrides,
  };

  return keyToAnsi(input, key);
}

// Usage in tests:
// const ctrlC = simulateKeyPress('c', { ctrl: true });
// expect(ctrlC).toBe('\x03');
