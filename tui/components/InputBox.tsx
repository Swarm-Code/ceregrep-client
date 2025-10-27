/**
 * Input Box Component
 * Handles user input with command autocomplete
 * PERFORMANCE OPTIMIZED: Uses debouncing and memoization
 */

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useImperativeHandle,
} from 'react';
import { Box, Text, useInput } from 'ink';
import { EfficientTextInput } from './common/EfficientTextInput.js';
import { loadResourcesFromWorker } from '../workers/resourceLoaderPool.js';
import { PromptHistoryEntry } from '../prompt-history.js';
import {
  readClipboardContent,
  clipboardImageToContentBlock,
  formatFileSize,
  isLargeText,
  createTextPreview,
} from '../../utils/clipboard.js';
import { randomUUID } from 'crypto';
import { log, logWithThreshold } from '../utils/diagnostics.js';

interface InputBoxProps {
  onSubmit: (value: string, attachedFiles?: string[], attachedImages?: ImageAttachment[]) => void;
  disabled?: boolean;
  modeColor?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFilesAttached?: (files: string[]) => void;
  onNavigateHistory?: (direction: 'up' | 'down') => void;
  promptHistory?: PromptHistoryEntry[];
}

export interface ImageAttachment {
  id: string;
  data: string; // base64
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  size: number;
  name?: string;
}

export interface InputBoxHandle {
  setValue: (value: string) => void;
  getValue: () => string;
  clearAttachments: () => void;
}

// Available commands
const COMMANDS = [
  { name: '/new', description: 'Create new conversation', usage: '/new [title]', requiresArgs: true },
  { name: '/agent', description: 'Switch agent', usage: '/agent [id]', requiresArgs: true },
  { name: '/model', description: 'Select AI provider', usage: '/model', requiresArgs: false },
  { name: '/permissions', description: 'Enable/disable tools', usage: '/permissions', requiresArgs: false },
  { name: '/checkpoint', description: 'Create checkpoint', usage: '/checkpoint [description]', requiresArgs: true },
  { name: '/restore', description: 'Restore to checkpoint', usage: '/restore <checkpoint-id>', requiresArgs: true },
  { name: '/list', description: 'Show conversations', usage: '/list', requiresArgs: false },
  { name: '/mcp', description: 'Manage MCP servers and tools', usage: '/mcp', requiresArgs: false },
  { name: '/compact', description: 'Summarize and compact conversation', usage: '/compact', requiresArgs: false },
  { name: '/clear', description: 'Clear current conversation', usage: '/clear', requiresArgs: false },
  { name: '/help', description: 'Toggle help', usage: '/help', requiresArgs: false },
  { name: '/exit', description: 'Exit TUI', usage: '/exit', requiresArgs: false },
];

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';

