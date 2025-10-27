/**
 * Shortcut Bar Component
 * Zellij-like keyboard shortcut display at the bottom of the screen
 * Responsive design adapts to terminal width with priority-based display
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ShortcutBarProps {
  view?: string;
  isStreaming?: boolean;
  showLabels?: boolean;  // Zellij-style: show labels when Ctrl is held
}

// Force exact colors (hex) to override terminal themes
// Color scheme inspired by modern terminal themes with better contrast

// Key colors - vibrant and eye-catching
const KEY_BG_ESSENTIAL = '#EC4899';  // Pink - for essential actions (Help, Stop)
const KEY_BG_HIGH = '#8B5CF6';       // Purple - for high priority (List, Agent, MCP)
const KEY_BG_MEDIUM = '#3B82F6';     // Blue - for medium priority (Todos, Search)
const KEY_BG_LOW = '#6B7280';        // Gray - for low priority (optional features)

// Text colors
const KEY_TEXT = '#000000';          // Black text on colored keys
const LABEL_TEXT = '#F9FAFB';        // Almost white for labels
const SEPARATOR = '#4B5563';         // Muted gray for separators
const OVERFLOW_TEXT = '#9CA3AF';     // Dim for overflow indicator

// Background
const BAR_BG = '#1F2937';            // Dark background for the bar

interface Shortcut {
  key: string;
  label: string;          // Full label (e.g., "Search")
  shortLabel?: string;    // Short label (e.g., "Srch")
  minLabel?: string;      // Minimal label (e.g., "S")
  priority: 1 | 2 | 3 | 4;  // 1=essential, 2=high, 3=medium, 4=low
  condition?: (view: string, isStreaming: boolean) => boolean;
}

const SHORTCUTS: Shortcut[] = [
  // Essential - always show
  { key: 'H', label: 'Help', shortLabel: 'Help', minLabel: 'H', priority: 1 },
  { key: 'Esc', label: 'Stop', shortLabel: 'Stop', minLabel: 'X', priority: 1, condition: (_, isStreaming) => isStreaming },

  // High priority - core features
  { key: 'L', label: 'List', shortLabel: 'List', minLabel: 'L', priority: 2 },
  { key: 'A', label: 'Agent', shortLabel: 'Agnt', minLabel: 'A', priority: 2 },
  { key: 'T', label: 'MCP', shortLabel: 'MCP', minLabel: 'M', priority: 2 },

  // Medium priority - useful features
  { key: 'D', label: 'Todos', shortLabel: 'Todo', minLabel: 'D', priority: 3, condition: (view) => view === 'chat' },
  { key: 'R', label: 'Search', shortLabel: 'Srch', minLabel: 'R', priority: 3, condition: (view) => view === 'chat' },
  { key: 'O', label: 'Verbose', shortLabel: 'Verb', minLabel: 'O', priority: 3, condition: (view) => view === 'chat' },

  // Low priority - optional features
  { key: 'B', label: 'Branch', shortLabel: 'Brnch', minLabel: 'B', priority: 4, condition: (view) => view === 'chat' },
  { key: '/', label: 'Cmd', shortLabel: 'Cmd', minLabel: '/', priority: 4, condition: (view) => view === 'chat' },
  { key: '@', label: 'File', shortLabel: 'File', minLabel: '@', priority: 4, condition: (view) => view === 'chat' },
];

/**
 * Get color for key background based on priority
 * Applies Gestalt principle of Similarity - similar items have similar colors
 */
const getKeyColor = (priority: number): string => {
  switch (priority) {
    case 1: return KEY_BG_ESSENTIAL;  // Pink - most important
    case 2: return KEY_BG_HIGH;       // Purple - high priority
    case 3: return KEY_BG_MEDIUM;     // Blue - medium priority
    case 4: return KEY_BG_LOW;        // Gray - low priority
    default: return KEY_BG_LOW;
  }
};

/**
 * Calculate estimated width of a shortcut item
 * Format: " KEY Label " with spacing
 */
const getShortcutWidth = (key: string, label: string): number => {
  // Format: " KEY " + " Label " + separator
  return 1 + key.length + 2 + label.length + 2 + 1;
};

/**
 * Select appropriate label based on available width
 */
const getLabelForWidth = (shortcut: Shortcut, widthClass: 'full' | 'short' | 'min'): string => {
  switch (widthClass) {
    case 'full':
      return shortcut.label;
    case 'short':
      return shortcut.shortLabel || shortcut.label;
    case 'min':
      return shortcut.minLabel || shortcut.key;
  }
};

/**
 * Get visible shortcuts - Zellij style: all keys that fit
 */
