/**
 * Conversation Logger
 * Saves conversations to ~/.swarm-cli/logs/
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Conversation } from './conversation-storage.js';
import { Message } from '../core/messages.js';

const SWARM_CLI_DIR = path.join(os.homedir(), '.swarm-cli');
const LOGS_DIR = path.join(SWARM_CLI_DIR, 'logs');

/**
 * Ensure .swarm-cli/logs directory exists
 */
export async function ensureLogsDir(): Promise<void> {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }
}

/**
 * Log conversation to JSON file
 */
export async function logConversation(conversation: Conversation): Promise<string | null> {
  try {
    await ensureLogsDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `conversation-${timestamp}.json`;
    const filepath = path.join(LOGS_DIR, filename);

    await fs.writeFile(filepath, JSON.stringify(conversation, null, 2), 'utf-8');

    return filepath;
  } catch (err) {
    console.error('Failed to log conversation:', err);
    return null;
  }
}

/**
 * Log individual message to conversation file (append mode)
 */
export async function logMessage(
  conversationId: string,
  message: Message,
): Promise<void> {
  try {
    await ensureLogsDir();

    const filename = `conversation-${conversationId}.jsonl`;
    const filepath = path.join(LOGS_DIR, filename);

    // Append as JSONL (JSON Lines)
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      message,
    }) + '\n';

    await fs.appendFile(filepath, line, 'utf-8');
  } catch (err) {
    console.error('Failed to log message:', err);
  }
}

/**
 * Get logs directory path
 */
export function getLogsDir(): string {
  return LOGS_DIR;
}
