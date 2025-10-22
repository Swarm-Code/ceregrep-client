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

export interface EnhancedCheckpoint extends Checkpoint {
  branchId: string;
  messageId?: string;
  tags?: string[];
  metadata?: {
    tokenUsage?: {
      total: number;
      input: number;
      output: number;
    };
    agentMode?: string;
  };
}

export interface ConversationBranch {
  id: string;
  parentBranchId?: string;
  forkPointMessageIndex: number;
  name: string;
  created: number;
  messages: Message[];
  metadata: {
    forkedFrom?: {
      branchId: string;
      messageId: string;
      reason?: string;
    };
  };
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

export interface BranchedConversation extends Omit<Conversation, 'messages' | 'checkpoints'> {
  branches: Map<string, ConversationBranch>;
  currentBranchId: string;
  mainBranchId: string;
  checkpoints: EnhancedCheckpoint[];
  navigationState: {
    currentMessageIndex: number;
    viewMode: 'live' | 'historical';
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
 * Generate branch ID
 */
export function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Save conversation to disk (handles both old and branched conversations)
 */
export async function saveConversation(conversation: Conversation | BranchedConversation): Promise<void> {
  await ensureConversationsDir();
  const dir = getConversationsDir();
  const filePath = path.join(dir, `${conversation.id}.json`);

  conversation.updated = Date.now();

  // Check if branched conversation (has branches Map)
  if ('branches' in conversation && conversation.branches instanceof Map) {
    // Convert Map to object for JSON serialization
    const serializable = {
      ...conversation,
      branches: Object.fromEntries(conversation.branches.entries()),
    };
    await fs.writeFile(filePath, JSON.stringify(serializable, null, 2), 'utf-8');
  } else {
    await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), 'utf-8');
  }
}

/**
 * Load conversation from disk (auto-migrates old format)
 */
export async function loadConversation(id: string): Promise<BranchedConversation | null> {
  const dir = getConversationsDir();
  const filePath = path.join(dir, `${id}.json`);

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const loaded = JSON.parse(content);

    // Check if old format (no branches property)
    if (!loaded.branches) {
      return migrateToBranchedConversation(loaded as Conversation);
    }

    // Convert branches from plain object to Map
    return {
      ...loaded,
      branches: new Map(Object.entries(loaded.branches)),
    } as BranchedConversation;
  } catch (error) {
    return null;
  }
}

/**
 * List all conversations (auto-migrates old format)
 */
