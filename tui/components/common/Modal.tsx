/**
 * Modal Component
 * Confirmation dialogs and alerts for TUI
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const RED = '#EF4444';
const YELLOW = '#F59E0B';
const GREEN = '#10B981';

export type ModalType = 'confirm' | 'alert' | 'error' | 'success';

export interface ModalProps {
  type: ModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const Modal: React.FC<ModalProps> = ({
  type,
  title,
  message,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}) => {
  useInput((input, key) => {
    if (type === 'confirm') {
      if (input === 'y' || key.return) {
        onConfirm?.();
        return;
      }
      if (input === 'n' || key.escape) {
        onCancel?.();
        return;
      }
    } else {
      // For alert/error/success, any key closes
      if (key.return || key.escape || input) {
        onConfirm?.();
        return;
      }
    }
  });

  const getTypeColor = () => {
    switch (type) {
      case 'error':
        return RED;
      case 'success':
        return GREEN;
      case 'confirm':
        return YELLOW;
      default:
        return CYAN;
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'error':
        return '✗';
      case 'success':
        return '✓';
      case 'confirm':
        return '?';
      default:
        return 'ℹ';
    }
  };

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center">
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor={getTypeColor()}
        paddingX={2}
        paddingY={1}
        minWidth={50}
      >
        {/* Title */}
        <Box marginBottom={1} justifyContent="center">
          <Text bold color={getTypeColor()}>
            {getTypeIcon()} {title}
          </Text>
        </Box>

        {/* Message */}
        <Box marginBottom={1} justifyContent="center">
          <Text color={WHITE}>{message}</Text>
        </Box>

        {/* Actions */}
        <Box justifyContent="center">
          {type === 'confirm' ? (
            <Text color={DIM_WHITE} dimColor>
              <Text bold color={GREEN}>
                {confirmLabel} (Y)
              </Text>
              {' │ '}
              <Text bold color={RED}>
                {cancelLabel} (N)
              </Text>
            </Text>
          ) : (
            <Text color={DIM_WHITE} dimColor>
              <Text bold color={CYAN}>
                Press any key to continue
              </Text>
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
