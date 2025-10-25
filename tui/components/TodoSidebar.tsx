/**
 * Todo Sidebar Component
 * Interactive tree view of todos with keyboard navigation
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  loadTodos,
  getTodoTree,
  toggleCollapsed,
  TodoItem,
  TreeNode,
} from '../../utils/todoStorage.js';

interface TodoSidebarProps {
  isOpen: boolean;
  isFocused: boolean;
  onClose: () => void;
  onTodoSelect: (todoId: string) => void;
  onRequestEdit: (todo: TodoItem) => void;
  onRequestNotes: (todo: TodoItem) => void;
  onRequestAdd: (parentId?: string) => void;
  onRequestDelete: (todoId: string) => void;
  width?: number;
}

// Colors
const PURPLE = '#A855F7';
const GREEN = '#10B981';
const GRAY = '#6B7280';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';

export const TodoSidebar: React.FC<TodoSidebarProps> = ({
  isOpen,
  isFocused,
  onClose,
  onTodoSelect,
  onRequestEdit,
  onRequestNotes,
  onRequestAdd,
  onRequestDelete,
  width = 45,
}) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flatList, setFlatList] = useState<Array<{ node: TreeNode; index: number }>>([]);

  // Load todos on mount and when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadTodos().then(setTodos);
    }
  }, [isOpen]);

  // Rebuild flat list when todos change
  useEffect(() => {
    const tree = getTodoTree(todos);
    const flat: Array<{ node: TreeNode; index: number }> = [];

    function flatten(nodes: TreeNode[], parentCollapsed = false) {
      for (const node of nodes) {
        if (!parentCollapsed) {
          flat.push({ node, index: flat.length });
        }
        if (node.children.length > 0 && !node.todo.collapsed && !parentCollapsed) {
          flatten(node.children, node.todo.collapsed);
        }
      }
    }

    flatten(tree);
    setFlatList(flat);

    // Adjust selection if out of bounds
    if (selectedIndex >= flat.length) {
      setSelectedIndex(Math.max(0, flat.length - 1));
    }
  }, [todos, selectedIndex]);

  // Handle keyboard input
  useInput(
    (input, key) => {
      if (!isFocused || flatList.length === 0) return;

      // Navigation
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(flatList.length - 1, selectedIndex + 1));
      }
      // Expand/collapse
      else if (key.rightArrow) {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected && selected.children && selected.children.length > 0) {
          toggleCollapsed(selected.id).then(loadTodos).then(setTodos);
        }
      } else if (key.leftArrow) {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected && selected.children && selected.children.length > 0) {
          toggleCollapsed(selected.id).then(loadTodos).then(setTodos);
        }
      }
      // Edit
      else if (key.return) {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          onRequestEdit(selected);
        }
      }
      // Notes
      else if (input === 'n') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          onRequestNotes(selected);
        }
      }
      // Add sibling
      else if (input === 'a') {
        const selected = flatList[selectedIndex]?.node.todo;
        onRequestAdd(selected?.parentId);
      }
      // Add child
      else if (input === 'A') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          onRequestAdd(selected.id);
        }
      }
      // Delete
      else if (input === 'd') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          onRequestDelete(selected.id);
        }
      }
      // Close
      else if (key.escape) {
        onClose();
      }
    },
    { isActive: isFocused }
  );

  if (!isOpen) return null;

  // Render todo item
  const renderTodoItem = (node: TreeNode, index: number, isSelected: boolean) => {
    const todo = node.todo;
    const indent = '  '.repeat(node.depth);

    // Checkbox symbol
    let checkbox: string;
    let textColor: string;
    let isBold = false;
    let strikethrough = false;

    if (todo.status === 'completed') {
      checkbox = '✓';
      textColor = GRAY;
      strikethrough = true;
    } else if (todo.status === 'in_progress') {
      checkbox = '►';
      textColor = GREEN;
      isBold = true;
    } else {
      checkbox = '○';
      textColor = isSelected ? PURPLE : DIM_WHITE;
      isBold = isSelected;
    }

    // Priority indicator
    const prioritySymbol = todo.priority === 'high' ? '!' : todo.priority === 'medium' ? '·' : '';

    // Notes indicator
    const notesIndicator = todo.notes ? ` 📝` : '';

    // Collapse indicator
    const collapseIndicator = todo.children && todo.children.length > 0
      ? (todo.collapsed ? ' ▸' : ' ▾')
      : '';

    const content = `${indent}${checkbox} ${prioritySymbol}${todo.content}${notesIndicator}${collapseIndicator}`;

    return (
      <Box key={todo.id} flexDirection="row">
        <Text color={isSelected ? CYAN : GRAY}>
          {isSelected ? '→ ' : '  '}
        </Text>
        <Text
          color={textColor}
          bold={isBold}
          strikethrough={strikethrough}
        >
          {content}
        </Text>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={isFocused ? CYAN : GRAY}
      paddingX={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Text bold color={PURPLE}>
          📋 TODOS
        </Text>
        <Text color={DIM_WHITE} dimColor>
          ({todos.length})
        </Text>
      </Box>

      {/* Todo List */}
      <Box flexDirection="column" flexGrow={1} overflowY="hidden">
        {flatList.length === 0 ? (
          <Box flexDirection="row">
            <Text color={DIM_WHITE}>No todos. Press 'a' to add one.</Text>
          </Box>
        ) : (
          flatList.map(({ node, index }) => renderTodoItem(node, index, index === selectedIndex))
        )}
      </Box>

      {/* Footer / Shortcuts */}
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderTop borderColor={GRAY}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={DIM_WHITE} dimColor>
            [a]dd [n]otes [d]el
          </Text>
          <Text color={DIM_WHITE} dimColor>
            [Esc] close
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
