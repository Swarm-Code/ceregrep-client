/**
 * Prompt History Module
 * Manages persistent storage of user prompts for history navigation and search
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { nanoid } from 'nanoid';

export interface PromptHistoryEntry {
  id: string;
  text: string;
  timestamp: string;
  conversationId?: string;
}

const MAX_HISTORY_ENTRIES = 1000;

/**
 * Get the path to the prompt history file
 */
function getHistoryFilePath(): string {
  const configDir = path.join(os.homedir(), '.config', 'ceregrep');
  return path.join(configDir, 'prompt-history.json');
}

/**
 * Ensure the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  const configDir = path.dirname(getHistoryFilePath());
  try {
    await fs.mkdir(configDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create config directory:', error);
  }
}

/**
 * Load prompt history from disk
 * Returns empty array if file doesn't exist or on error
 */
export async function loadHistory(): Promise<PromptHistoryEntry[]> {
  try {
    const historyPath = getHistoryFilePath();
    const data = await fs.readFile(historyPath, 'utf-8');
    const entries = JSON.parse(data);

    // Validate entries
    if (!Array.isArray(entries)) {
      console.error('Invalid history file format');
      return [];
    }

    return entries;
  } catch (error) {
    // File doesn't exist or read error - return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Failed to load prompt history:', error);
    return [];
  }
}

/**
 * Save a new prompt to history
 * Automatically trims to last MAX_HISTORY_ENTRIES
 */
export async function savePrompt(
  text: string,
  conversationId?: string
): Promise<void> {
  try {
    await ensureConfigDir();

    // Load existing history
    const history = await loadHistory();

    // Create new entry
    const entry: PromptHistoryEntry = {
      id: nanoid(),
      text,
      timestamp: new Date().toISOString(),
      conversationId,
    };

    // Add to history (newest first)
    history.unshift(entry);

    // Trim to max size
    const trimmedHistory = history.slice(0, MAX_HISTORY_ENTRIES);

    // Save to disk
    const historyPath = getHistoryFilePath();
    await fs.writeFile(
      historyPath,
      JSON.stringify(trimmedHistory, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save prompt to history:', error);
  }
}

/**
 * Search prompts by text content
 * Case-insensitive substring match
 */
export async function searchPrompts(query: string): Promise<PromptHistoryEntry[]> {
  if (!query.trim()) {
    return await loadHistory();
  }

  const history = await loadHistory();
  const queryLower = query.toLowerCase();

  return history.filter((entry) =>
    entry.text.toLowerCase().includes(queryLower)
  );
}

/**
 * Clear all prompt history
 * Useful for privacy or testing
 */
export async function clearHistory(): Promise<void> {
  try {
    const historyPath = getHistoryFilePath();
    await fs.writeFile(historyPath, JSON.stringify([]), 'utf-8');
  } catch (error) {
    console.error('Failed to clear prompt history:', error);
  }
}
