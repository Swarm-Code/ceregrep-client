/**
 * Todo Manager Component
 * Full-screen todo management view (like MCP Manager)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import {
  loadTodos,
  setTodos,
  getTodoTree,
  toggleCollapsed,
  addChildTodo,
  removeTodoAndChildren,
  updateTodoNotes,
  TodoItem,
  TreeNode,
} from '../../utils/todoStorage.js';
import { TodoEditor } from './TodoEditor.js';

interface TodoManagerProps {
  onCancel: () => void;
}

// Colors
const PURPLE = '#A855F7';
const GREEN = '#10B981';
const GRAY = '#6B7280';
const CYAN = '#22D3EE';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const YELLOW = '#F59E0B';

type EditorMode = 'edit' | 'notes' | 'add' | null;

export const TodoManager: React.FC<TodoManagerProps> = ({ onCancel }) => {
  const [todos, setTodosState] = useState<TodoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [flatList, setFlatList] = useState<Array<{ node: TreeNode; index: number }>>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);
  const [editorParentId, setEditorParentId] = useState<string | undefined>(undefined);

  // Load todos on mount
  useEffect(() => {
    loadTodos().then(setTodosState);
  }, []);

  // Rebuild flat list when todos change
  useEffect(() => {
    const tree = getTodoTree(todos);
    const flat: Array<{ node: TreeNode; index: number }> = [];

    function flatten(nodes: TreeNode[], parentCollapsed = false) {
      for (const node of nodes) {
        if (!parentCollapsed) {
          flat.push({ node, index: flat.length });
        }
        // Only recurse into children if this node is NOT collapsed and parent wasn't collapsed
        if (node.children.length > 0 && !node.todo.collapsed && !parentCollapsed) {
          flatten(node.children, false); // Children are visible, so parentCollapsed = false
        }
      }
    }

    flatten(tree);
    setFlatList(flat);

    // Adjust selection if out of bounds
    if (selectedIndex >= flat.length && flat.length > 0) {
      setSelectedIndex(Math.max(0, flat.length - 1));
    }
  }, [todos, selectedIndex]);

  // Refresh todos after any change
  const refreshTodos = () => {
    loadTodos().then(setTodosState);
  };

  // Handle keyboard input (only when editor is NOT open)
  useInput(
    (input, key) => {
      if (editorMode) return; // Editor handles its own input
      if (flatList.length === 0 && input !== 'a' && !key.escape) return;

      // Escape to exit
      if (key.escape) {
        onCancel();
        return;
      }

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
          toggleCollapsed(selected.id).then(refreshTodos);
        }
      } else if (key.leftArrow) {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected && selected.children && selected.children.length > 0) {
          toggleCollapsed(selected.id).then(refreshTodos);
        }
      }
      // Toggle status with space
      else if (input === ' ') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          const newStatus: 'pending' | 'in_progress' | 'completed' =
            selected.status === 'pending'
              ? 'in_progress'
              : selected.status === 'in_progress'
                ? 'completed'
                : 'pending';

          const updated = todos.map(t =>
            t.id === selected.id ? { ...t, status: newStatus } : t
          );
          setTodos(updated).then(refreshTodos);
        }
      }
      // Edit
      else if (key.return) {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          setEditingTodo(selected);
          setEditorMode('edit');
        }
      }
      // Notes
      else if (input === 'n') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          setEditingTodo(selected);
          setEditorMode('notes');
        }
      }
      // Add sibling
      else if (input === 'a') {
        const selected = flatList[selectedIndex]?.node.todo;
        setEditorParentId(selected?.parentId);
        setEditorMode('add');
      }
      // Add child
      else if (input === 'A') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          setEditorParentId(selected.id);
          setEditorMode('add');
        }
      }
      // Delete
      else if (input === 'd') {
        const selected = flatList[selectedIndex]?.node.todo;
        if (selected) {
          removeTodoAndChildren(selected.id).then(refreshTodos);
        }
      }
    }
  );

  const handleEditorSave = async (data: Partial<TodoItem>) => {
    try {
      if (editorMode === 'add') {
        // Add new todo
        const newTodo = data as TodoItem;
        if (editorParentId) {
          await addChildTodo(editorParentId, newTodo);
        } else {
          const currentTodos = await loadTodos();
          await setTodos([...currentTodos, newTodo]);
        }
      } else if (editorMode === 'edit' && editingTodo) {
        // Update existing todo
        const currentTodos = await loadTodos();
        const updated = currentTodos.map(t =>
          t.id === editingTodo.id ? { ...t, ...data } : t
        );
        await setTodos(updated);
      } else if (editorMode === 'notes' && editingTodo && data.notes !== undefined) {
        // Update notes
        await updateTodoNotes(editingTodo.id, data.notes);
      }

      // Close editor and refresh
      setEditorMode(null);
      setEditingTodo(null);
      setEditorParentId(undefined);
      refreshTodos();
    } catch (error) {
      console.error('Failed to save todo:', error);
    }
  };

  const handleEditorCancel = () => {
    setEditorMode(null);
    setEditingTodo(null);
    setEditorParentId(undefined);
  };

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
    const prioritySymbol =
      todo.priority === 'high' ? '!' : todo.priority === 'medium' ? '·' : '';

    // Notes indicator
    const notesIndicator = todo.notes ? ` 📝` : '';

    // Collapse indicator
    const collapseIndicator =
      todo.children && todo.children.length > 0
        ? todo.collapsed
          ? ' ▸'
          : ' ▾'
        : '';

    const content = `${indent}${checkbox} ${prioritySymbol}${todo.content}${notesIndicator}${collapseIndicator}`;

    return (
      <Box key={todo.id} flexDirection="row">
        <Text color={isSelected ? CYAN : GRAY}>{isSelected ? '→ ' : '  '}</Text>
        <Text color={textColor} bold={isBold} strikethrough={strikethrough}>
          {content}
        </Text>
      </Box>
    );
  };

  // If editor is open, show it
  if (editorMode) {
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <TodoEditor
            mode={editorMode}
            todo={editingTodo || undefined}
            parentId={editorParentId}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        </Box>
      </Box>
    );
  }

  // Main todo list view
  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box
        borderStyle="single"
        borderColor={CYAN}
        paddingX={1}
        marginBottom={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text bold color={PURPLE}>
            📋 TODO MANAGER
          </Text>
          <Text color={DIM_WHITE}>({todos.length} total)</Text>
        </Box>
      </Box>

      {/* Todo List */}
      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {flatList.length === 0 ? (
          <Box flexDirection="column" alignItems="center" justifyContent="center">
            <Text color={DIM_WHITE}>No todos. Press 'a' to add one.</Text>
          </Box>
        ) : (
          flatList.map(({ node, index }) =>
            renderTodoItem(node, index, index === selectedIndex)
          )
        )}
      </Box>

      {/* Footer / Shortcuts */}
      <Box
        borderStyle="single"
        borderColor={GRAY}
        paddingX={1}
        marginTop={1}
      >
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={DIM_WHITE}>
            [↑↓] Navigate [←→] Collapse [Space] Status [Enter] Edit
          </Text>
        </Box>
        <Box flexDirection="row" justifyContent="space-between">
          <Text color={DIM_WHITE}>
            [a] Add [A] Add Child [n] Notes [d] Delete
          </Text>
          <Text color={YELLOW}>[Esc] Exit</Text>
        </Box>
      </Box>
    </Box>
  );
};
