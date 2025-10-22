/**
 * Branch Selector Component
 * Shows tree view of all conversation branches and allows switching
 */

import React, { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { BranchedConversation, ConversationBranch } from '../conversation-storage.js';

interface BranchSelectorProps {
  conversation: BranchedConversation;
  onSelect: (branchId: string) => void;
  onCancel: () => void;
}

interface SelectItem {
  label: string;
  value: string;
}

// Force exact colors
const BLUE = '#4169E1';
const PURPLE = '#A855F7';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const GREEN = '#10B981';

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  conversation,
  onSelect,
  onCancel,
}) => {
  // Build branch tree structure
  const branchTree = useMemo(() => {
    const branches = Array.from(conversation.branches.values());
    const tree: Array<{ branch: ConversationBranch; depth: number; prefix: string }> = [];

    // Find main branch first
    const mainBranch = branches.find(b => b.id === conversation.mainBranchId);
    if (mainBranch) {
      tree.push({ branch: mainBranch, depth: 0, prefix: '' });
      addChildren(mainBranch.id, 1);
    }

    function addChildren(parentId: string, depth: number) {
      const children = branches.filter(b => b.parentBranchId === parentId);
      children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        tree.push({ branch: child, depth, prefix });
        addChildren(child.id, depth + 1);
      });
    }

    return tree;
  }, [conversation]);

  const handleSelect = (item: SelectItem) => {
    if (item.value === '__cancel__') {
      onCancel();
    } else {
      onSelect(item.value);
    }
  };

  // Format branch label with tree visualization
  const formatBranchLabel = (item: { branch: ConversationBranch; depth: number; prefix: string }): string => {
    const { branch, depth, prefix } = item;
    const indent = '  '.repeat(depth);
    const isCurrent = branch.id === conversation.currentBranchId;
    const currentMarker = isCurrent ? ' ← current' : '';
    const messageCount = `(${branch.messages.length} msgs)`;

    return `${indent}${prefix}${branch.name} ${messageCount}${currentMarker}`;
  };

  const items: SelectItem[] = [
    { label: '← Back to Chat', value: '__cancel__' },
    ...branchTree.map(item => ({
      label: formatBranchLabel(item),
      value: item.branch.id,
    })),
  ];

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color={PURPLE}>SELECT BRANCH</Text>
      </Box>

      <Box marginBottom={1}>
        <Text color={CYAN}>Use ↑↓ to navigate, Enter to select, or press Ctrl+B to cancel</Text>
      </Box>

      {branchTree.length > 1 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={WHITE} bold>Branch Tree:</Text>
          {branchTree.map((item, index) => {
            const isCurrent = item.branch.id === conversation.currentBranchId;
            const indent = '  '.repeat(item.depth);
            return (
              <Text
                key={index}
                color={isCurrent ? GREEN : WHITE}
                bold={isCurrent}
              >
                {indent}{item.prefix}{item.branch.name} ({item.branch.messages.length} messages)
                {isCurrent && ' ← current'}
              </Text>
            );
          })}
        </Box>
      ) : (
        <Box marginBottom={1}>
          <Text color={WHITE}>Only main branch exists. Create a fork with Ctrl+F</Text>
        </Box>
      )}

      <SelectInput items={items} onSelect={handleSelect} />
    </Box>
  );
};
