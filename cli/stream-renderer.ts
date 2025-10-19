/**
 * Terminal streaming renderer for ceregrep CLI
 * Provides real-time visual feedback with spinners, colors, and formatting
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { Message } from '../core/messages.js';

export class StreamRenderer {
  private spinner: Ora | null = null;
  private currentToolCount = 0;

  /**
   * Start the initial query spinner
   */
  startQuery() {
    this.spinner = ora({
      text: chalk.blue('Initializing agent...'),
      color: 'cyan',
    }).start();
  }

  /**
   * Handle incoming message from agent
   */
  handleMessage(message: Message) {
    if (message.type === 'assistant') {
      this.handleAssistantMessage(message);
    } else if (message.type === 'user') {
      this.handleToolResult(message);
    }
  }

  /**
   * Handle assistant message (contains text and/or tool calls)
   */
  private handleAssistantMessage(message: Message) {
    // Type guard: only handle assistant messages
    if (message.type !== 'assistant') return;

    const msg = message.message;
    const content = Array.isArray(msg.content) ? msg.content : [msg.content];

    // Extract text content
    const textBlocks = content.filter((c: any) => c.type === 'text');
    const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');

    // Stop spinner if active
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }

    // Display text content
    for (const textBlock of textBlocks) {
      const text = (textBlock as any).text;
      if (text && text.trim()) {
        console.log(chalk.white(text.trim()));
        console.log(); // Blank line
      }
    }

    // Display tool calls being made
    if (toolUseBlocks.length > 0) {
      this.currentToolCount = toolUseBlocks.length;

      for (const toolBlock of toolUseBlocks) {
        const toolName = (toolBlock as any).name;
        const toolInput = (toolBlock as any).input;

        // Format tool input for display
        const inputPreview = this.formatToolInput(toolName, toolInput);

        console.log(
          chalk.dim('┌─ ') +
          chalk.cyan.bold(`Tool: ${toolName}`) +
          (inputPreview ? chalk.dim(` → ${inputPreview}`) : '')
        );
      }

      // Start spinner for tool execution
      this.spinner = ora({
        text: chalk.yellow(`Executing ${toolUseBlocks.length} tool${toolUseBlocks.length > 1 ? 's' : ''}...`),
        color: 'yellow',
      }).start();
    }
  }

  /**
   * Handle tool result (user message with tool_result)
   */
  private handleToolResult(message: Message) {
    if (this.currentToolCount > 0) {
      this.currentToolCount--;
    }

    // Update spinner or stop it
    if (this.currentToolCount > 0) {
      if (this.spinner) {
        this.spinner.text = chalk.yellow(
          `Executing ${this.currentToolCount} remaining tool${this.currentToolCount > 1 ? 's' : ''}...`
        );
      }
    } else {
      if (this.spinner) {
        this.spinner.succeed(chalk.green('Tool execution complete'));
        this.spinner = null;
      }

      // Show we're thinking
      this.spinner = ora({
        text: chalk.blue('Thinking...'),
        color: 'cyan',
      }).start();
    }
  }

  /**
   * Format tool input for compact display
   */
  private formatToolInput(toolName: string, input: any): string {
    switch (toolName) {
      case 'bash':
        return input.command ? `\`${input.command.substring(0, 60)}${input.command.length > 60 ? '...' : ''}\`` : '';

      case 'grep':
        return input.pattern ? `pattern: "${input.pattern}"` : '';

      default:
        // Generic display
        const keys = Object.keys(input);
        if (keys.length === 0) return '';
        if (keys.length === 1) {
          const value = input[keys[0]];
          const strValue = typeof value === 'string' ? value : JSON.stringify(value);
          return `${keys[0]}: ${strValue.substring(0, 40)}${strValue.length > 40 ? '...' : ''}`;
        }
        return `${keys.length} params`;
    }
  }

  /**
   * Finish rendering and show final status
   */
  finish(error?: Error) {
    if (this.spinner) {
      if (error) {
        this.spinner.fail(chalk.red(`Error: ${error.message}`));
      } else {
        this.spinner.succeed(chalk.green('Complete'));
      }
      this.spinner = null;
    }

    if (!error) {
      console.log(chalk.dim('─'.repeat(process.stdout.columns || 80)));
    }
  }

  /**
   * Show token usage stats
   */
  showTokenStats(stats: { total: number; cached: number; input: number; output: number }) {
    const cachedPercent = stats.total > 0 ? ((stats.cached / stats.total) * 100).toFixed(1) : '0.0';

    console.log(
      chalk.dim('\nℹ Token Usage: ') +
      chalk.white(`${stats.total.toLocaleString()} total `) +
      chalk.dim('(') +
      chalk.cyan(`${stats.input.toLocaleString()} in`) +
      chalk.dim(', ') +
      chalk.yellow(`${stats.output.toLocaleString()} out`) +
      chalk.dim(', ') +
      chalk.green(`${stats.cached.toLocaleString()} cached ${cachedPercent}%`) +
      chalk.dim(')')
    );
  }
}
