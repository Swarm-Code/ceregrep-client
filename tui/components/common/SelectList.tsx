/**
 * SelectList Component
 * Reusable arrow-key navigable list for TUI
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

// Color constants
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';
const BLUE = '#4169E1';
const PURPLE = '#A855F7';

export interface SelectListItem {
  id: string;
  label: string;
  description?: string;
  status?: 'active' | 'inactive' | 'error' | 'warning';
  statusText?: string;
  badge?: string;
  icon?: string;
}

export interface SelectListAction {
  key: string;
  label: string;
  description: string;
}

export interface SelectListProps {
  items: SelectListItem[];
  selectedIndex?: number;
  title?: string;
  emptyMessage?: string;
  actions?: SelectListAction[];
  onSelect?: (item: SelectListItem, index: number) => void;
  onAction?: (key: string, item?: SelectListItem, index?: number) => void;
  onCancel?: () => void;
  filterPlaceholder?: string;
  enableFilter?: boolean;
  maxVisibleItems?: number;
}

export const SelectList: React.FC<SelectListProps> = ({
  items,
  selectedIndex: initialSelectedIndex = 0,
  title,
  emptyMessage = 'No items',
  actions = [],
  onSelect,
  onAction,
  onCancel,
  filterPlaceholder = 'Type to filter...',
  enableFilter = false,
  maxVisibleItems = 10,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [filterText, setFilterText] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // Filter items based on filter text
  const filteredItems = enableFilter && filterText
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(filterText.toLowerCase()) ||
          item.description?.toLowerCase().includes(filterText.toLowerCase())
      )
    : items;

  // Reset selected index if it's out of bounds
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // Handle keyboard input
  useInput((input, key) => {
    // If filtering mode
    if (isFiltering) {
      if (key.escape) {
        setIsFiltering(false);
        setFilterText('');
        return;
      }
      if (key.return) {
        setIsFiltering(false);
        return;
      }
      if (key.backspace || key.delete) {
        setFilterText(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setFilterText(prev => prev + input);
        return;
      }
      return;
    }

    // Normal navigation mode
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      return;
    }

    if (key.return && filteredItems.length > 0) {
      const selectedItem = filteredItems[selectedIndex];
      if (selectedItem && onSelect) {
        onSelect(selectedItem, selectedIndex);
      }
      return;
    }

    if (key.escape && onCancel) {
      onCancel();
      return;
    }

    // Enable filter mode with '/'
    if (enableFilter && input === '/' && !isFiltering) {
      setIsFiltering(true);
      return;
    }

    // Action keys
    if (onAction && input) {
      const selectedItem = filteredItems.length > 0 ? filteredItems[selectedIndex] : undefined;
      onAction(input, selectedItem, selectedIndex);
    }
  });

  // Calculate visible window for scrolling
  const getVisibleWindow = () => {
    if (filteredItems.length <= maxVisibleItems) {
      return { start: 0, end: filteredItems.length };
    }

    let start = Math.max(0, selectedIndex - Math.floor(maxVisibleItems / 2));
    let end = start + maxVisibleItems;

    if (end > filteredItems.length) {
      end = filteredItems.length;
      start = Math.max(0, end - maxVisibleItems);
    }

    return { start, end };
  };

  const { start, end } = getVisibleWindow();
  const visibleItems = filteredItems.slice(start, end);
  const hasMore = {
    above: start > 0,
    below: end < filteredItems.length,
  };

  // Status color helper
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return GREEN;
      case 'inactive':
        return DIM_WHITE;
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return WHITE;
    }
  };

  return (
    <Box flexDirection="column">
      {/* Title */}
      {title && (
        <Box marginBottom={1}>
          <Text bold color={PURPLE}>
            {title}
          </Text>
        </Box>
      )}

      {/* Filter indicator */}
      {isFiltering && (
        <Box marginBottom={1}>
          <Text color={CYAN}>
            / {filterText}
            <Text dimColor>_</Text>
          </Text>
          <Text color={DIM_WHITE} dimColor>
            {' '}
            (Esc to cancel)
          </Text>
        </Box>
      )}

      {/* Filter status */}
      {enableFilter && filterText && !isFiltering && (
        <Box marginBottom={1}>
          <Text color={CYAN}>
            Filtered: {filteredItems.length} / {items.length}
          </Text>
          <Text color={DIM_WHITE} dimColor>
            {' '}
            (/ to filter again)
          </Text>
        </Box>
      )}

      {/* List */}
      <Box flexDirection="column" borderStyle="single" borderColor={CYAN} paddingX={1}>
        {/* Scroll indicator - above */}
        {hasMore.above && (
          <Box>
            <Text color={DIM_WHITE} dimColor>
              ↑ {start} more above
            </Text>
          </Box>
        )}

        {/* Items */}
        {filteredItems.length === 0 ? (
          <Box paddingY={1}>
            <Text color={DIM_WHITE} dimColor>
              {emptyMessage}
            </Text>
          </Box>
        ) : (
          visibleItems.map((item, idx) => {
            const absoluteIndex = start + idx;
            const isSelected = absoluteIndex === selectedIndex;

            return (
              <Box key={item.id}>
                <Text bold={isSelected} color={isSelected ? CYAN : WHITE}>
                  {isSelected ? '● ' : '  '}
                  {item.icon ? `${item.icon} ` : ''}
                  {item.label}
                </Text>
                {item.badge && (
                  <Text color={BLUE}> [{item.badge}]</Text>
                )}
                {item.statusText && (
                  <Text color={getStatusColor(item.status)}>
                    {' '}
                    {item.statusText}
                  </Text>
                )}
                {item.description && !isSelected && (
                  <Text color={DIM_WHITE} dimColor>
                    {' '}
                    - {item.description}
                  </Text>
                )}
                {item.description && isSelected && (
                  <Box paddingLeft={4}>
                    <Text color={DIM_WHITE}>{item.description}</Text>
                  </Box>
                )}
              </Box>
            );
          })
        )}

        {/* Scroll indicator - below */}
        {hasMore.below && (
          <Box>
            <Text color={DIM_WHITE} dimColor>
              ↓ {filteredItems.length - end} more below
            </Text>
          </Box>
        )}
      </Box>

      {/* Actions */}
      {actions.length > 0 && (
        <Box marginTop={1}>
          <Text color={DIM_WHITE} dimColor>
            {actions.map((action, idx) => (
              <React.Fragment key={action.key}>
                {idx > 0 && ' │ '}
                <Text bold color={CYAN}>
                  {action.label}
                </Text>
                {' '}
                {action.description}
              </React.Fragment>
            ))}
          </Text>
        </Box>
      )}
    </Box>
  );
};
