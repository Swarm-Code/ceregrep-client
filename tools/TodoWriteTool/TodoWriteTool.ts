/**
 * TodoWrite Tool - Update todo list
 * Converted from Kode implementation to headless TypeScript
 */

import { z } from 'zod';
import { Tool, ValidationResult } from '../../core/tool.js';
import {
  loadTodos,
  setTodos,
  validateTodos,
  generateTodoSummary,
  TodoItem,
} from '../../utils/todoStorage.js';

const DESCRIPTION = `Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.
It also helps the user understand the progress of the task and overall progress of their requests.

## When to Use This Tool
Use this tool proactively in these scenarios:

1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions
2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations
3. User explicitly requests todo list - When the user directly asks you to use the todo list
4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)
5. After receiving new instructions - Immediately capture user requirements as todos
6. When you start working on a task - Mark it as in_progress BEFORE beginning work. Ideally you should only have one todo as in_progress at a time
7. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation

## When NOT to Use This Tool

Skip using this tool when:
1. There is only a single, straightforward task
2. The task is trivial and tracking it provides no organizational benefit
3. The task can be completed in less than 3 trivial steps
4. The task is purely conversational or informational

NOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.

## Task States and Management

1. **Task States**: Use these states to track progress:
   - pending: Task not yet started
   - in_progress: Currently working on (limit to ONE task at a time)
   - completed: Task finished successfully

   **IMPORTANT**: Task descriptions must have two forms:
   - content: The imperative form describing what needs to be done (e.g., "Run tests", "Build the project")
   - activeForm: The present continuous form shown during execution (e.g., "Running tests", "Building the project")

2. **Task Management**:
   - Update task status in real-time as you work
   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)
   - Exactly ONE task must be in_progress at any time (not less, not more)
   - Complete current tasks before starting new ones
   - Remove tasks that are no longer relevant from the list entirely

3. **Task Completion Requirements**:
   - ONLY mark a task as completed when you have FULLY accomplished it
   - If you encounter errors, blockers, or cannot finish, keep the task as in_progress
   - When blocked, create a new task describing what needs to be resolved
   - Never mark a task as completed if:
     - Tests are failing
     - Implementation is partial
     - You encountered unresolved errors
     - You couldn't find necessary files or dependencies

4. **Task Breakdown**:
   - Create specific, actionable items
   - Break complex tasks into smaller, manageable steps
   - Use clear, descriptive task names
   - Always provide both forms:
     - content: "Fix authentication bug"
     - activeForm: "Fixing authentication bug"

When in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.`;

const TodoItemSchema = z.object({
  content: z.string().min(1).describe('The task description or content'),
  status: z
    .enum(['pending', 'in_progress', 'completed'])
    .describe('Current status of the task'),
  priority: z
    .enum(['high', 'medium', 'low'])
    .describe('Priority level of the task'),
  id: z.string().min(1).describe('Unique identifier for the task'),
  activeForm: z.string().min(1).describe('Present continuous form of the task (e.g., "Running tests")'),

  // Optional nested structure fields
  parentId: z.string().optional().describe('ID of parent todo for nested structure'),
  children: z.array(z.string()).optional().describe('Array of child todo IDs'),
  notes: z.string().optional().describe('Markdown notes for additional context'),
  collapsed: z.boolean().optional().describe('Whether the todo tree node is collapsed'),
  order: z.number().optional().describe('Sort order within siblings'),
});

const inputSchema = z.strictObject({
  todos: z.array(TodoItemSchema).describe('The updated todo list'),
});

type Input = typeof inputSchema;
type Output = string;

export const TodoWriteTool = {
  name: 'TodoWrite',
  async description() {
    return DESCRIPTION;
  },
  inputSchema,
  isReadOnly() {
    return false;
  },
  async isEnabled() {
    return true;
  },
  needsPermissions() {
    return false;
  },
  async validateInput({ todos }: z.infer<typeof inputSchema>): Promise<ValidationResult> {
    // Type assertion to ensure todos match TodoItem[] interface
    const todoItems = todos as TodoItem[];
    const validation = validateTodos(todoItems);
    if (!validation.result) {
      return {
        success: false,
        result: false,
        message: validation.message,
        meta: validation.meta,
      };
    }
    return { success: true, result: true };
  },
  renderResultForAssistant(result: Output) {
    // Match Kode implementation - return static confirmation message
    return 'Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable';
  },
  async *call({ todos }: z.infer<typeof inputSchema>, context: any) {
    try {
      // Load previous todos for comparison
      const previousTodos = await loadTodos();

      // Type assertion to ensure todos match TodoItem[] interface
      const todoItems = todos as TodoItem[];

      // Note: Validation already done in validateInput, no need for duplicate validation

      // Update the todos in storage (saves to disk with smart sorting)
      await setTodos(todoItems);

      // Generate enhanced summary
      const summary = generateTodoSummary(todoItems);

      yield {
        type: 'result',
        data: summary,
        resultForAssistant: this.renderResultForAssistant!(summary),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorResult = `Error updating todos: ${errorMessage}`;

      yield {
        type: 'result',
        data: errorResult,
        resultForAssistant: errorResult,
      };
    }
  },
} as Tool;
