/**
 * Bash Tool - Execute shell commands
 * Headless version based on swarm-client BashTool
 * Updated to use ShellExecutionService for PTY support
 */

import { EOL } from 'os';
import { z } from 'zod';
import { Tool, ValidationResult } from '../core/tool.js';
import { ShellExecutionService } from '../services/shell-execution.js';
import type {
  ShellOutputEvent,
  ShellExecutionConfig,
} from '../services/shell-execution.js';
import type { AnsiOutput } from '../utils/terminalSerializer.js';

const inputSchema = z.strictObject({
  command: z.string().describe('The command to execute'),
  timeout: z
    .number()
    .optional()
    .describe('Optional timeout in milliseconds (max 600000)'),
});

type Output = {
  stdout: string;
  stdoutLines: number;
  stderr: string;
  stderrLines: number;
  interrupted: boolean;
  pid?: number;
};

const BANNED_COMMANDS = [
  'rm',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'mkfs',
  'dd',
  'fdisk',
  'parted',
];

// Track active shell PIDs for interactive mode
const activeShellPids = new Map<string, number>();

export const BashTool: Tool = {
  name: 'Bash',
  async description() {
    return 'Executes bash commands in a persistent shell session with optional timeout';
  },
  isReadOnly() {
    return false;
  },
  inputSchema,
  async isEnabled() {
    return true;
  },
  needsPermissions(): boolean {
    return true;
  },
  async validateInput({ command }): Promise<ValidationResult> {
    const parts = command.trim().split(' ');
    const baseCmd = parts[0];

    // Check if command is banned
    if (baseCmd && BANNED_COMMANDS.includes(baseCmd.toLowerCase())) {
      return {
        success: false,
        result: false,
        message: `Command '${baseCmd}' is not allowed for security reasons`,
      };
    }

    return { success: true, result: true };
  },
  renderResultForAssistant({ interrupted, stdout, stderr }) {
    let errorMessage = stderr.trim();
    if (interrupted) {
      if (stderr) errorMessage += EOL;
      errorMessage += '<error>Command was aborted before completion</error>';
    }
    let trimmedStdout = stdout.trim();
    const trimmedStderr = errorMessage.trim();

    // OUTPUT SIZE LIMIT: Block oversized outputs to prevent context bloat and API errors
    // Limit based on lines for simplicity and clarity
    const MAX_OUTPUT_LINES = 2000;
    const numLines = (trimmedStdout.match(/\n/g) || []).length + 1;

    if (numLines > MAX_OUTPUT_LINES) {
      console.error(`🚫 [Output Blocked] Command output too large: ${numLines.toLocaleString()} lines (max: ${MAX_OUTPUT_LINES.toLocaleString()} lines)`);

      // Return error message with smart suggestions to avoid too-granular queries
      trimmedStdout = `<error>Command output is too large (${numLines.toLocaleString()} lines). Maximum allowed: ${MAX_OUTPUT_LINES.toLocaleString()} lines

SMART ALTERNATIVES (don't break into tiny pieces):

1. SCOPE DOWN YOUR QUERY - Ask more specific questions instead of "tell me about everything"
   Example: Instead of "explain all files" → "explain the agent architecture" or "how does tool execution work"

2. USE TARGETED FILE PATTERNS - Filter by directory or file type
   Example: find . -name "*.ts" -path "*/agents/*" (not find . -name "*.ts")
   Example: ls -la agents/ tools/ core/ (not ls -la)

3. USE GREP WITH PATTERNS - Search for relevant content, not dump everything
   Example: grep -r "export.*Agent" --include="*.ts" agents/
   Example: grep -r "class.*Tool" --include="*.ts" tools/

4. RETHINK YOUR APPROACH - Maybe you don't need to read raw output
   - Instead of catting 20 files → Ask "what are the main components and how do they interact"
   - Instead of finding all files → Ask "where is X functionality implemented"
   - Let your understanding guide focused queries, not brute-force data gathering

DON'T fragment into many tiny commands. Think strategically about what you actually need.</error>`;
    }

    const hasBoth = trimmedStdout && trimmedStderr;
    const result = `${trimmedStdout}${hasBoth ? '\n' : ''}${trimmedStderr}`;

    // CRITICAL: Never return empty string - Cerebras API rejects null/empty content
    return result.trim() || 'Command executed successfully (no output)';
  },
  async *call({ command, timeout = 120000 }, { abortController }) {
    let cumulativeOutput: string | AnsiOutput = '';
    let isBinaryStream = false;
    let bytesReceived = 0;
    let hasAnsiOutput = false;

    try {
      // Get current working directory (default to process.cwd())
      const cwd = process.cwd();

      // Create abort controller if not provided
      const signal = abortController.signal;

      // Set up output event handler for streaming
      const onOutputEvent = (event: ShellOutputEvent) => {
        switch (event.type) {
          case 'data':
            if (isBinaryStream) break;
            cumulativeOutput = event.chunk;
            hasAnsiOutput = Array.isArray(event.chunk);
            break;
          case 'binary_detected':
            isBinaryStream = true;
            hasAnsiOutput = false;
            cumulativeOutput = '[Binary output detected. Halting stream...]';
            break;
          case 'binary_progress':
            isBinaryStream = true;
            hasAnsiOutput = false;
            bytesReceived = event.bytesReceived;
            cumulativeOutput = `[Receiving binary output... ${formatBytes(bytesReceived)} received]`;
            break;
        }
      };

      // Configure shell execution with PTY support
      // CRITICAL: Use large terminal width to prevent line wrapping
      // Line wrapping breaks output mid-word (e.g., "sys.stderr" → "sys.s\ntderr")
      // which can cause 400 errors when sent to Cerebras API
      const shellExecutionConfig: ShellExecutionConfig = {
        terminalWidth: 1000, // Large width to prevent wrapping
        terminalHeight: 1000, // Large height to prevent pagination
        showColor: true,
      };

      // Execute command using ShellExecutionService
      const { result: resultPromise, pid } =
        await ShellExecutionService.execute(
          command,
          cwd,
          onOutputEvent,
          signal,
          true, // shouldUseNodePty: enable PTY for interactive shells
          shellExecutionConfig,
        );

      // Store PID for interactive shell access
      if (pid) {
        activeShellPids.set(command, pid);
      }

      // Wait for command completion
      const result = await resultPromise;

      // Format output
      let stdout = '';
      let stderr = '';

      if (hasAnsiOutput && Array.isArray(cumulativeOutput)) {
        // Convert AnsiOutput to plain text
        const ansiOutput = cumulativeOutput as AnsiOutput;
        stdout = ansiOutput
          .map((line) => line.map((segment) => segment.text).join(''))
          .join('\n');
      } else if (typeof cumulativeOutput === 'string') {
        stdout = cumulativeOutput;
      }

      // Handle errors
      if (result.error) {
        stderr = result.error.message;
      } else if (result.exitCode !== null && result.exitCode !== 0) {
        stderr = `Exit code ${result.exitCode}`;
      }

      // Use the output from result if we didn't get streaming output
      if (!stdout && result.output) {
        stdout = result.output;
      }

      const output: Output = {
        stdout: stdout.trim(),
        stdoutLines: stdout.trim().split('\n').length,
        stderr: stderr.trim(),
        stderrLines: stderr.trim().split('\n').length,
        interrupted: result.aborted,
        pid,
      };

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant!(output),
        data: output,
      };
    } catch (error) {
      yield {
        type: 'result',
        resultForAssistant: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          stdout: '',
          stdoutLines: 0,
          stderr: error instanceof Error ? error.message : String(error),
          stderrLines: 1,
          interrupted: false,
        },
      };
    }
  },
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

// Exported helper methods for interactive shell mode
export function getActiveShellPid(command: string): number | undefined {
  return activeShellPids.get(command);
}

export function clearShellPid(command: string): void {
  activeShellPids.delete(command);
}

export function getAllActiveShellPids(): Map<string, number> {
  return activeShellPids;
}
