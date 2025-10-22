/**
 * Background Agent Service
 * Runs in the background to gather context and feed it to the main agent
 */

import { CeregrepClient } from '../sdk/typescript/index.js';
import { Message } from '../core/messages.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackgroundContext {
  gitStatus?: string;
  gitBranch?: string;
  toolSummary?: string;
  conversationTitle?: string;
}

/**
 * Background Agent - Gathers context in the background
 */
export class BackgroundAgent {
  private client: CeregrepClient | null = null;
  private isInitialized = false;

  /**
   * Initialize the background agent
   */
  async initialize() {
    if (this.isInitialized) return;

    this.client = new CeregrepClient({
      model: 'claude-sonnet-4-20250514',
      dangerouslySkipPermissions: true,
    });

    await this.client.initialize();
    this.isInitialized = true;
  }

  /**
   * Get git status and branch information
   */
  async getGitContext(): Promise<{ branch: string; status: string } | null> {
    try {
      // Get current branch
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD 2>/dev/null');

      // Get status (short format)
      const { stdout: status } = await execAsync('git status --short 2>/dev/null');

      return {
        branch: branch.trim(),
        status: status.trim() || 'No changes',
      };
    } catch (err) {
      // Not a git repo or git error
      return null;
    }
  }

  /**
   * Summarize recent tool usage
   * Analyzes the last few messages to understand what tools were used
   */
  async summarizeToolUsage(messages: Message[]): Promise<string> {
    if (!this.client || messages.length === 0) {
      return 'No tool usage yet';
    }

    // Get last 5 messages
    const recentMessages = messages.slice(-5);

    // Extract tool uses from assistant messages
    const toolUses: string[] = [];
    for (const msg of recentMessages) {
      if (msg.type === 'assistant' && msg.message.content) {
        for (const block of msg.message.content) {
          if (block.type === 'tool_use') {
            toolUses.push(`${block.name}: ${JSON.stringify(block.input).slice(0, 100)}`);
          }
        }
      }
    }

    if (toolUses.length === 0) {
      return 'No recent tool usage';
    }

    return `Recent tools: ${toolUses.join(', ')}`;
  }

  /**
   * Generate a conversation title based on messages
   * Uses the background agent to analyze conversation and suggest a title
   */
  async generateConversationTitle(messages: Message[]): Promise<string> {
    if (!this.client || messages.length === 0) {
      return 'New Conversation';
    }

    try {
      // Get first 3 user messages to understand the conversation topic
      const userMessages = messages
        .filter(m => m.type === 'user')
        .slice(0, 3)
        .map(m => {
          if (m.type === 'user') {
            const content = m.message.content;
            if (typeof content === 'string') return content;
            return content.map((b: any) => (b.type === 'text' ? b.text : '')).join(' ');
          }
          return '';
        })
        .join(' ');

      if (!userMessages.trim()) {
        return 'New Conversation';
      }

      // Ask background agent to generate title
      const result = await this.client.query(
        `Generate a short, descriptive title (max 5 words) for a conversation about: "${userMessages.slice(0, 200)}". Reply with ONLY the title, nothing else.`,
        {
          systemPrompt: [
            'You generate concise, descriptive conversation titles.',
            'Respond with ONLY the title - no explanations, no quotes, no punctuation at the end.',
            'Maximum 5 words.',
            'Examples: "Fix authentication bug", "Add dark mode UI", "Optimize database queries"',
          ],
        }
      );

      // Extract title from response
      const lastMessage = result.messages[result.messages.length - 1];
      if (lastMessage.type === 'assistant' && lastMessage.message.content) {
        for (const block of lastMessage.message.content) {
          if (block.type === 'text') {
            return (block as any).text.trim().slice(0, 50);
          }
        }
      }

      return 'New Conversation';
    } catch (err) {
      console.error('Error generating title:', err);
      return 'New Conversation';
    }
  }

  /**
   * Get all background context
   */
  async getContext(messages: Message[]): Promise<BackgroundContext> {
    await this.initialize();

    const [gitContext, toolSummary] = await Promise.all([
      this.getGitContext(),
      this.summarizeToolUsage(messages),
    ]);

    return {
      gitBranch: gitContext?.branch,
      gitStatus: gitContext?.status,
      toolSummary,
    };
  }

  /**
   * Format context for injection into system prompt
   */
  formatContextForPrompt(context: BackgroundContext): string[] {
    const lines: string[] = [
      '## Background Context:',
      '',
    ];

    if (context.gitBranch) {
      lines.push(`- Git Branch: ${context.gitBranch}`);
    }

    if (context.gitStatus) {
      lines.push(`- Git Status: ${context.gitStatus}`);
    }

    if (context.toolSummary) {
      lines.push(`- ${context.toolSummary}`);
    }

    lines.push('');

    return lines;
  }
}

// Singleton instance
let backgroundAgentInstance: BackgroundAgent | null = null;

/**
 * Get the background agent instance
 */
export function getBackgroundAgent(): BackgroundAgent {
  if (!backgroundAgentInstance) {
    backgroundAgentInstance = new BackgroundAgent();
  }
  return backgroundAgentInstance;
}