// PERFORMANCE: Memoize component to prevent unnecessary re-renders
// This component should ONLY re-render when its own props change, not when messages change
export const InputBox = React.memo(
  React.forwardRef<InputBoxHandle, InputBoxProps>(({
    onSubmit,
    disabled = false,
    modeColor,
    value: externalValue,
    onChange: externalOnChange,
    onFilesAttached,
    onNavigateHistory,
    promptHistory = [],
  }, ref) => {
    const [value, setValue] = useState(externalValue ?? '');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
    const [attachedImages, setAttachedImages] = useState<ImageAttachment[]>([]);
    const [fileSuggestions, setFileSuggestions] = useState<Array<{ uri: string; name: string; absolutePath: string }>>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [preSearchValue, setPreSearchValue] = useState('');
    const [cursorOverride, setCursorOverride] = useState<number | undefined>(undefined);
    const [pastePreview, setPastePreview] = useState<string | null>(null);

    const notifyChange = useCallback((next: string) => {
      const startTime = performance.now();
      log(`KEYSTROKE: char="${next.slice(-1)}" len=${next.length}`, false); // No stack trace (high frequency)
      if (externalOnChange) {
        externalOnChange(next);
      }
      const duration = performance.now() - startTime;
      if (duration > 0) {
        log(`KEYSTROKE_DONE: len=${next.length} took ${duration.toFixed(2)}ms`, false); // No stack trace
      }
    }, [externalOnChange]);

    const applyValue = useCallback((next: string, cursor?: number) => {
      setValue(next);
      notifyChange(next);
      if (typeof cursor === 'number') {
        setCursorOverride(Math.max(0, cursor));
      } else {
        setCursorOverride(undefined);
      }
    }, [notifyChange]);

    // Keep internal state in sync when parent provides a controlled value
    useEffect(() => {
      if (externalValue !== undefined && externalValue !== value) {
        setValue(externalValue);
        setCursorOverride(undefined);
      }
    }, [externalValue, value]);

    useEffect(() => {
      if (cursorOverride === undefined) return;
      const timeout = setTimeout(() => {
        setCursorOverride(undefined);
      }, 0);
      return () => clearTimeout(timeout);
    }, [cursorOverride]);

    useImperativeHandle(ref, () => ({
      setValue: (next: string) => {
        applyValue(next, next.length);
        setSelectedIndex(0);
        setFileSuggestions([]);
      },
      getValue: () => value,
      clearAttachments: () => {
        setAttachedFiles([]);
        setAttachedImages([]);
      },
    }), [applyValue, value]);

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

    // Format timestamp as relative time
    const formatRelativeTime = (timestamp: string): string => {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now.getTime() - then.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHour < 24) return `${diffHour}h ago`;
      return `${diffDay}d ago`;
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

    // PERFORMANCE: Debounce file search to avoid searching on every keystroke
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resourcesCache = useRef<Array<{ uri: string; name: string; absolutePath: string }> | null>(null);

    useEffect(() => {
      if (resourcesCache.current) {
        return;
      }

      // Warm cache: load resources from worker process on component mount
      loadResourcesFromWorker(process.cwd())
        .then((resources) => {
          // Cache the loaded resources for future lookups
          resourcesCache.current = resources;
          log(`RESOURCE_CACHE_WARMED: ${resources.length} resources loaded`);
        })
        .catch((error) => {
          log(`RESOURCE_CACHE_WARM_ERROR: ${error instanceof Error ? error.message : 'unknown'}`);
          // Cache warming is non-blocking, errors here are logged but not critical
        });
    }, []);

    useEffect(() => {
      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // If no @ mention, clear suggestions immediately
      if (atMentionPattern === null) {
        setFileSuggestions([]);
        setIsLoadingFiles(false);
        return;
      }

      log(`COMPLETION: @ mention "${atMentionPattern}"`);

      // Debounce search by 150ms to prevent lag
      setIsLoadingFiles(true);
      debounceTimerRef.current = setTimeout(async () => {
        const searchStart = performance.now();
        try {
          // Use cached resources if available, otherwise fetch fresh
          let allResources = resourcesCache.current;
          if (!allResources) {
            log('FILE_LOAD: loading files and MCP resources from worker process...');
            // Fetch resources from worker process (keeps main thread unblocked)
            try {
              allResources = await loadResourcesFromWorker(process.cwd());
              const loadDuration = performance.now() - searchStart;
              logWithThreshold(`FILE_LOAD_COMPLETE: ${allResources.length} resources`, loadDuration, 50);
            } catch (workerError) {
              log(`FILE_LOAD_WORKER_ERROR: ${workerError instanceof Error ? workerError.message : 'unknown'}`);
              allResources = [];
            }
          }

          // Fuzzy filter resources by name
          const patternLower = atMentionPattern.toLowerCase();
          const filtered = patternLower.length === 0
            ? allResources.slice(0, 50) // Show first 50 if no pattern
            : allResources.filter(r => {
                const nameLower = r.name.toLowerCase();
                // Fuzzy match: all pattern chars must appear in order
                let patternIdx = 0;
                for (let i = 0; i < nameLower.length && patternIdx < patternLower.length; i++) {
                  if (nameLower[i] === patternLower[patternIdx]) {
                    patternIdx++;
                  }
                }
                return patternIdx === patternLower.length;
              }).slice(0, 50); // Limit to 50 matches

          setFileSuggestions(filtered);
          const filterDuration = performance.now() - searchStart;
          log(`COMPLETION_FILTERED: ${filtered.length} matches in ${filterDuration.toFixed(2)}ms`);
        } catch (error) {
          console.error('[InputBox] Failed to search resources:', error);
          log(`COMPLETION_ERROR: ${error instanceof Error ? error.message : 'unknown'}`);
          setFileSuggestions([]);
        }
        setIsLoadingFiles(false);
      }, 150); // 150ms debounce

      // Cleanup
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
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

    // Filter prompts based on search query in search mode
    const promptSuggestions = useMemo(() => {
      if (!isSearchMode || promptHistory.length === 0) {
        return [];
      }

      const query = value.trim();

      // If no query, show all prompts (up to 10)
      if (!query) {
        return promptHistory.slice(0, 10);
      }

      // Fuzzy filter prompts
      const matches = promptHistory.filter(prompt =>
        fuzzyMatch(prompt.text, query)
      );

      // Return up to 10 matches
      return matches.slice(0, 10);
    }, [isSearchMode, promptHistory, value]);

    const showPromptSuggestions = isSearchMode && promptSuggestions.length > 0;

    const handleSubmit = useCallback(() => {
      if (isSearchMode) {
        if (showPromptSuggestions && promptSuggestions.length > 0) {
          const selected = promptSuggestions[selectedIndex];
          if (selected) {
            applyValue(selected.text, selected.text.length);
          } else {
            applyValue(preSearchValue, preSearchValue.length);
          }
        } else {
          applyValue(preSearchValue, preSearchValue.length);
        }
        setIsSearchMode(false);
        setSelectedIndex(0);
        return;
      }

      if (showFileSuggestions) {
        const selected = fileSuggestions[selectedIndex];
        if (selected) {
          const lastAtIndex = value.lastIndexOf('@');
          if (lastAtIndex !== -1) {
            const newValue = value.slice(0, lastAtIndex) + `@${selected.name} `;
            applyValue(newValue, newValue.length);
            setAttachedFiles(prev => {
              if (prev.includes(selected.absolutePath)) {
                return prev;
              }
              return [...prev, selected.absolutePath];
            });
            setFileSuggestions([]);
            setSelectedIndex(0);
          }
        }
        return;
      }

      if (showCommandSuggestions) {
        const selected = commandSuggestions[selectedIndex];
        if (selected) {
          const requiresArgs = selected.requiresArgs ?? false;
          const commandValue = requiresArgs ? `${selected.name} ` : selected.name;
          applyValue(commandValue, commandValue.length);
          setSelectedIndex(0);
          setFileSuggestions([]);

          if (!requiresArgs) {
            const filesToSend = attachedFiles.length > 0 ? [...attachedFiles] : undefined;
            setAttachedFiles([]);
            onSubmit(selected.name, filesToSend);
            applyValue('', 0);
          }
        }
        return;
      }

      if (value.trim() && !disabled) {
        const imagesToSend = attachedImages.length > 0 ? [...attachedImages] : undefined;
        onSubmit(value, attachedFiles, imagesToSend);
        applyValue('', 0);
        setSelectedIndex(0);
        setAttachedFiles([]);
        setAttachedImages([]);
        setFileSuggestions([]);
        setPastePreview(null);
      }
    }, [
      isSearchMode,
      showPromptSuggestions,
      promptSuggestions,
      selectedIndex,
      applyValue,
      preSearchValue,
      showFileSuggestions,
      fileSuggestions,
      value,
      setAttachedFiles,
      showCommandSuggestions,
      commandSuggestions,
      disabled,
      onSubmit,
      attachedFiles,
    ]);

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
    }, [commandSuggestions.length, fileSuggestions.length, promptSuggestions.length]);

    // Notify parent about attached files
    useEffect(() => {
      if (onFilesAttached) {
        onFilesAttached(attachedFiles);
      }
    }, [attachedFiles, onFilesAttached]);

    // Handle Tab completion and arrow navigation
    useInput((input, key) => {
      if (disabled) return;

      // Handle Ctrl+V to paste from clipboard
      if (key.ctrl && input === 'v') {
        // Handle paste asynchronously
        readClipboardContent().then(content => {
          if (content.type === 'image' && content.image) {
            // Validate image size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (content.image.size > maxSize) {
              setPastePreview(`❌ Image too large: ${formatFileSize(content.image.size)} (max ${formatFileSize(maxSize)})`);
              setTimeout(() => setPastePreview(null), 4000);
              return;
            }

            // Save to temporary file and auto-submit read request
            if (!content.image) return;

            const imageData = content.image;
            (async () => {
              try {
                const { writeFileSync } = await import('fs');
                const { tmpdir } = await import('os');
                const { join } = await import('path');

                // Generate temporary filename with timestamp
                const timestamp = Date.now();
                const ext = imageData.mediaType.split('/')[1] || 'png';
                const tempPath = join(tmpdir(), `pasted_image_${timestamp}.${ext}`);

                // Convert base64 to buffer and save
                const imageBuffer = Buffer.from(imageData.data, 'base64');
                writeFileSync(tempPath, imageBuffer);

                // Show feedback
                setPastePreview(`✓ Image pasted (${formatFileSize(imageData.size)}) - reading...`);

                // Auto-submit with read request
                const readMessage = value.trim()
                  ? `${value}\n\nplease read this image\n${tempPath}`
                  : `please read this image\n${tempPath}`;

                // Submit immediately
                if (!disabled) {
                  onSubmit(readMessage, attachedFiles.length > 0 ? [...attachedFiles] : undefined, undefined);
                  applyValue('', 0);
                  setAttachedFiles([]);
                  setAttachedImages([]);
                  setPastePreview(null);
                }
              } catch (error) {
                console.error('Failed to save pasted image:', error);
                setPastePreview('❌ Failed to save pasted image');
                setTimeout(() => setPastePreview(null), 3000);
              }
            })();
          } else if (content.type === 'text' && content.text) {
            // Handle text paste
            if (isLargeText(content.text)) {
              // Show preview for large text
              const preview = createTextPreview(content.text);
              setPastePreview(`Large text: ${preview}`);
              // Ask user to confirm
              applyValue(value + content.text, value.length + content.text.length);
            } else {
              // Paste normally for small text
              applyValue(value + content.text, value.length + content.text.length);
            }
          }
        }).catch(err => {
          console.error('Paste failed:', err);
          setPastePreview(`❌ Paste failed: ${err instanceof Error ? err.message : String(err)}`);
          setTimeout(() => setPastePreview(null), 4000);
        });
        return;
      }

      // Handle Ctrl+R to toggle search mode
      if (key.ctrl && input === 'r') {
        if (!isSearchMode) {
          // Enter search mode
          setIsSearchMode(true);
          setPreSearchValue(value);
          applyValue('', 0);
          setSelectedIndex(0);
        } else {
          // Exit search mode without selecting
          setIsSearchMode(false);
          applyValue(preSearchValue, preSearchValue.length);
          setSelectedIndex(0);
        }
        return;
      }

      // Handle prompt search mode
      if (isSearchMode) {
        // Escape: exit search mode
        if (key.escape) {
          setIsSearchMode(false);
          applyValue(preSearchValue, preSearchValue.length);
          setSelectedIndex(0);
          return;
        }

        // Arrow navigation for prompt suggestions
        if (promptSuggestions.length > 0) {
          if (key.downArrow) {
            setSelectedIndex((prev) => (prev + 1) % promptSuggestions.length);
            return;
          }

          if (key.upArrow) {
            setSelectedIndex((prev) => (prev - 1 + promptSuggestions.length) % promptSuggestions.length);
            return;
          }
        }

        // Don't process other shortcuts in search mode
        return;
      }

      // Handle file suggestions
      if (showFileSuggestions) {
        // Tab: autocomplete with selected file
        if (key.tab) {
          const selected = fileSuggestions[selectedIndex];
          if (selected) {
            // Replace @pattern with @filename and add to attached files
            const lastAtIndex = value.lastIndexOf('@');
            const newValue = value.slice(0, lastAtIndex) + `@${selected.name} `;
            applyValue(newValue, newValue.length);
            setAttachedFiles((prev) => [...prev, selected.absolutePath]);
            setFileSuggestions([]);
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
          if (selected) {
            const requiresArgs = selected.requiresArgs ?? false;
            const commandValue = requiresArgs ? `${selected.name} ` : selected.name;
            applyValue(commandValue, commandValue.length);
            setSelectedIndex(0);
            setFileSuggestions([]);
            if (!requiresArgs) {
              const filesToSend = attachedFiles.length > 0 ? [...attachedFiles] : undefined;
              setAttachedFiles([]);
              onSubmit(selected.name, filesToSend);
              applyValue('', 0);
            }
          }
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

      // Block other app-level shortcuts from being typed into input (Ctrl+R handled above)
      if (key.ctrl && (input === 't' || input === 'a' || input === 'h' || input === 'o' || input === 'l' || input === 'b')) {
        // These are handled at the App level, don't type them
        return;
      }

      // Handle prompt history navigation (only when not in autocomplete mode)
      if (onNavigateHistory && !showFileSuggestions && !showCommandSuggestions) {
        if (key.upArrow) {
          onNavigateHistory('up');
          return;
        }

        if (key.downArrow) {
          onNavigateHistory('down');
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
          <EfficientTextInput
            value={value}
            onChange={(next) => applyValue(next)}
            onSubmit={handleSubmit}
            placeholder={disabled ? 'Waiting...' : isSearchMode ? 'Search prompts (fzf)...' : 'Type a message or /help for commands...'}
            showCursor={!disabled}
            focus={!disabled}
            cursorOffset={cursorOverride !== undefined ? cursorOverride : value.length}
            onCursorOffsetChange={(offset) => {
              // Don't set undefined - always provide a value
              setCursorOverride(offset);
            }}
            onSpecialKey={(input, key) => {
              // Let parent handle these special keys
              // Navigation and command keys
              if (key.upArrow || key.downArrow || key.tab) {
                return true; // Prevent default - parent will handle
              }
              // Parent shortcuts (Ctrl+X combinations)
              if (key.ctrl && (input === 'o' || input === 'a' || input === 'h' ||
                               input === 'l' || input === 'b' || input === 'f' ||
                               input === 't' || input === 'p' || input === 'm' ||
                               input === '0' || input === '?' || input === 'd')) {
                return true; // Let parent handle all Ctrl+X shortcuts
              }
              // Shift combinations for mode cycling
              if (key.shift && key.tab) {
                return true; // Shift+Tab for auto mode toggle
              }
              return false; // Allow default processing for regular input
            }}
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

        {/* Attached images indicator */}
        {attachedImages.length > 0 && (
          <Box paddingX={1} flexDirection="column">
            <Text color={PURPLE}>📎 Images ({attachedImages.length}):</Text>
            {attachedImages.map((img, index) => (
              <Box key={img.id} paddingLeft={2}>
                <Text color={DIM_WHITE}>
                  • {img.name} ({formatFileSize(img.size)})
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Paste preview */}
        {pastePreview && (
          <Box paddingX={1}>
            <Text color={CYAN}>✓ {pastePreview}</Text>
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
                const highlighted: React.ReactNode[] = [];

                let searchIdx = 0;
                for (let i = 0; i < cmd.usage.length; i++) {
                  const char = cmd.usage[i];
                  const charLower = char.toLowerCase();

                  if (searchIdx < search.length && charLower === search[searchIdx]) {
                    highlighted.push(
                      <Text key={i} color={isSelected ? CYAN : PURPLE} bold>
                        {char}
                      </Text>
                    );
                    searchIdx++;
                  } else {
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

        {/* Prompt suggestions - inline fzf-style search */}
        {showPromptSuggestions && (() => {
          const window = getVisibleWindow(selectedIndex, promptSuggestions.length);
          const visiblePrompts = promptSuggestions.slice(window.start, window.end);

          return (
            <Box flexDirection="column" paddingX={1}>
              {visiblePrompts.map((prompt, idx) => {
                const actualIndex = window.start + idx;
                const isSelected = actualIndex === selectedIndex;

                // Truncate long prompts
                const displayText = prompt.text.length > 80
                  ? prompt.text.slice(0, 77) + '...'
                  : prompt.text;

                const timeStr = formatRelativeTime(prompt.timestamp);

                return (
                  <Box key={actualIndex}>
                    <Text color={isSelected ? CYAN : DIM_WHITE}>
                      {isSelected ? '▶ ' : '  '}
                    </Text>
                    <Text color={isSelected ? CYAN : WHITE}>
                      {displayText}
                    </Text>
                    <Text color={DIM_WHITE}> ({timeStr})</Text>
                  </Box>
                );
              })}
            </Box>
          );
        })()}
      </Box>
    );
  }),
  // Custom comparison function to prevent unnecessary re-renders
  // NOTE: This only affects parent-triggered re-renders, NOT internal state changes
  // Internal state changes (like typing) ALWAYS cause re-renders
  (prevProps, nextProps) => {
    // Always re-render if these critical props change
    if (
      prevProps.disabled !== nextProps.disabled ||
      prevProps.modeColor !== nextProps.modeColor ||
      prevProps.value !== nextProps.value
    ) {
      return false; // Props changed, re-render
    }

    // For function props, only re-render if reference changed (they should be memoized with useCallback)
    // If they're not memoized, they'll change every render and we'll always re-render (expected)
    if (
      prevProps.onSubmit !== nextProps.onSubmit ||
      prevProps.onChange !== nextProps.onChange ||
      prevProps.onNavigateHistory !== nextProps.onNavigateHistory ||
      prevProps.onFilesAttached !== nextProps.onFilesAttached
    ) {
      return false; // Function references changed, re-render
    }

    // OPTIMIZATION: Skip promptHistory comparison to prevent re-renders on every message
    // promptHistory is only used in search mode (Ctrl+P), which is rarely activated
    // The search mode is triggered by internal state (isSearchMode), so it will work fine
    // This prevents typing lag in long conversations by blocking unnecessary parent re-renders

    return true; // Props are equal, skip re-render
  },
); // React.memo + forwardRef