const getVisibleShortcuts = (
  shortcuts: Shortcut[],
  terminalWidth: number,
  view: string,
  isStreaming: boolean
): Shortcut[] => {
  // Filter by conditions
  const eligible = shortcuts.filter(shortcut => {
    if (!shortcut.condition) return true;
    return shortcut.condition(view, isStreaming);
  });

  // Sort by priority (1=essential first, 4=optional last)
  const sorted = [...eligible].sort((a, b) => a.priority - b.priority);

  // Calculate space for each key (just " K " format = 3 chars + 1 separator)
  const keyWidth = 4; // " K "
  const separatorWidth = 2; // spacing
  const groupSeparatorWidth = 3; // wider spacing between groups

  let usedWidth = 2; // Start padding
  const result: Shortcut[] = [];
  let lastPriority: number | null = null;

  for (const shortcut of sorted) {
    // Check for group separator
    const needsGroupSep = lastPriority !== null && lastPriority !== shortcut.priority;
    const itemWidth = keyWidth + (needsGroupSep ? groupSeparatorWidth : separatorWidth);

    if (usedWidth + itemWidth <= terminalWidth - 2) {
      result.push(shortcut);
      usedWidth += itemWidth;
      lastPriority = shortcut.priority;
    } else if (shortcut.priority === 1) {
      // Always try to fit essential shortcuts
      if (usedWidth + keyWidth <= terminalWidth - 2) {
        result.push(shortcut);
        usedWidth += keyWidth;
      }
    }
  }

  return result;
};

export const ShortcutBar: React.FC<ShortcutBarProps> = ({
  view = 'chat',
  isStreaming = false,
  showLabels = false
}) => {
  // Get terminal width
  const terminalWidth = process.stdout.columns || 80;

  // Get shortcuts that fit
  const visibleShortcuts = getVisibleShortcuts(SHORTCUTS, terminalWidth, view, isStreaming);

  // Check if some shortcuts were hidden
  const allEligible = SHORTCUTS.filter(shortcut => {
    if (!shortcut.condition) return true;
    return shortcut.condition(view, isStreaming);
  });
  const hasOverflow = visibleShortcuts.length < allEligible.length;

  // Group shortcuts by priority for visual separation
  let lastPriority: number | null = null;

  return (
    <Box flexDirection="column" backgroundColor={BAR_BG}>
      {/* Row 1: Keys only - always visible */}
      <Box flexDirection="row" gap={0} paddingX={1} paddingY={0}>
        {visibleShortcuts.map((shortcut, index) => {
          const keyColor = getKeyColor(shortcut.priority);

          // Check if next shortcut is in a different priority group
          const nextShortcut = visibleShortcuts[index + 1];
          const isGroupBoundary = nextShortcut && nextShortcut.priority !== shortcut.priority;
          const isLastKey = index === visibleShortcuts.length - 1;

          return (
            <React.Fragment key={index}>
              {/* The key with colored background */}
              <Text backgroundColor={keyColor} color={KEY_TEXT} bold> {shortcut.key} </Text>

              {/* Spacing after key - wider at group boundaries */}
              {!isLastKey && (
                <Text backgroundColor={BAR_BG}>{isGroupBoundary ? '    ' : '  '}</Text>
              )}
            </React.Fragment>
          );
        })}

        {/* Overflow indicator */}
        {hasOverflow && (
          <>
            <Text backgroundColor={BAR_BG}>  </Text>
            <Text backgroundColor={BAR_BG} color={OVERFLOW_TEXT}>…</Text>
          </>
        )}
      </Box>

      {/* Row 2: Labels - only visible when Ctrl is held (Zellij style) */}
      {showLabels && (
        <Box flexDirection="row" gap={0} paddingX={1} paddingY={0}>
          {visibleShortcuts.map((shortcut, index) => {
            // Check if next shortcut is in a different priority group
            const nextShortcut = visibleShortcuts[index + 1];
            const isGroupBoundary = nextShortcut && nextShortcut.priority !== shortcut.priority;
            const isLastKey = index === visibleShortcuts.length - 1;

            // Use short labels for better fit - truncate to max 3 chars
            const label = (shortcut.shortLabel || shortcut.label).slice(0, 3);
            // Center the label under the key (key is 3 chars " K ")
            // Ensure result is ALWAYS exactly 3 chars
            const leftPad = Math.floor((3 - label.length) / 2);
            const rightPad = 3 - label.length - leftPad;
            const paddedLabel = ' '.repeat(leftPad) + label + ' '.repeat(rightPad);

            return (
              <React.Fragment key={index}>
                {/* Label under key */}
                <Text backgroundColor={BAR_BG} color={LABEL_TEXT} dimColor>{paddedLabel}</Text>

                {/* Spacing after label - match key spacing */}
                {!isLastKey && (
                  <Text backgroundColor={BAR_BG}>{isGroupBoundary ? '    ' : '  '}</Text>
                )}
              </React.Fragment>
            );
          })}
        </Box>
      )}

      {/* Hint text when not showing labels */}
      {!showLabels && (
        <Box paddingX={1} paddingY={0}>
          <Text backgroundColor={BAR_BG} color={OVERFLOW_TEXT} dimColor>Press Ctrl+? for labels</Text>
        </Box>
      )}
    </Box>
  );
};
