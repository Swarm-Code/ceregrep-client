/**
 * TodoRead Tool - Read and display current todos
 * Allows LLM to see what todos exist
 */

import { z } from 'zod';
import { Tool } from '../../core/tool.js';
import {
  loadTodos,
  getTodoTree,
  TodoItem,
  TreeNode,
} from '../../utils/todoStorage.js';

const DESCRIPTION = `Read and display the current todo list. Use this tool to check what tasks are currently tracked.

This tool returns all todos in a tree structure showing:
- Status (pending, in_progress, completed)
- Priority (high, medium, low)
- Nested structure (parent/child relationships)
- Notes attached to each todo

Use this to:
- Check current task status
- See what work is pending
- Review completed tasks
- Understand task hierarchy`;

const inputSchema = z.strictObject({
  includeCompleted: z.boolean().optional().describe('Whether to include completed todos (default: true)'),
});

type Input = typeof inputSchema;
type Output = string;

function formatTodoTree(nodes: TreeNode[], depth: number = 0, includeCompleted: boolean = true): string {
  let output = '';

  for (const node of nodes) {
    const todo = node.todo;

    // Skip completed if requested
    if (!includeCompleted && todo.status === 'completed') {
      continue;
    }

    const indent = '  '.repeat(depth);

    // Status icon
    const statusIcon =
      todo.status === 'completed' ? '✓' :
      todo.status === 'in_progress' ? '►' :
      '○';

    // Priority
    const priority = `[${todo.priority.toUpperCase()}]`;

    // Status
    const status = todo.status === 'in_progress' ? '(IN PROGRESS)' :
                   todo.status === 'completed' ? '(COMPLETED)' : '';

    output += `${indent}${statusIcon} ${priority} ${todo.content} ${status}\n`;

    // Add notes if present
    if (todo.notes) {
      const noteLines = todo.notes.split('\n');
      for (const line of noteLines) {
        output += `${indent}   📝 ${line}\n`;
      }
    }

    // Recursively format children
    if (node.children.length > 0) {
      output += formatTodoTree(node.children, depth + 1, includeCompleted);
    }
  }

  return output;
}

export const TodoReadTool = {
  name: 'TodoRead',
  async description() {
    return DESCRIPTION;
  },
  inputSchema,
  isReadOnly() {
    return true; // Read-only tool
  },
  async isEnabled() {
    return true;
  },
  needsPermissions() {
    return false;
  },
  renderResultForAssistant(result: Output) {
    return result;
  },
  async *call({ includeCompleted = true }: z.infer<typeof inputSchema>, context: any) {
    try {
      const todos = await loadTodos();

      if (todos.length === 0) {
        yield {
          type: 'result',
          data: 'No todos currently tracked.',
          resultForAssistant: 'No todos currently tracked.',
        };
        return;
      }

      // Build tree structure
      const tree = getTodoTree(todos);

      // Count stats
      const stats = {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        inProgress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
      };

      // Format output
      let output = `📋 TODO LIST (${stats.total} total: ${stats.pending} pending, ${stats.inProgress} in progress, ${stats.completed} completed)\n\n`;
      output += formatTodoTree(tree, 0, includeCompleted);

      yield {
        type: 'result',
        data: output,
        resultForAssistant: output,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResult = `Error reading todos: ${errorMessage}`;

      yield {
        type: 'result',
        data: errorResult,
        resultForAssistant: errorResult,
      };
    }
  },
} as Tool;
