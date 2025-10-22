/**
 * ShellInputPrompt Component
 * Invisible component that captures keyboard input when in shell mode
 * and forwards it directly to the active PTY process
 *
 * This component renders nothing visible (returns null) but uses useInput
 * to capture all keyboard events and convert them to ANSI sequences.
 */

import React, { useRef, useEffect } from 'react';
import { useInput } from 'ink';
import { keyToAnsi, shouldHandleInTUI } from '../utils/keyToAnsi.js';
import { ShellExecutionService } from '../../services/shell-execution.js';

interface ShellInputPromptProps {
  /** The PID of the active shell process */
  pid: number;
  /** Callback when shell mode should exit (e.g., Escape pressed) */
  onExit?: () => void;
  /** Whether to allow Escape to exit shell mode (default: true) */
  allowEscapeExit?: boolean;
}

export const ShellInputPrompt: React.FC<ShellInputPromptProps> = ({
  pid,
  onExit,
  allowEscapeExit = true,
}) => {
  const lastCtrlCPress = useRef<number>(0);

  // Verify PTY is still active
  useEffect(() => {
    const checkPty = setInterval(() => {
      if (!ShellExecutionService.isPtyActive(pid)) {
        // PTY has exited, leave shell mode
        if (onExit) {
          onExit();
        }
      }
    }, 500);

    return () => clearInterval(checkPty);
  }, [pid, onExit]);

  // Capture all keyboard input and forward to PTY
  useInput((input, key) => {
    // Check if PTY is still active
    if (!ShellExecutionService.isPtyActive(pid)) {
      if (onExit) {
        onExit();
      }
      return;
    }

    // Handle Escape key to exit shell mode
    if (allowEscapeExit && key.escape) {
      if (onExit) {
        onExit();
      }
      return;
    }

    // Special handling for Ctrl+C - allow double-tap to exit
    if (key.ctrl && input === 'c') {
      const now = Date.now();
      const timeSinceLastPress = now - lastCtrlCPress.current;

      if (timeSinceLastPress < 1000) {
        // Double Ctrl+C within 1 second - exit shell mode
        if (onExit) {
          onExit();
        }
        return;
      }

      lastCtrlCPress.current = now;
      // Fall through to send to PTY
    }

    // Convert key to ANSI sequence
    const ansiSequence = keyToAnsi(input, key);

    if (ansiSequence) {
      try {
        // Write to PTY
        ShellExecutionService.writeToPty(pid, ansiSequence);
      } catch (error) {
        console.error('Failed to write to PTY:', error);
        // PTY write failed, exit shell mode
        if (onExit) {
          onExit();
        }
      }
    }
  });

  // Render nothing - this component only captures input
  return null;
};
