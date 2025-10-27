/**
 * Todo Storage - File-based persistence for todos
 * Based on Kode's todoStorage.ts, adapted for headless file-based storage
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  activeForm: string;

  // Tree structure
  parentId?: string;          // null/undefined for root-level todos
  children?: string[];        // Array of child todo IDs
  notes?: string;             // Markdown notes
  collapsed?: boolean;        // For nested tree display
  order?: number;             // Sort order within siblings

  createdAt?: number;
  updatedAt?: number;
  previousStatus?: 'pending' | 'in_progress' | 'completed';
}

export interface TreeNode {
  todo: TodoItem;
  children: TreeNode[];
  depth: number;
}

export interface ValidationResult {
  result: boolean;
  errorCode?: number;
  message?: string;
  meta?: any;
}

/**
 * Get todos directory path
 */
export function getTodosDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.swarmrc', 'todos');
}

/**
 * Ensure todos directory exists
 */
async function ensureTodosDir(): Promise<void> {
  const dir = getTodosDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Get todos file path
 */
function getTodosFilePath(): string {
  return path.join(getTodosDir(), 'todos.json');
}

/**
 * Load todos from disk
 */
export async function loadTodos(): Promise<TodoItem[]> {
  const filePath = getTodosFilePath();

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const todos = JSON.parse(content);

    // Validate loaded data
    if (!Array.isArray(todos)) {
      return [];
    }

    return todos;
  } catch (error) {
    // File doesn't exist or is invalid - return empty array
    return [];
  }
}

/**
 * Save todos to disk with smart sorting
 */
export async function saveTodos(todos: TodoItem[]): Promise<void> {
  await ensureTodosDir();
  const filePath = getTodosFilePath();

  // Apply smart sorting before saving
  const sortedTodos = smartSort(todos);

  await fs.writeFile(filePath, JSON.stringify(sortedTodos, null, 2), 'utf-8');
}

/**
 * Smart sorting algorithm from Kode
 * Priority order:
 * 1. Status: in_progress > pending > completed
 * 2. Priority: high > medium > low
 * 3. UpdatedAt: newest first
 */
function smartSort(todos: TodoItem[]): TodoItem[] {
  return [...todos].sort((a, b) => {
    // 1. Status priority: in_progress > pending > completed
    const statusOrder = { in_progress: 3, pending: 2, completed: 1 };
    const statusDiff = statusOrder[b.status] - statusOrder[a.status];
    if (statusDiff !== 0) return statusDiff;

    // 2. For same status, sort by priority: high > medium > low
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // 3. For same status and priority, sort by updatedAt (newest first)
    const aTime = a.updatedAt || 0;
    const bTime = b.updatedAt || 0;
    return bTime - aTime;
  });
}

/**
 * Get todos (load from disk)
 */
export function getTodos(): TodoItem[] {
  // Note: This is synchronous wrapper - actual implementation will use async
  // For now, return empty array - will be loaded in tool's call method
  return [];
}

/**
 * Set todos (save to disk with timestamps and sorting)
 */
export async function setTodos(todos: TodoItem[]): Promise<void> {
  // Load existing todos to track status changes
  const existingTodos = await loadTodos();

  // Update todos with timestamps and previous status tracking
  const updatedTodos = todos.map(todo => {
    // Find existing todo to track status changes
    const existingTodo = existingTodos.find(existing => existing.id === todo.id);

    return {
      ...todo,
      updatedAt: Date.now(),
      createdAt: todo.createdAt || Date.now(),
      previousStatus: existingTodo?.status !== todo.status
        ? existingTodo?.status
        : todo.previousStatus,
    };
  });

  // Save to disk (smart sorting happens inside saveTodos)
  await saveTodos(updatedTodos);
}

/**
 * Detect cycles in todo tree
 */
