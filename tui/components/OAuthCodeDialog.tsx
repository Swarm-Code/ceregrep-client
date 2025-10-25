/**
 * @license
 * Copyright 2025 Vybestack LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OAuth Code Input Dialog Component
 *
 * Allows users to paste authorization code from browser
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

// Colors matching the rest of the UI
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM = '#6B7280';

interface OAuthCodeDialogProps {
  provider: string;
  onClose: () => void;
  onSubmit: (code: string) => void;
}

/**
 * @plan PLAN-20250822-GEMINIFALLBACK.P09
 * @requirement REQ-002.1
 * @pseudocode lines 38-45
 */
export const OAuthCodeDialog: React.FC<OAuthCodeDialogProps> = ({
  provider,
  onClose,
  onSubmit,
}) => {
  const [code, setCode] = useState('');

  /**
   * @plan PLAN-20250822-GEMINIFALLBACK.P09
   * @requirement REQ-002.1, REQ-006.2
   * @pseudocode lines 38-45
   */
  const getInstructions = useCallback((): string[] => {
    if (provider === 'gemini') {
      return [
        'The OAuth URL has been copied to your clipboard.',
        'Please paste it into your browser to authenticate with Google.',
        'After authenticating, paste the verification code you receive below:',
      ];
    } else {
      return [
        'Please check your browser and authorize the application.',
        'After authorizing, paste the authorization code below:',
      ];
    }
  }, [provider]);

  /**
   * Handle escape key to close dialog
   */
  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  /**
   * Handle code submission
   */
  const handleSubmit = useCallback(() => {
    if (code.trim()) {
      onSubmit(code.trim());
      onClose();
    }
  }, [code, onSubmit, onClose]);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={CYAN}
      paddingX={2}
      paddingY={1}
      marginX={2}
      marginY={1}
    >
      <Text bold color={CYAN}>
        {provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth
        Authentication
      </Text>
      {getInstructions().map((instruction, index) => (
        <Text key={index} color={WHITE}>
          {instruction}
        </Text>
      ))}
      <Box marginTop={1} flexDirection="row" alignItems="center">
        <Text color={CYAN}>Code: </Text>
        <TextInput
          value={code}
          onChange={setCode}
          onSubmit={handleSubmit}
          placeholder="Paste authorization code here"
        />
      </Box>
      <Box marginTop={1}>
        <Text color={DIM}>
          Enter to submit • Escape to cancel
        </Text>
      </Box>
    </Box>
  );
};
