/**
 * Input Box Component
 * Handles user input with command autocomplete
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { searchRepoFiles, FileResource } from '../../mcp/resources.js';

interface InputBoxProps {
  onSubmit: (value: string, attachedFiles?: string[]) => void;
  disabled?: boolean;
  modeColor?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilesAttached?: (files: string[]) => void;
}

// Available commands
const COMMANDS = [
  { name: '/new', description: 'Create new conversation', usage: '/new [title]' },
  { name: '/agent', description: 'Switch agent', usage: '/agent [id]' },
  { name: '/checkpoint', description: 'Create checkpoint', usage: '/checkpoint [description]' },
  { name: '/restore', description: 'Restore to checkpoint', usage: '/restore <checkpoint-id>' },
  { name: '/list', description: 'Show conversations', usage: '/list' },
  { name: '/mcp', description: 'Manage MCP servers and tools', usage: '/mcp' },
  { name: '/compact', description: 'Summarize and compact conversation', usage: '/compact' },
  { name: '/clear', description: 'Clear current conversation', usage: '/clear' },
  { name: '/help', description: 'Toggle help', usage: '/help' },
  { name: '/exit', description: 'Exit TUI', usage: '/exit' },
];

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';

export const InputBox: React.FC<InputBoxProps> = ({
  onSubmit,
  disabled = false,
  modeColor,
  value: externalValue,
  onChange: externalOnChange,
  onFilesAttached,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [fileSuggestions, setFileSuggestions] = useState<FileResource[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Use external value if provided, otherwise use internal state
  const value = externalValue !== undefined ? externalValue : internalValue;
  const setValue = externalOnChange || setInternalValue;

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value, attachedFiles);
      setValue('');
      setSelectedIndex(0);
      setAttachedFiles([]);
      setFileSuggestions([]);
    }
  };

  // Get terminal width for line
  const width = process.stdout.columns || 80;
  const line = '─'.repeat(width);

  // Use mode color or default to blue
  const lineColor = modeColor || BLUE;

  // Fuzzy match filter for commands
  const fuzzyMatch = (str: string, pattern: string): boolean => {
    const patternLower = pattern.toLowerCase();
    const strLower = str.toLowerCase();

    let patternIdx = 0;
    let strIdx = 0;

    while (patternIdx < patternLower.length && strIdx < strLower.length) {
      if (patternLower[patternIdx] === strLower[strIdx]) {
        patternIdx++;
      }
      strIdx++;
    }

    return patternIdx === patternLower.length;
  };

  // Detect @ mention and extract file search pattern
  const getAtMentionPattern = (text: string): string | null => {
    const cursorPos = text.length; // Since we're always at the end in this input
    const beforeCursor = text.slice(0, cursorPos);

    // Find the last @ symbol
    const lastAtIndex = beforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return null;

    // Extract the pattern after @
    const pattern = beforeCursor.slice(lastAtIndex + 1);

    // Check if pattern ends with a space (completed mention)
    if (pattern.includes(' ')) return null;

    return pattern;
  };

  const atMentionPattern = useMemo(() => getAtMentionPattern(value), [value]);

  // Search for files when @ mention is detected
  useEffect(() => {
    const searchFiles = async () => {
      if (atMentionPattern !== null) {
        setIsLoadingFiles(true);
        try {
          const files = await searchRepoFiles(atMentionPattern);
          setFileSuggestions(files); // Show all matches
        } catch (error) {
          console.error('Failed to search files:', error);
          setFileSuggestions([]);
        }
        setIsLoadingFiles(false);
      } else {
        setFileSuggestions([]);
      }
    };

    searchFiles();
  }, [atMentionPattern]);

  // Filter commands based on input with fuzzy matching
  const commandSuggestions = useMemo(() => {
    if (!value.startsWith('/') || value.length === 1) {
      return value === '/' ? COMMANDS : [];
    }

    const search = value.slice(1); // Remove leading '/'

    // Fuzzy match and score commands
    const matches = COMMANDS.filter(cmd =>
      fuzzyMatch(cmd.name.slice(1), search) // Remove leading '/' from cmd.name too
    );

    // Sort by relevance (starts with > contains > fuzzy)
    return matches.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const searchLower = search.toLowerCase();

      const aStartsWith = aName.startsWith('/' + searchLower);
      const bStartsWith = bName.startsWith('/' + searchLower);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      return aName.localeCompare(bName);
    });
  }, [value]);

  const showCommandSuggestions = commandSuggestions.length > 0 && value.startsWith('/');
  const showFileSuggestions = fileSuggestions.length > 0 && atMentionPattern !== null;

  // Calculate scrolling window for suggestions
  const VISIBLE_ITEMS = 5;
  const getVisibleWindow = (selectedIdx: number, totalItems: number) => {
    // Keep selected item in the middle when possible
    const halfWindow = Math.floor(VISIBLE_ITEMS / 2);
    let start = Math.max(0, selectedIdx - halfWindow);
    let end = Math.min(totalItems, start + VISIBLE_ITEMS);

    // Adjust start if we're at the end
    if (end - start < VISIBLE_ITEMS) {
      start = Math.max(0, end - VISIBLE_ITEMS);
    }

    return { start, end };
  };

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [commandSuggestions.length, fileSuggestions.length]);

  // Notify parent about attached files
  useEffect(() => {
    if (onFilesAttached) {
      onFilesAttached(attachedFiles);
    }
  }, [attachedFiles, onFilesAttached]);

  // Handle Tab completion and arrow navigation
  useInput((input, key) => {
    if (disabled) return;

    // Handle file suggestions
    if (showFileSuggestions) {
      // Tab: autocomplete with selected file
      if (key.tab) {
        const selected = fileSuggestions[selectedIndex];
        if (selected) {
          // Replace @pattern with @filename and add to attached files
          const lastAtIndex = value.lastIndexOf('@');
          const newValue = value.slice(0, lastAtIndex) + `@${selected.name} `;
          setValue(newValue);
          setAttachedFiles((prev) => [...prev, selected.absolutePath]);
          setSelectedIndex(0);
        }
        return;
      }

      // Arrow down: move selection down
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev + 1) % fileSuggestions.length);
        return;
      }

      // Arrow up: move selection up
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev - 1 + fileSuggestions.length) % fileSuggestions.length);
        return;
      }
    }

    // Handle command suggestions
    if (showCommandSuggestions) {
      // Tab: autocomplete with selected command
      if (key.tab) {
        const selected = commandSuggestions[selectedIndex];
        setValue(selected.name + ' ');
        setSelectedIndex(0);
        return;
      }

      // Arrow down: move selection down
      if (key.downArrow) {
        setSelectedIndex((prev) => (prev + 1) % commandSuggestions.length);
        return;
      }

      // Arrow up: move selection up
      if (key.upArrow) {
        setSelectedIndex((prev) => (prev - 1 + commandSuggestions.length) % commandSuggestions.length);
        return;
      }
    }
  });

  return (
    <Box flexDirection="column">
      {/* Top line */}
      <Text color={lineColor}>{line}</Text>

      {/* Input area */}
      <Box paddingX={1}>
        <Text color={lineColor} bold>▶ </Text>
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={disabled ? 'Waiting...' : 'Type a message or /help for commands...'}
          showCursor={!disabled}
        />
      </Box>

      {/* Bottom line */}
      <Text color={lineColor}>{line}</Text>

      {/* Attached files indicator */}
      {attachedFiles.length > 0 && (
        <Box paddingX={1}>
          <Text color={CYAN}>Attached: </Text>
          {attachedFiles.map((file, index) => (
            <Text key={index} color={DIM_WHITE}>
              {index > 0 && ', '}
              {file.split('/').pop()}
            </Text>
          ))}
        </Box>
      )}

      {/* File suggestions - compact, no header */}
      {showFileSuggestions && (() => {
        const window = getVisibleWindow(selectedIndex, fileSuggestions.length);
        const visibleFiles = fileSuggestions.slice(window.start, window.end);

        return (
          <Box flexDirection="column" paddingX={1}>
            {visibleFiles.map((file, idx) => {
              const actualIndex = window.start + idx;
              const isSelected = actualIndex === selectedIndex;
              const displayName = file.name.length > 60 ? '...' + file.name.slice(-57) : file.name;

              return (
                <Box key={actualIndex}>
                  <Text color={isSelected ? CYAN : DIM_WHITE}>
                    {isSelected ? '▶ ' : '  '}
                  </Text>
                  <Text color={isSelected ? CYAN : DIM_WHITE}>
                    {displayName}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })()}

      {/* Command suggestions - compact, no header */}
      {showCommandSuggestions && (() => {
        const window = getVisibleWindow(selectedIndex, commandSuggestions.length);
        const visibleCommands = commandSuggestions.slice(window.start, window.end);

        return (
          <Box flexDirection="column" paddingX={1}>
            {visibleCommands.map((cmd, idx) => {
              const actualIndex = window.start + idx;
              const isSelected = actualIndex === selectedIndex;

              // Highlight matching characters
              const search = value.slice(1).toLowerCase(); // Remove leading '/'
              const cmdName = cmd.name.toLowerCase();
              const highlighted: React.ReactNode[] = [];

              let searchIdx = 0;
              for (let i = 0; i < cmd.usage.length; i++) {
                const char = cmd.usage[i];
                const charLower = char.toLowerCase();

                if (searchIdx < search.length && charLower === search[searchIdx]) {
                  // This character matches - highlight it
                  highlighted.push(
                    <Text key={i} color={isSelected ? CYAN : PURPLE} bold>
                      {char}
                    </Text>
                  );
                  searchIdx++;
                } else {
                  // Regular character
                  highlighted.push(
                    <Text key={i} color={isSelected ? CYAN : WHITE} bold={isSelected}>
                      {char}
                    </Text>
                  );
                }
              }

              return (
                <Box key={actualIndex}>
                  <Text color={isSelected ? CYAN : DIM_WHITE} bold={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                  </Text>
                  {highlighted}
                  <Text color={DIM_WHITE}> - {cmd.description}</Text>
                </Box>
              );
            })}
          </Box>
        );
      })()}
    </Box>
  );
};
