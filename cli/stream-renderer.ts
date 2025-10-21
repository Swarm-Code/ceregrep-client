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
  private verbose: boolean;
  private accumulatedMessages: Message[] = [];

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Start the initial query spinner
   */
  startQuery() {
    if (this.verbose) {
      this.spinner = ora({
        text: chalk.blue('Initializing agent...'),
        color: 'cyan',
      }).start();
    } else {
      this.spinner = ora({
        text: chalk.blue('Processing...'),
        color: 'cyan',
      }).start();
    }
  }

  /**
   * Show the user's prompt with formatting
   */
  showPrompt(prompt: string) {
    console.log();
    console.log(chalk.bold.blueBright('Prompt:'), chalk.white(prompt));
    console.log();
  }

  /**
   * Handle incoming message from agent
   */
  handleMessage(message: Message) {
    // Always accumulate messages for final response synthesis
    this.accumulatedMessages.push(message);

    // Show ghost commands in non-verbose mode, full details in verbose
    if (message.type === 'assistant') {
      if (this.verbose) {
        this.handleAssistantMessage(message);
      } else {
        this.showGhostCommands(message);
      }
    } else if (message.type === 'user') {
      if (this.verbose) {
        this.handleToolResult(message);
      }
    }
  }

  /**
   * Show subtle hints of what tools are being executed (non-verbose mode)
   */
  private showGhostCommands(message: Message) {
    if (message.type !== 'assistant') return;

    const content = Array.isArray(message.message.content)
      ? message.message.content
      : [message.message.content];

    // Extract tool use blocks
    const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');

    if (toolUseBlocks.length > 0) {
      // Update spinner with ghost hints
      const toolNames = toolUseBlocks.map((t: any) => {
        const toolName = t.name;
        const input = t.input;

        // Create subtle hint based on tool type
        if (toolName === 'Bash' && input.command) {
          const cmd = input.command.length > 40
            ? input.command.substring(0, 40) + '...'
            : input.command;
          return chalk.dim(`bash: ${cmd}`);
        } else if (toolName === 'Grep' && input.pattern) {
          return chalk.dim(`grep: ${input.pattern}`);
        } else {
          return chalk.dim(toolName);
        }
      }).join(chalk.dim(', '));

      if (this.spinner) {
        this.spinner.text = chalk.blue('Processing... ') + chalk.dim('[') + toolNames + chalk.dim(']');
      }
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
   * Synthesize final response from accumulated messages
   * Creates comprehensive, granular response with extreme context
   */
  private synthesizeResponse(): string {
    // Extract all assistant messages
    const assistantMessages = this.accumulatedMessages.filter(m => m.type === 'assistant');

    // Collect all text blocks
    const allTextBlocks: string[] = [];
    const toolsExecuted: Array<{name: string, input: any}> = [];

    for (const message of assistantMessages) {
      if (message.type !== 'assistant') continue;

      const content = Array.isArray(message.message.content)
        ? message.message.content
        : [message.message.content];

      // Extract text
      for (const block of content) {
        if ((block as any).type === 'text') {
          const text = (block as any).text;
          if (text && text.trim()) {
            allTextBlocks.push(text.trim());
          }
        }

        // Track tool usage
        if ((block as any).type === 'tool_use') {
          toolsExecuted.push({
            name: (block as any).name,
            input: (block as any).input
          });
        }
      }
    }

    // Combine all text with proper spacing
    const fullResponse = allTextBlocks.join('\n\n');

    // If no response, provide a default message
    if (!fullResponse.trim()) {
      return 'No response generated.';
    }

    return fullResponse;
  }

  /**
   * Show final synthesized response with formatting
   */
  showFinalResponse() {
    console.log();
    console.log(chalk.bold.greenBright('Response:'));
    console.log();

    const response = this.synthesizeResponse();
    console.log(chalk.white(response));
    console.log();
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

    if (!error && this.verbose) {
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
