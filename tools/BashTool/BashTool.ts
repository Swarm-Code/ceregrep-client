/**
 * Bash Tool - Execute shell commands
 * Converted from Kode implementation to headless TypeScript
 */

import { statSync } from 'fs';
import { EOL } from 'os';
import { isAbsolute, resolve } from 'path';
import { z } from 'zod';
import { Tool, ValidationResult } from '../../core/tool.js';
import { ShellExecutionService } from '../../services/shell-execution.js';
import type {
  ShellOutputEvent,
  ShellExecutionConfig,
} from '../../services/shell-execution.js';
import type { AnsiOutput } from '../../utils/terminalSerializer.js';

// Banned commands for security
const BANNED_COMMANDS = [
  'alias',
  'curl',
  'curlie',
  'wget',
  'axel',
  'aria2c',
  'nc',
  'telnet',
  'lynx',
  'w3m',
  'links',
  'httpie',
  'xh',
  'http-prompt',
  'chrome',
  'firefox',
  'safari',
];

export const inputSchema = z.strictObject({
  command: z.string().describe('The command to execute'),
  timeout: z
    .number()
    .optional()
    .describe('Optional timeout in milliseconds (max 600000)'),
});

type In = typeof inputSchema;
export type Out = {
  stdout: string;
  stdoutLines: number;
  stderr: string;
  stderrLines: number;
  interrupted: boolean;
};

// Helper to split commands (simple implementation)
function splitCommand(command: string): string[] {
  return command.split(/[;&|]+/).map(c => c.trim()).filter(Boolean);
}

// Helper to format output (truncate if needed)
function formatOutput(content: string, maxLines: number = 1000): { totalLines: number; truncatedContent: string } {
  const lines = content.split('\n');
  const totalLines = lines.length;
  if (totalLines <= maxLines) {
    return { totalLines, truncatedContent: content };
  }
  const truncatedLines = lines.slice(0, maxLines);
  const truncatedContent = truncatedLines.join('\n') + `\n... (${totalLines - maxLines} more lines truncated)`;
  return { totalLines, truncatedContent };
}

export const BashTool = {
  name: 'Bash',
  async description() {
    return 'Executes shell commands on your computer';
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
  async validateInput({ command }: z.infer<typeof inputSchema>): Promise<ValidationResult> {
    const commands = splitCommand(command);
    for (const cmd of commands) {
      const parts = cmd.split(' ');
      const baseCmd = parts[0];

      // Check if command is banned
      if (baseCmd && BANNED_COMMANDS.includes(baseCmd.toLowerCase())) {
        return {
          success: false,
          result: false,
          message: `Command '${baseCmd}' is not allowed for security reasons`,
        };
      }
    }

    return { success: true, result: true };
  },
  renderResultForAssistant({ interrupted, stdout, stderr }: Out) {
    let errorMessage = stderr.trim();
    if (interrupted) {
      if (stderr) errorMessage += EOL;
      errorMessage += '<error>Command was aborted before completion</error>';
    }
    const hasBoth = stdout.trim() && errorMessage;
    const result = `${stdout.trim()}${hasBoth ? '\n' : ''}${errorMessage.trim()}`;

    // CRITICAL: Never return empty string
    return result.trim() || 'Command executed successfully (no output)';
  },
  async *call(
    { command, timeout = 120000 }: z.infer<typeof inputSchema>,
    { abortController, readFileTimestamps }: any,
  ) {
    let cumulativeOutput: string | AnsiOutput = '';
    let isBinaryStream = false;
    let bytesReceived = 0;
    let hasAnsiOutput = false;

    // Check if already cancelled before starting execution
    if (abortController.signal.aborted) {
      const data: Out = {
        stdout: '',
        stdoutLines: 0,
        stderr: 'Command cancelled before execution',
        stderrLines: 1,
        interrupted: true,
      };

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant!(data),
        data,
      };
      return;
    }

    try {
      // Get current working directory
      const cwd = process.cwd();

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
      const shellExecutionConfig: ShellExecutionConfig = {
        terminalWidth: process.stdout.columns || 1000,
        terminalHeight: process.stdout.rows || 30,
        showColor: true,
      };

      // Execute command using ShellExecutionService
      const { result: resultPromise } =
        await ShellExecutionService.execute(
          command,
          cwd,
          onOutputEvent,
          abortController.signal,
          true, // shouldUseNodePty: enable PTY for interactive shells
          shellExecutionConfig,
        );

      // Wait for command completion
      const result = await resultPromise;

      // Format output
      let stdout = '';
      let stderr = '';

      if (hasAnsiOutput && Array.isArray(cumulativeOutput)) {
        // Convert AnsiOutput to plain text
        const ansiOutput = cumulativeOutput as AnsiOutput;
        const lines = ansiOutput
          .map((line) => line.map((segment) => segment.text).join('').trimEnd())
          .filter((line) => line.trim() !== '');
        stdout = lines.join('\n');
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

      const { totalLines: stdoutLines, truncatedContent: stdoutContent } =
        formatOutput(stdout.trim());
      const { totalLines: stderrLines, truncatedContent: stderrContent } =
        formatOutput(stderr.trim());

      const data: Out = {
        stdout: stdoutContent,
        stdoutLines,
        stderr: stderrContent,
        stderrLines,
        interrupted: result.aborted,
      };

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant!(data),
        data,
      };
    } catch (error) {
      // Handle cancellation or other errors properly
      const isAborted = abortController.signal.aborted;
      const errorMessage = isAborted
        ? 'Command was cancelled by user'
        : `Command failed: ${error instanceof Error ? error.message : String(error)}`;

      const data: Out = {
        stdout: '',
        stdoutLines: 0,
        stderr: errorMessage,
        stderrLines: 1,
        interrupted: isAborted,
      };

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant!(data),
        data,
      };
    }
  },
} as Tool;

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
