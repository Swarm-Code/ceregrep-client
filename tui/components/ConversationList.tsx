/**
 * Conversation List Component
 * Displays and allows selection of saved conversations with details panel
 * Includes scrolling support for terminal size constraints
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import {
  listConversations,
  BranchedConversation,
  getConversationSummary,
  saveConversation,
  switchBranch
} from '../conversation-storage.js';

interface ConversationListProps {
  onSelect: (id: string) => void;
  onCancel: () => void;
}

// Force exact colors (hex) to override terminal themes
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const GREEN = '#10B981';
const YELLOW = '#F59E0B';
const DIM_WHITE = '#9CA3AF';

export const ConversationList: React.FC<ConversationListProps> = ({ onSelect, onCancel }) => {
  const [conversations, setConversations] = useState<BranchedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [selectedBranchIndex, setSelectedBranchIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [detailsScrollOffset, setDetailsScrollOffset] = useState(0);

  const { stdout } = useStdout();
  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const convs = await listConversations();
    setConversations(convs);
    setLoading(false);
  };

  const selectedConv = conversations[selectedIndex - 1]; // -1 because index 0 is "Back to Chat"

  // Calculate viewport for main list (each conversation takes 2 lines)
  // Reserve space for: header (3 lines) + instructions (1 line) + footer (3 lines) = 7 lines overhead
  const listOverheadLines = 7;
  const availableListLines = Math.max(5, terminalHeight - listOverheadLines);
  const linesPerConversation = 2; // Title line + metadata line
  const maxVisibleConversations = Math.floor(availableListLines / linesPerConversation);

  // Total items = 1 (back option) + conversations
  const totalItems = conversations.length + 1;

  // Calculate scroll offset to keep selected item visible
  useEffect(() => {
    if (showDetails) return;

    // Keep selected item in viewport
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxVisibleConversations) {
      setScrollOffset(selectedIndex - maxVisibleConversations + 1);
    }
  }, [selectedIndex, maxVisibleConversations, showDetails]);

  // Calculate details panel viewport
  const detailsOverheadLines = 10; // Header, title, metadata headers, instructions
  const availableDetailsLines = Math.max(5, terminalHeight - detailsOverheadLines);

  useInput((input, key) => {
    if (isRenaming) {
      // Handled by TextInput
      return;
    }

    if (showDetails) {
      // Details panel controls
      if (key.escape || input === 'q' || key.leftArrow) {
        setShowDetails(false);
        setSelectedBranchIndex(0);
        setDetailsScrollOffset(0);
      } else if (input === 'r') {
        // Rename conversation
        setIsRenaming(true);
        setRenameValue(selectedConv?.title || '');
      } else if (key.upArrow && selectedConv) {
        const branches = Array.from(selectedConv.branches.values());
        const newIndex = Math.max(0, selectedBranchIndex - 1);
        setSelectedBranchIndex(newIndex);

        // Scroll details if needed
        if (newIndex < detailsScrollOffset) {
          setDetailsScrollOffset(newIndex);
        }
      } else if (key.downArrow && selectedConv) {
        const branches = Array.from(selectedConv.branches.values());
        const newIndex = Math.min(branches.length - 1, selectedBranchIndex + 1);
        setSelectedBranchIndex(newIndex);

        // Scroll details if needed
        if (newIndex >= detailsScrollOffset + availableDetailsLines) {
          setDetailsScrollOffset(newIndex - availableDetailsLines + 1);
        }
      } else if (key.return && selectedConv) {
        // Switch branch and load conversation
        const branches = Array.from(selectedConv.branches.values());
        const selectedBranch = branches[selectedBranchIndex];
        if (selectedBranch) {
          const switched = switchBranch(selectedConv, selectedBranch.id);
          saveConversation(switched);
          onSelect(switched.id);
        }
      }
    } else {
      // Main list controls
      if (key.escape || input === 'q') {
        onCancel();
      } else if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(conversations.length, selectedIndex + 1));
      } else if (key.return) {
        if (selectedIndex === 0) {
          onCancel();
        } else {
          onSelect(conversations[selectedIndex - 1].id);
        }
      } else if (key.rightArrow && selectedIndex > 0) {
        setShowDetails(true);
        setSelectedBranchIndex(0);
        setDetailsScrollOffset(0);
      }
    }
  });

  const handleRenameSubmit = async (value: string) => {
    if (selectedConv && value.trim()) {
      const updated = { ...selectedConv, title: value.trim() };
      await saveConversation(updated);
      await loadConversations();
    }
    setIsRenaming(false);
  };

  if (loading) {
    return (
      <Box>
        <Text color={CYAN} bold>◉ Loading conversations...</Text>
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold color={PURPLE}>CONVERSATIONS</Text>
        <Box marginTop={1}>
          <Text color={WHITE}>No saved conversations</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={BLUE}>Press Ctrl+L to go back</Text>
        </Box>
      </Box>
    );
  }

  if (showDetails && selectedConv) {
    const branches = Array.from(selectedConv.branches.values());
    const visibleBranches = branches.slice(
      detailsScrollOffset,
      detailsScrollOffset + availableDetailsLines
    );
    const canScrollUp = detailsScrollOffset > 0;
    const canScrollDown = detailsScrollOffset + availableDetailsLines < branches.length;

    return (
      <Box flexDirection="column">
        {/* Header */}
        <Box borderStyle="single" borderColor={PURPLE} paddingX={1} marginBottom={1}>
          <Text bold color={PURPLE}>CONVERSATION DETAILS</Text>
          {branches.length > availableDetailsLines && (
            <Text color={DIM_WHITE}> (Showing {detailsScrollOffset + 1}-{Math.min(detailsScrollOffset + availableDetailsLines, branches.length)} of {branches.length})</Text>
          )}
        </Box>

        {/* Title */}
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={CYAN} bold>Title: </Text>
            {isRenaming ? (
              <TextInput
                value={renameValue}
                onChange={setRenameValue}
                onSubmit={handleRenameSubmit}
              />
            ) : (
              <Text color={WHITE}>{selectedConv.title.substring(0, terminalWidth - 20)}{selectedConv.title.length > terminalWidth - 20 ? '...' : ''}</Text>
            )}
          </Box>
          {!isRenaming && (
            <Box marginTop={0}>
              <Text color={DIM_WHITE} dimColor>Press 'r' to rename</Text>
            </Box>
          )}
        </Box>

        {/* Metadata */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color={CYAN} bold>Metadata:</Text>
          <Box marginLeft={2}>
            <Text color={WHITE}>Created: {new Date(selectedConv.created).toLocaleString()}</Text>
          </Box>
          <Box marginLeft={2}>
            <Text color={WHITE}>Updated: {new Date(selectedConv.updated).toLocaleString()}</Text>
          </Box>
          {selectedConv.agentId && (
            <Box marginLeft={2}>
              <Text color={WHITE}>Agent: {selectedConv.agentId}</Text>
            </Box>
          )}
          {selectedConv.metadata.model && (
            <Box marginLeft={2}>
              <Text color={WHITE}>Model: {selectedConv.metadata.model}</Text>
            </Box>
          )}
        </Box>

        {/* Branches with scroll indicator */}
        <Box flexDirection="column" marginBottom={1}>
          <Box>
            <Text color={CYAN} bold>Branches ({selectedConv.branches.size})</Text>
            {canScrollUp && <Text color={YELLOW}> ▲ More above</Text>}
          </Box>
          <Box marginLeft={2} flexDirection="column">
            {visibleBranches.map((branch, visibleIdx) => {
              const actualIdx = detailsScrollOffset + visibleIdx;
              const isSelected = actualIdx === selectedBranchIndex;
              const isCurrent = branch.id === selectedConv.currentBranchId;
              const prefix = isSelected ? '▶ ' : '  ';

              return (
                <Box key={branch.id}>
                  <Text color={isSelected ? YELLOW : WHITE} bold={isSelected || isCurrent}>
                    {prefix}{branch.name}
                  </Text>
                  <Text color={DIM_WHITE}> ({branch.messages.length} msgs)</Text>
                  {isCurrent && <Text color={GREEN}> ← active</Text>}
                </Box>
              );
            })}
          </Box>
          {canScrollDown && (
            <Box marginLeft={2}>
              <Text color={YELLOW}>▼ More below ({branches.length - detailsScrollOffset - availableDetailsLines} more)</Text>
            </Box>
          )}
        </Box>

        {/* Instructions */}
        <Box borderStyle="single" borderColor={CYAN} paddingX={1} marginTop={1}>
          <Box flexDirection="column">
            <Text color={CYAN}>↑↓ Navigate branches</Text>
            <Text color={CYAN}>Enter: Switch to branch & load conversation</Text>
            <Text color={CYAN}>← or Esc: Back to list</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Main list view - calculate visible items
  const visibleStartIndex = scrollOffset;
  const visibleEndIndex = Math.min(scrollOffset + maxVisibleConversations, conversations.length + 1);

  // Create items array with "Back" option
  type ListItem = { id: string; index: number; conv?: BranchedConversation };
  const allItems: ListItem[] = [
    { id: '__back__', index: 0 },
    ...conversations.map((conv, idx) => ({ id: conv.id, index: idx + 1, conv }))
  ];

  const visibleItems = allItems.slice(visibleStartIndex, visibleEndIndex);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = visibleEndIndex < allItems.length;

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="single" borderColor={PURPLE} paddingX={1} marginBottom={1}>
        <Text bold color={PURPLE}>YOUR CONVERSATIONS</Text>
        {conversations.length > maxVisibleConversations && (
          <Text color={DIM_WHITE}> (Showing {visibleStartIndex + 1}-{visibleEndIndex} of {conversations.length + 1})</Text>
        )}
      </Box>

      {/* Instructions */}
      <Box marginBottom={1}>
        <Text color={DIM_WHITE}>↑↓ Navigate  |  Enter: Open  |  →: Details  |  Esc: Back</Text>
      </Box>

      {/* Scroll up indicator */}
      {canScrollUp && (
        <Box marginBottom={0}>
          <Text color={YELLOW}>▲ More above ({scrollOffset} items)</Text>
        </Box>
      )}

      {/* List */}
      <Box flexDirection="column">
        {visibleItems.map((item) => {
          if (item.id === '__back__') {
            const isSelected = selectedIndex === 0;
            return (
              <Box key="__back__">
                <Text color={isSelected ? YELLOW : BLUE} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}← Back to Chat
                </Text>
              </Box>
            );
          }

          const conv = item.conv!;
          const isSelected = selectedIndex === item.index;
          const summary = getConversationSummary(conv);
          const currentBranch = conv.branches.get(conv.currentBranchId);
          const messageCount = currentBranch?.messages.length || 0;
          const branchCount = conv.branches.size;
          const date = new Date(conv.updated);
          const now = new Date();
          const isToday = date.toDateString() === now.toDateString();
          const dateStr = isToday ? date.toLocaleTimeString() : date.toLocaleDateString();

          // Truncate summary to fit terminal width
          const maxSummaryLength = Math.max(30, terminalWidth - 30);
          const truncatedSummary = summary.substring(0, maxSummaryLength);

          return (
            <Box key={conv.id} flexDirection="column" marginTop={item.id === '__back__' ? 1 : 0}>
              <Box>
                <Text color={isSelected ? YELLOW : WHITE} bold={isSelected}>
                  {isSelected ? '▶ ' : '  '}
                </Text>
                <Text color={isSelected ? YELLOW : PURPLE} bold>
                  {truncatedSummary}{summary.length > maxSummaryLength ? '...' : ''}
                </Text>
              </Box>
              <Box marginLeft={4}>
                <Text color={CYAN}>{messageCount} messages</Text>
                {branchCount > 1 && (
                  <Text color={GREEN}>  •  {branchCount} branches</Text>
                )}
                <Text color={DIM_WHITE}>  •  {dateStr}</Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Scroll down indicator */}
      {canScrollDown && (
        <Box marginTop={1}>
          <Text color={YELLOW}>▼ More below ({allItems.length - visibleEndIndex} more)</Text>
        </Box>
      )}

      {/* Footer hint */}
      <Box marginTop={canScrollDown ? 1 : 2} borderStyle="single" borderColor={CYAN} paddingX={1}>
        <Text color={CYAN}>Press → for details, branches, and rename options</Text>
      </Box>
    </Box>
  );
};

function formatConversationLabel(conv: BranchedConversation): string {
  const summary = getConversationSummary(conv);
  const date = new Date(conv.updated).toLocaleString();

  // Get message count from current branch
  const currentBranch = conv.branches.get(conv.currentBranchId);
  const messageCount = currentBranch?.messages.length || 0;
  const branchCount = conv.branches.size;

  const branchInfo = branchCount > 1 ? `, ${branchCount} branches` : '';
  return `${summary} (${messageCount} msgs${branchInfo}, ${date})`;
}
