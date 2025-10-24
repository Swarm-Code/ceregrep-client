/**
 * Prompt Search Component
 * Search and select from prompt history
 */

import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { SelectList, SelectListItem, SelectListAction } from './common/SelectList.js';
import { PromptHistoryEntry } from '../prompt-history.js';

interface PromptSearchProps {
  prompts: PromptHistoryEntry[];
  onSelect: (text: string) => void;
  onCancel: () => void;
}

// Color constants
const CYAN = '#22D3EE';
const DIM_WHITE = '#9CA3AF';

/**
 * Format a timestamp as relative time
 * e.g., "5 minutes ago", "2 hours ago", "3 days ago"
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return diffSec === 1 ? '1 second ago' : `${diffSec} seconds ago`;
  } else if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  } else if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  } else if (diffDay < 7) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  } else if (diffWeek < 4) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;
  } else if (diffMonth < 12) {
    return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
  } else {
    return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
  }
}

export const PromptSearch: React.FC<PromptSearchProps> = ({
  prompts,
  onSelect,
  onCancel,
}) => {
  // Convert prompts to SelectListItems
  const promptItems: SelectListItem[] = useMemo(() => {
    return prompts.map((prompt) => {
      // Truncate long prompts
      const displayText = prompt.text.length > 80
        ? prompt.text.slice(0, 77) + '...'
        : prompt.text;

      return {
        id: prompt.id,
        label: displayText,
        description: formatRelativeTime(prompt.timestamp),
      };
    });
  }, [prompts]);

  const handleSelect = (item: SelectListItem) => {
    // Find the original prompt by ID
    const prompt = prompts.find(p => p.id === item.id);
    if (prompt) {
      onSelect(prompt.text);
    }
  };

  // Handle keyboard input for empty state
  useInput((input, key) => {
    if (promptItems.length === 0 && key.escape) {
      onCancel();
    }
  });

  const listActions: SelectListAction[] = [
    { key: '↑↓', label: '↑↓', description: 'Navigate' },
    { key: 'Enter', label: 'Enter', description: 'Select' },
    { key: '/', label: '/', description: 'Search' },
    { key: 'Esc', label: 'Esc', description: 'Cancel' },
  ];

  if (promptItems.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={CYAN} bold>PROMPT HISTORY</Text>
        <Box marginTop={1}>
          <Text color={DIM_WHITE}>No prompts in history yet.</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={DIM_WHITE}>Press Esc to go back.</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <SelectList
        title="PROMPT HISTORY"
        items={promptItems}
        actions={listActions}
        onSelect={handleSelect}
        onCancel={onCancel}
        enableFilter={true}
        maxVisibleItems={15}
      />
    </Box>
  );
};
