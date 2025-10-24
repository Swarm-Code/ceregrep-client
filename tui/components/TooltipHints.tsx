/**
 * Tooltip Hints Component
 * Shows rotating helpful tips to teach users about features
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Force exact colors (hex) to override terminal themes
const YELLOW = '#F59E0B';
const DIM_WHITE = '#9CA3AF';
const DARK_YELLOW = '#92400E';

interface Tip {
  text: string;
  category: 'navigation' | 'shortcuts' | 'features' | 'efficiency';
}

const TIPS: Tip[] = [
  { text: 'Press Ctrl+R to fuzzy search through your prompt history, just like fzf!', category: 'shortcuts' },
  { text: 'Use @ to attach files to your prompt. Type @ followed by a filename to search.', category: 'features' },
  { text: 'Press ↑/↓ arrows to navigate through your recent prompts without searching.', category: 'navigation' },
  { text: 'Use Ctrl+← and Ctrl+→ to navigate back through conversation history.', category: 'navigation' },
  { text: 'Press Ctrl+B to view and switch between conversation branches.', category: 'features' },
  { text: 'Type / to see all available commands with fuzzy autocomplete.', category: 'shortcuts' },
  { text: 'Use Ctrl+F to fork the conversation at any point in history.', category: 'features' },
  { text: 'Press Ctrl+O to toggle between verbose and compact message views.', category: 'shortcuts' },
  { text: 'Ctrl+L shows all your saved conversations. You can switch between them anytime.', category: 'navigation' },
  { text: 'Press Ctrl+A to view and switch between different AI agents.', category: 'features' },
  { text: 'Use /checkpoint to save your current conversation state for later.', category: 'features' },
  { text: 'Press Ctrl+T to manage MCP tools and servers for extended capabilities.', category: 'features' },
  { text: 'Escape stops the AI mid-response if you need to interrupt it.', category: 'shortcuts' },
  { text: 'Use /new to start a fresh conversation while keeping your history.', category: 'efficiency' },
  { text: 'Ctrl+0 returns you to the latest message in live mode.', category: 'navigation' },
  { text: 'Type /compact to summarize long conversations and reduce token usage.', category: 'efficiency' },
];

interface TooltipHintsProps {
  enabled?: boolean;
  intervalSeconds?: number;
}

export const TooltipHints: React.FC<TooltipHintsProps> = ({
  enabled = true,
  intervalSeconds = 45
}) => {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);
  const [seenTips, setSeenTips] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Show first tip after 10 seconds
    const initialTimeout = setTimeout(() => {
      showNextTip();
    }, 10000);

    return () => clearTimeout(initialTimeout);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !visible) return;

    // Hide tip after 8 seconds
    const hideTimeout = setTimeout(() => {
      setVisible(false);
    }, 8000);

    // Schedule next tip
    const nextTipTimeout = setTimeout(() => {
      showNextTip();
    }, intervalSeconds * 1000);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(nextTipTimeout);
    };
  }, [visible, enabled, intervalSeconds]);

  const showNextTip = () => {
    // Reset if we've seen all tips
    if (seenTips.size >= TIPS.length) {
      setSeenTips(new Set());
    }

    // Find unseen tips
    const unseenIndices = TIPS
      .map((_, index) => index)
      .filter(index => !seenTips.has(index));

    if (unseenIndices.length === 0) {
      // All tips seen, start over
      setSeenTips(new Set());
      setCurrentTip(TIPS[0]);
      setVisible(true);
      return;
    }

    // Pick random unseen tip
    const randomIndex = unseenIndices[Math.floor(Math.random() * unseenIndices.length)];
    setCurrentTip(TIPS[randomIndex]);
    setSeenTips(new Set([...seenTips, randomIndex]));
    setVisible(true);
  };

  if (!enabled || !visible || !currentTip) {
    return null;
  }

  return (
    <Box paddingX={1} marginBottom={0}>
      <Text color={YELLOW}>💡 </Text>
      <Text color={DIM_WHITE} dimColor>{currentTip.text}</Text>
    </Box>
  );
};
