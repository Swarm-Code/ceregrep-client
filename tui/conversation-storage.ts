/**
 * Conversation Storage System
 * Manages saving, loading, and checkpointing conversations
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Message } from '../core/messages.js';

export interface Checkpoint {
  id: string;
  timestamp: number;
  messageIndex: number;
  description?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created: number;
  updated: number;
  messages: Message[];
  checkpoints: Checkpoint[];
  agentId?: string;
  metadata: {
    model?: string;
    provider?: string;
    tokenUsage?: {
      total: number;
      input: number;
      output: number;
      cached: number;
    };
  };
}

/**
 * Get conversations directory
 */
export function getConversationsDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.ceregrep', 'conversations');
}

/**
 * Ensure conversations directory exists
 */
async function ensureConversationsDir(): Promise<void> {
  const dir = getConversationsDir();
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    // Ignore if already exists
  }
}

/**
 * Generate conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate checkpoint ID
 */
export function generateCheckpointId(): string {
  return `cp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Save conversation to disk
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  await ensureConversationsDir();
  const dir = getConversationsDir();
  const filePath = path.join(dir, `${conversation.id}.json`);

  conversation.updated = Date.now();

  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
}

/**
 * Load conversation from disk
 */
export async function loadConversation(id: string): Promise<Conversation | null> {
  const dir = getConversationsDir();
  const filePath = path.join(dir, `${id}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as Conversation;
  } catch (error) {
    return null;
  }
}

/**
 * List all conversations
 */
export async function listConversations(): Promise<Conversation[]> {
  await ensureConversationsDir();
  const dir = getConversationsDir();

  try {
    const files = await fs.readdir(dir);
    const conversations: Conversation[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const conv = JSON.parse(content) as Conversation;
          conversations.push(conv);
        } catch (error) {
          // Skip invalid files
        }
      }
    }

    // Sort by updated timestamp (most recent first)
    return conversations.sort((a, b) => b.updated - a.updated);
  } catch (error) {
    return [];
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const dir = getConversationsDir();
  const filePath = path.join(dir, `${id}.json`);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if not found
  }
}

/**
 * Create new conversation
 */
export function createConversation(title?: string, agentId?: string): Conversation {
  const id = generateConversationId();
  const now = Date.now();

  return {
    id,
    title: title || 'New Conversation',
    created: now,
    updated: now,
    messages: [],
    checkpoints: [],
    agentId,
    metadata: {},
  };
}

/**
 * Add checkpoint to conversation
 */
export function addCheckpoint(
  conversation: Conversation,
  description?: string
): Checkpoint {
  const checkpoint: Checkpoint = {
    id: generateCheckpointId(),
    timestamp: Date.now(),
    messageIndex: conversation.messages.length,
    description,
  };

  conversation.checkpoints.push(checkpoint);
  return checkpoint;
}

/**
 * Restore conversation to checkpoint
 */
export function restoreToCheckpoint(
  conversation: Conversation,
  checkpointId: string
): Conversation {
  const checkpoint = conversation.checkpoints.find(cp => cp.id === checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  // Create a new conversation with messages up to the checkpoint
  return {
    ...conversation,
    messages: conversation.messages.slice(0, checkpoint.messageIndex),
    updated: Date.now(),
  };
}

/**
 * Get conversation summary (first message or title)
 */
export function getConversationSummary(conversation: Conversation): string {
  if (conversation.title && conversation.title !== 'New Conversation') {
    return conversation.title;
  }

  // Try to get first user message as summary
  const firstUserMessage = conversation.messages.find(m => m.type === 'user');
  if (firstUserMessage && firstUserMessage.message.content) {
    const content = firstUserMessage.message.content;

    if (typeof content === 'string') {
      return content.substring(0, 60) + (content.length > 60 ? '...' : '');
    } else if (Array.isArray(content)) {
      // Find text block
      for (const block of content) {
        if (typeof block === 'object' && block !== null && 'type' in block) {
          if (block.type === 'text' && 'text' in block && typeof block.text === 'string') {
            const text = block.text;
            return text.substring(0, 60) + (text.length > 60 ? '...' : '');
          }
        }
      }
    }
  }

  return 'New Conversation';
}