function hasCycles(todos: TodoItem[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(todoId: string): boolean {
    if (recursionStack.has(todoId)) return true; // Cycle detected
    if (visited.has(todoId)) return false;

    visited.add(todoId);
    recursionStack.add(todoId);

    const todo = todos.find(t => t.id === todoId);
    if (todo?.children) {
      for (const childId of todo.children) {
        if (visit(childId)) return true;
      }
    }

    recursionStack.delete(todoId);
    return false;
  }

  for (const todo of todos) {
    if (!visited.has(todo.id)) {
      if (visit(todo.id)) return true;
    }
  }

  return false;
}

/**
 * Validate todos array
 * From Kode's validateTodos function (lines 28-83)
 * Enhanced with tree structure validation
 */
export function validateTodos(todos: TodoItem[]): ValidationResult {
  // Check for duplicate IDs
  const ids = todos.map(todo => todo.id);
  const uniqueIds = new Set(ids);
  if (ids.length !== uniqueIds.size) {
    return {
      result: false,
      errorCode: 1,
      message: 'Duplicate todo IDs found',
      meta: {
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
      },
    };
  }

  // Check for multiple in_progress tasks
  const inProgressTasks = todos.filter(todo => todo.status === 'in_progress');
  if (inProgressTasks.length > 1) {
    return {
      result: false,
      errorCode: 2,
      message: 'Only one task can be in_progress at a time',
      meta: { inProgressTaskIds: inProgressTasks.map(t => t.id) },
    };
  }

  // Validate each todo
  const todoMap = new Map(todos.map(t => [t.id, t]));
  for (const todo of todos) {
    if (!todo.content?.trim()) {
      return {
        result: false,
        errorCode: 3,
        message: `Todo with ID "${todo.id}" has empty content`,
        meta: { todoId: todo.id },
      };
    }
    if (!['pending', 'in_progress', 'completed'].includes(todo.status)) {
      return {
        result: false,
        errorCode: 4,
        message: `Invalid status "${todo.status}" for todo "${todo.id}"`,
        meta: { todoId: todo.id, invalidStatus: todo.status },
      };
    }
    if (!['high', 'medium', 'low'].includes(todo.priority)) {
      return {
        result: false,
        errorCode: 5,
        message: `Invalid priority "${todo.priority}" for todo "${todo.id}"`,
        meta: { todoId: todo.id, invalidPriority: todo.priority },
      };
    }

    // Validate tree structure
    if (todo.parentId && !todoMap.has(todo.parentId)) {
      return {
        result: false,
        errorCode: 6,
        message: `Todo "${todo.id}" has invalid parentId "${todo.parentId}"`,
        meta: { todoId: todo.id, invalidParentId: todo.parentId },
      };
    }

    if (todo.children) {
      for (const childId of todo.children) {
        if (!todoMap.has(childId)) {
          return {
            result: false,
            errorCode: 7,
            message: `Todo "${todo.id}" references non-existent child "${childId}"`,
            meta: { todoId: todo.id, invalidChildId: childId },
          };
        }
      }
    }
  }

  // Detect cycles
  if (hasCycles(todos)) {
    return {
      result: false,
      errorCode: 8,
      message: 'Todo tree contains cycles',
    };
  }

  return { result: true };
}

/**
 * Generate summary of todos
 * From Kode's generateTodoSummary function (lines 85-101)
 */
export function generateTodoSummary(todos: TodoItem[]): string {
  const stats = {
    total: todos.length,
    pending: todos.filter(t => t.status === 'pending').length,
    inProgress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
  };

  // Enhanced summary with statistics
  let summary = `Updated ${stats.total} todo(s)`;
  if (stats.total > 0) {
    summary += ` (${stats.pending} pending, ${stats.inProgress} in progress, ${stats.completed} completed)`;
  }
  summary += '. Continue tracking your progress with the todo list.';

  return summary;
}

/**
 * Build tree structure from flat todo list
 */
export function getTodoTree(todos: TodoItem[]): TreeNode[] {
  const todoMap = new Map(todos.map(t => [t.id, t]));
  const roots: TreeNode[] = [];

  function buildNode(todo: TodoItem, depth: number = 0): TreeNode {
    const children: TreeNode[] = [];
    if (todo.children) {
      for (const childId of todo.children) {
        const childTodo = todoMap.get(childId);
        if (childTodo) {
          children.push(buildNode(childTodo, depth + 1));
        }
      }
    }
    return { todo, children, depth };
  }

  // Find root todos (no parent)
  for (const todo of todos) {
    if (!todo.parentId) {
      roots.push(buildNode(todo, 0));
    }
  }

  return roots;
}

/**
 * Get todo with all its ancestors
 */
export function getTodoWithAncestors(todos: TodoItem[], todoId: string): TodoItem[] {
  const todoMap = new Map(todos.map(t => [t.id, t]));
  const ancestors: TodoItem[] = [];
  let current = todoMap.get(todoId);

  while (current) {
    ancestors.unshift(current);
    current = current.parentId ? todoMap.get(current.parentId) : undefined;
  }

  return ancestors;
}

/**
 * Get todo with all its descendants
 */
export function getTodoWithDescendants(todos: TodoItem[], todoId: string): TodoItem[] {
  const todoMap = new Map(todos.map(t => [t.id, t]));
  const descendants: TodoItem[] = [];

  function collectDescendants(id: string) {
    const todo = todoMap.get(id);
    if (!todo) return;

    descendants.push(todo);
    if (todo.children) {
      for (const childId of todo.children) {
        collectDescendants(childId);
      }
    }
  }

  collectDescendants(todoId);
  return descendants;
}

/**
 * Add a child todo to a parent
 */
export async function addChildTodo(parentId: string, newTodo: TodoItem): Promise<TodoItem[]> {
  const todos = await loadTodos();
  const parent = todos.find(t => t.id === parentId);

  if (!parent) {
    throw new Error(`Parent todo "${parentId}" not found`);
  }

  // Set parent relationship
  newTodo.parentId = parentId;
  newTodo.order = parent.children ? parent.children.length : 0;

  // Update parent's children array
  if (!parent.children) {
    parent.children = [];
  }
  parent.children.push(newTodo.id);

  // Add new todo to list
  const updatedTodos = [...todos, newTodo];
  await setTodos(updatedTodos);

  return updatedTodos;
}

/**
 * Remove todo and all its children
 */
export async function removeTodoAndChildren(todoId: string): Promise<TodoItem[]> {
  const todos = await loadTodos();
  const descendants = getTodoWithDescendants(todos, todoId);
  const descendantIds = new Set(descendants.map(t => t.id));

  // Remove todo and descendants
  let updatedTodos = todos.filter(t => !descendantIds.has(t.id));

  // Update parent's children array
  const todo = todos.find(t => t.id === todoId);
  if (todo?.parentId) {
    const parent = updatedTodos.find(t => t.id === todo.parentId);
    if (parent?.children) {
      parent.children = parent.children.filter(id => id !== todoId);
    }
  }

  await setTodos(updatedTodos);
  return updatedTodos;
}

/**
 * Move todo to new parent
 */
export async function moveTodo(
  todoId: string,
  newParentId?: string,
  newOrder?: number
): Promise<TodoItem[]> {
  const todos = await loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    throw new Error(`Todo "${todoId}" not found`);
  }

  // Check for circular reference
  if (newParentId) {
    const ancestors = getTodoWithAncestors(todos, newParentId);
    if (ancestors.some(a => a.id === todoId)) {
      throw new Error('Cannot move todo to its own descendant');
    }
  }

  // Remove from old parent
  if (todo.parentId) {
    const oldParent = todos.find(t => t.id === todo.parentId);
    if (oldParent?.children) {
      oldParent.children = oldParent.children.filter(id => id !== todoId);
    }
  }

  // Update todo
  todo.parentId = newParentId;
  todo.order = newOrder ?? 0;

  // Add to new parent
  if (newParentId) {
    const newParent = todos.find(t => t.id === newParentId);
    if (!newParent) {
      throw new Error(`Parent todo "${newParentId}" not found`);
    }
    if (!newParent.children) {
      newParent.children = [];
    }
    newParent.children.push(todoId);
  }

  await setTodos(todos);
  return todos;
}

/**
 * Toggle collapsed state of a todo
 */
export async function toggleCollapsed(todoId: string): Promise<TodoItem[]> {
  const todos = await loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    throw new Error(`Todo "${todoId}" not found`);
  }

  todo.collapsed = !todo.collapsed;
  await setTodos(todos);
  return todos;
}

/**
 * Update notes for a todo
 */
export async function updateTodoNotes(todoId: string, notes: string): Promise<TodoItem[]> {
  const todos = await loadTodos();
  const todo = todos.find(t => t.id === todoId);

  if (!todo) {
    throw new Error(`Todo "${todoId}" not found`);
  }

  todo.notes = notes;
  await setTodos(todos);
  return todos;
}
