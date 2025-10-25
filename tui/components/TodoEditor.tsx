/**
 * Todo Editor Modal
 * For editing content, notes, and creating new todos
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { TodoItem } from '../../utils/todoStorage.js';

type EditorMode = 'edit' | 'notes' | 'add';

interface TodoEditorProps {
  mode: EditorMode;
  todo?: TodoItem;
  parentId?: string;
  onSave: (data: Partial<TodoItem>) => void;
  onCancel: () => void;
}

// Colors
const CYAN = '#22D3EE';
const PURPLE = '#A855F7';
const GRAY = '#6B7280';
const WHITE = '#FFFFFF';
const DIM_WHITE = '#9CA3AF';
const GREEN = '#10B981';

export const TodoEditor: React.FC<TodoEditorProps> = ({
  mode,
  todo,
  parentId,
  onSave,
  onCancel,
}) => {
  const [content, setContent] = useState(todo?.content || '');
  const [notes, setNotes] = useState(todo?.notes || '');
  const [activeForm, setActiveForm] = useState(todo?.activeForm || '');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>(todo?.priority || 'medium');
  const [focusedField, setFocusedField] = useState<'content' | 'activeForm' | 'notes' | 'priority'>('content');

  useInput((input, key) => {
    // Save
    if (key.ctrl && input === 's') {
      if (mode === 'add') {
        // Generate ID for new todo
        const id = `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onSave({
          id,
          content,
          activeForm: activeForm || content,
          priority,
          parentId,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else if (mode === 'edit') {
        onSave({
          content,
          activeForm: activeForm || content,
          priority,
        });
      } else if (mode === 'notes') {
        onSave({ notes });
      }
    }
    // Cancel
    else if (key.escape) {
      onCancel();
    }
    // Tab to switch fields (for add mode)
    else if (key.tab && mode === 'add') {
      const fields: Array<'content' | 'activeForm' | 'notes' | 'priority'> = ['content', 'activeForm', 'priority'];
      const currentIndex = fields.indexOf(focusedField);
      const nextIndex = (currentIndex + 1) % fields.length;
      setFocusedField(fields[nextIndex]);
    }
    // Change priority
    else if (focusedField === 'priority') {
      if (input === 'h') setPriority('high');
      else if (input === 'm') setPriority('medium');
      else if (input === 'l') setPriority('low');
    }
  });

  // Edit mode
  if (mode === 'edit') {
    return (
      <Box
        flexDirection="column"
        width={70}
        borderStyle="double"
        borderColor={CYAN}
        padding={1}
      >
        <Box marginBottom={1}>
          <Text bold color={PURPLE}>
            ✏️  EDIT TODO
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={DIM_WHITE}>Content:</Text>
          <TextInput value={content} onChange={setContent} />
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color={DIM_WHITE}>Active Form (present continuous):</Text>
          <TextInput value={activeForm} onChange={setActiveForm} placeholder={content} />
        </Box>

        <Box flexDirection="row" marginBottom={1} gap={2}>
          <Text color={DIM_WHITE}>Priority:</Text>
          <Text color={priority === 'high' ? GREEN : GRAY}>● High</Text>
          <Text color={priority === 'medium' ? GREEN : GRAY}>● Medium</Text>
          <Text color={priority === 'low' ? GREEN : GRAY}>● Low</Text>
        </Box>

        <Box borderTop borderColor={GRAY} borderStyle="single" paddingTop={1}>
          <Text color={DIM_WHITE}>
            [Ctrl+S] Save  [Esc] Cancel  [h/m/l] Set Priority
          </Text>
        </Box>
      </Box>
    );
  }

  // Notes mode
  if (mode === 'notes') {
    return (
      <Box
        flexDirection="column"
        width={70}
        height={20}
        borderStyle="double"
        borderColor={CYAN}
        padding={1}
      >
        <Box marginBottom={1}>
          <Text bold color={PURPLE}>
            📝 EDIT NOTES: "{todo?.content || 'New Todo'}"
          </Text>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          <Box marginBottom={1}>
            <Text color={DIM_WHITE}>
              Notes (Markdown supported):
            </Text>
          </Box>
          <TextInput
            value={notes}
            onChange={setNotes}
            placeholder="Add notes, implementation details, references..."
          />
        </Box>

        <Box borderTop borderColor={GRAY} borderStyle="single" paddingTop={1}>
          <Text color={DIM_WHITE}>[Ctrl+S] Save  [Esc] Cancel</Text>
        </Box>
      </Box>
    );
  }

  // Add mode
  return (
    <Box
      flexDirection="column"
      width={70}
      borderStyle="double"
      borderColor={CYAN}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color={PURPLE}>
          ➕ ADD TODO {parentId ? '(Child)' : '(Root)'}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusedField === 'content' ? CYAN : DIM_WHITE}>
          Content: {focusedField === 'content' && '*'}
        </Text>
        <TextInput
          value={content}
          onChange={setContent}
          focus={focusedField === 'content'}
        />
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={focusedField === 'activeForm' ? CYAN : DIM_WHITE}>
          Active Form: {focusedField === 'activeForm' && '*'}
        </Text>
        <TextInput
          value={activeForm}
          onChange={setActiveForm}
          placeholder={content}
          focus={focusedField === 'activeForm'}
        />
      </Box>

      <Box flexDirection="row" marginBottom={1} gap={2}>
        <Text color={focusedField === 'priority' ? CYAN : DIM_WHITE}>
          Priority: {focusedField === 'priority' && '*'}
        </Text>
        <Text color={priority === 'high' ? GREEN : GRAY}>● High</Text>
        <Text color={priority === 'medium' ? GREEN : GRAY}>● Medium</Text>
        <Text color={priority === 'low' ? GREEN : GRAY}>● Low</Text>
      </Box>

      <Box borderTop borderColor={GRAY} borderStyle="single" paddingTop={1}>
        <Text color={DIM_WHITE}>
          [Ctrl+S] Create  [Tab] Next Field  [h/m/l] Priority  [Esc] Cancel
        </Text>
      </Box>
    </Box>
  );
};
