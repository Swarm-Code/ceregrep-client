/**
 * Bash Tool - Execute shell commands
 * Headless version based on swarm-client BashTool
 */

import { EOL } from 'os';
import { z } from 'zod';
import { Tool, ValidationResult } from '../core/tool.js';
import { PersistentShell } from '../utils/shell.js';

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
    const hasBoth = stdout.trim() && errorMessage;
    return `${stdout.trim()}${hasBoth ? '\n' : ''}${errorMessage.trim()}`;
  },
  async *call({ command, timeout = 120000 }, { abortController }) {
    let stdout = '';
    let stderr = '';

    try {
      // Execute command
      const result = await PersistentShell.getInstance().exec(
        command,
        abortController.signal,
        timeout,
      );

      stdout = (result.stdout || '').trim();
      stderr = (result.stderr || '').trim();

      if (result.code !== 0 && !stderr) {
        stderr = `Exit code ${result.code}`;
      }

      const output: Output = {
        stdout,
        stdoutLines: stdout.split('\n').length,
        stderr,
        stderrLines: stderr.split('\n').length,
        interrupted: result.interrupted,
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
