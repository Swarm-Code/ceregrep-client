/**
 * Hook execution system for pre/post tool use
 * Based on Claude Code's hook implementation
 */

import { spawn } from 'child_process';
import { Config, HookConfig } from '../config/schema.js';

export interface ToolUseContext {
  toolName: string;
  toolInput: Record<string, unknown>;
  toolDescription?: string;
  result?: any;
  error?: string;
}

export interface HookResult {
  success: boolean;
  output?: string;
  error?: string;
  blocked?: boolean;
  modifiedInput?: Record<string, unknown>;
}

/**
 * Check if a tool name matches a hook matcher pattern
 */
function matchesTool(matcher: string, toolName: string): boolean {
  // "*" matches all tools
  if (matcher === '*') {
    return true;
  }

  // Handle pipe-separated patterns like "Edit|Write"
  const patterns = matcher.split('|');
  return patterns.some((pattern) => {
    // Exact match
    if (pattern.trim() === toolName) {
      return true;
    }

    // Case-insensitive match
    if (pattern.trim().toLowerCase() === toolName.toLowerCase()) {
      return true;
    }

    // Wildcard match (simple glob)
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$',
      'i'
    );
    return regex.test(toolName);
  });
}

/**
 * Execute a hook command with tool context
 */
async function executeHookCommand(
  command: string,
  context: ToolUseContext,
  env: Record<string, string> = {}
): Promise<HookResult> {
  return new Promise((resolve) => {
    // Prepare environment variables
    const hookEnv = {
      ...process.env,
      ...env,
      TOOL_NAME: context.toolName,
      TOOL_DESCRIPTION: context.toolDescription || '',
    };

    // Add tool input fields as environment variables
    for (const [key, value] of Object.entries(context.toolInput)) {
      const envKey = `TOOL_INPUT_${key.toUpperCase()}`;
      if (typeof value === 'string') {
        (hookEnv as any)[envKey] = value;
      } else {
        (hookEnv as any)[envKey] = JSON.stringify(value);
      }
    }

    // Prepare context JSON for stdin
    const contextJson = JSON.stringify({
      tool_name: context.toolName,
      tool_input: context.toolInput,
      tool_description: context.toolDescription,
      result: context.result,
      error: context.error,
    });

    // Spawn process with shell
    const child = spawn(command, {
      shell: true,
      env: hookEnv,
      timeout: 30000, // 30 second timeout
    });

    let stdout = '';
    let stderr = '';

    // Collect stdout
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    // Write context to stdin
    if (child.stdin) {
      child.stdin.write(contextJson);
      child.stdin.end();
    }

    // Handle process exit
    child.on('close', (code) => {
      if (code === 0) {
        resolve({
          success: true,
          output: stdout.trim(),
          error: stderr.trim() || undefined,
        });
      } else {
        // Non-zero exit code means hook wants to block or signal an issue
        resolve({
          success: false,
          output: stdout.trim(),
          error: stderr.trim() || `Hook exited with code ${code}`,
          blocked: true,
        });
      }
    });

    // Handle errors
    child.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        blocked: false,
      });
    });
  });
}

/**
 * Execute all matching PreToolUse hooks
 * Returns null if tool should proceed, or error message if blocked
 */
export async function executePreToolUseHooks(
  config: Config,
  context: ToolUseContext
): Promise<{ blocked: boolean; message?: string; modifiedInput?: Record<string, unknown> }> {
  if (!config.hooks?.PreToolUse || config.hooks.PreToolUse.length === 0) {
    return { blocked: false };
  }

  const matchingHooks = config.hooks.PreToolUse.filter((hookConfig) =>
    matchesTool(hookConfig.matcher, context.toolName)
  );

  if (matchingHooks.length === 0) {
    return { blocked: false };
  }

  // Execute all matching hooks
  const results: HookResult[] = [];

  for (const hookConfig of matchingHooks) {
    for (const hook of hookConfig.hooks) {
      if (hook.type === 'command') {
        const result = await executeHookCommand(hook.command, context);
        results.push(result);

        // If any hook blocks, stop immediately
        if (result.blocked) {
          return {
            blocked: true,
            message: result.error || result.output || 'Tool execution blocked by hook',
          };
        }

        // Check if hook returned modified input
        if (result.output) {
          try {
            const parsed = JSON.parse(result.output);
            if (parsed.tool_input) {
              context.toolInput = parsed.tool_input;
            }
          } catch {
            // Not JSON, ignore
          }
        }
      }
    }
  }

  return { blocked: false, modifiedInput: context.toolInput };
}

/**
 * Execute all matching PostToolUse hooks
 */
export async function executePostToolUseHooks(
  config: Config,
  context: ToolUseContext
): Promise<void> {
  if (!config.hooks?.PostToolUse || config.hooks.PostToolUse.length === 0) {
    return;
  }

  const matchingHooks = config.hooks.PostToolUse.filter((hookConfig) =>
    matchesTool(hookConfig.matcher, context.toolName)
  );

  if (matchingHooks.length === 0) {
    return;
  }

  // Execute all matching hooks (don't wait for completion, fire and forget)
  const hookPromises: Promise<HookResult>[] = [];

  for (const hookConfig of matchingHooks) {
    for (const hook of hookConfig.hooks) {
      if (hook.type === 'command') {
        hookPromises.push(executeHookCommand(hook.command, context));
      }
    }
  }

  // Wait for all hooks to complete, but don't block on errors
  await Promise.allSettled(hookPromises);
}