export async function listConversations(): Promise<BranchedConversation[]> {
  await ensureConversationsDir();
  const dir = getConversationsDir();

  try {
    const files = await fs.readdir(dir);
    const conversations: BranchedConversation[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dir, file);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const loaded = JSON.parse(content);

          // Auto-migrate if old format
          let conv: BranchedConversation;
          if (!loaded.branches) {
            conv = migrateToBranchedConversation(loaded as Conversation);
          } else {
            // Convert branches from plain object to Map
            conv = {
              ...loaded,
              branches: new Map(Object.entries(loaded.branches)),
            } as BranchedConversation;
          }

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
 * Create new conversation (legacy - use createBranchedConversation)
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
 * Create new branched conversation
 */
export function createBranchedConversation(title?: string, agentId?: string): BranchedConversation {
  const id = generateConversationId();
  const now = Date.now();
  const mainBranchId = 'main';

  const mainBranch: ConversationBranch = {
    id: mainBranchId,
    forkPointMessageIndex: 0,
    name: 'main',
    created: now,
    messages: [],
    metadata: {},
  };

  const branches = new Map<string, ConversationBranch>();
  branches.set(mainBranchId, mainBranch);

  return {
    id,
    title: title || 'New Conversation',
    created: now,
    updated: now,
    checkpoints: [],
    agentId,
    metadata: {},
    branches,
    currentBranchId: mainBranchId,
    mainBranchId,
    navigationState: {
      currentMessageIndex: 0,
      viewMode: 'live',
    },
  };
}

/**
 * Migrate old Conversation format to BranchedConversation
 */
export function migrateToBranchedConversation(oldConv: Conversation): BranchedConversation {
  const mainBranchId = 'main';

  // Add IDs to messages if they don't have them
  const messagesWithIds = oldConv.messages.map((msg, idx) => {
    const msgAny = msg as any;
    return {
      ...msg,
      id: msgAny.id || `msg_${oldConv.created}_${idx}`,
      timestamp: msgAny.timestamp || oldConv.created + idx * 1000,
    };
  });

  const mainBranch: ConversationBranch = {
    id: mainBranchId,
    forkPointMessageIndex: 0,
    name: 'main',
    created: oldConv.created,
    messages: messagesWithIds,
    metadata: {},
  };

  const branches = new Map<string, ConversationBranch>();
  branches.set(mainBranchId, mainBranch);

  // Migrate old checkpoints to enhanced checkpoints
  const enhancedCheckpoints: EnhancedCheckpoint[] = oldConv.checkpoints.map(cp => ({
    ...cp,
    branchId: mainBranchId,
  }));

  return {
    id: oldConv.id,
    title: oldConv.title,
    created: oldConv.created,
    updated: oldConv.updated,
    checkpoints: enhancedCheckpoints,
    agentId: oldConv.agentId,
    metadata: oldConv.metadata,
    branches,
    currentBranchId: mainBranchId,
    mainBranchId,
    navigationState: {
      currentMessageIndex: Math.max(0, messagesWithIds.length - 1),
      viewMode: 'live',
    },
  };
}

/**
 * Fork conversation at specific message index
 */
export function forkConversation(
  conversation: BranchedConversation,
  forkPointIndex: number,
  branchName: string,
  reason?: string
): { conversation: BranchedConversation; newBranchId: string } {
  const currentBranch = conversation.branches.get(conversation.currentBranchId);
  if (!currentBranch) {
    throw new Error(`Current branch ${conversation.currentBranchId} not found`);
  }

  // Validate fork point
  if (forkPointIndex < 0 || forkPointIndex >= currentBranch.messages.length) {
    throw new Error(`Invalid fork point: ${forkPointIndex}`);
  }

  // Get messages up to fork point
  const parentMessages = currentBranch.messages.slice(0, forkPointIndex + 1);

  // Generate unique branch name if conflicts exist
  let uniqueBranchName = branchName;
  let counter = 2;
  while (Array.from(conversation.branches.values()).some(b => b.name === uniqueBranchName)) {
    uniqueBranchName = `${branchName}-${counter}`;
    counter++;
  }

  // Create new branch
  const newBranchId = generateBranchId();
  const newBranch: ConversationBranch = {
    id: newBranchId,
    parentBranchId: conversation.currentBranchId,
    forkPointMessageIndex: forkPointIndex,
    name: uniqueBranchName,
    created: Date.now(),
    messages: [...parentMessages], // Copy parent messages
    metadata: {
      forkedFrom: {
        branchId: conversation.currentBranchId,
        messageId: (parentMessages[forkPointIndex] as any).id || (parentMessages[forkPointIndex] as any).uuid || '',
        reason,
      },
    },
  };

  // Add branch to conversation
  conversation.branches.set(newBranchId, newBranch);
  conversation.currentBranchId = newBranchId;
  conversation.navigationState = {
    currentMessageIndex: forkPointIndex,
    viewMode: 'live',
  };

  return { conversation, newBranchId };
}

/**
 * Switch to different branch
 */
export function switchBranch(
  conversation: BranchedConversation,
  targetBranchId: string
): BranchedConversation {
  if (!conversation.branches.has(targetBranchId)) {
    throw new Error(`Branch ${targetBranchId} not found`);
  }

  const targetBranch = conversation.branches.get(targetBranchId)!;

  return {
    ...conversation,
    currentBranchId: targetBranchId,
    navigationState: {
      currentMessageIndex: Math.max(0, targetBranch.messages.length - 1),
      viewMode: 'live',
    },
  };
}

/**
 * Add checkpoint to conversation (legacy)
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
export function getConversationSummary(conversation: Conversation | BranchedConversation): string {
  if (conversation.title && conversation.title !== 'New Conversation') {
    return conversation.title;
  }

  // Get messages from either old or new format
  let messages: Message[] = [];
  if ('branches' in conversation) {
    // BranchedConversation - get messages from main branch
    const mainBranch = conversation.branches.get(conversation.mainBranchId);
    messages = mainBranch?.messages || [];
  } else {
    // Old Conversation format
    messages = conversation.messages || [];
  }

  // Try to get first user message as summary
  const firstUserMessage = messages.find(m => m.type === 'user');
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
