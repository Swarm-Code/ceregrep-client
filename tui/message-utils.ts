/**
 * Message Utilities
 * Helper functions for managing messages in the TUI
 */

import { Message } from '../core/messages.js';

/**
 * Strip large image data from message content to prevent memory issues.
 * Replaces base64 data with a small placeholder while preserving structure.
 * This prevents the conversation state from growing unbounded with image data.
 */
export function stripImageDataFromMessage<T extends Message>(message: T): T {
  if (message.type !== 'user' && message.type !== 'assistant') {
    return message;
  }

  const content = message.message.content;

  // If content is not an array, no images to strip
  if (!Array.isArray(content)) {
    return message;
  }

  // Check if any blocks need stripping
  let needsStripping = false;
  const processedContent = content.map((block: any) => {
    // Strip base64 data from image blocks
    if (block.type === 'image' && block.source?.type === 'base64' && block.source?.data) {
      // Check if already stripped
      if (typeof block.source.data === 'string' && block.source.data.startsWith('[IMAGE_DATA_STRIPPED:')) {
        return block;
      }

      needsStripping = true;
      const originalSize = block.source.data.length;
      return {
        ...block,
        source: {
          ...block.source,
          // Replace data with placeholder + size info
          data: `[IMAGE_DATA_STRIPPED:${Math.ceil(originalSize * 0.75 / 1024)}KB]`,
          _originalSize: originalSize,
        },
      };
    }

    // Keep other blocks as-is
    return block;
  });

  // Only create new object if we actually stripped something
  if (!needsStripping) {
    return message;
  }

  return {
    ...message,
    message: {
      ...message.message,
      content: processedContent,
    },
  } as T;
}

/**
 * Strip image data from an array of messages
 */
export function stripImageDataFromMessages(messages: Message[]): Message[] {
  return messages.map(stripImageDataFromMessage);
}

/**
 * Check if a message contains large image data that should be stripped
 */
export function messageHasLargeImageData(message: Message): boolean {
  if (message.type !== 'user' && message.type !== 'assistant') {
    return false;
  }

  const content = message.message.content;

  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((block: any) => {
    if (block.type === 'image' && block.source?.type === 'base64' && block.source?.data) {
      // Check if data looks like actual base64 (not our placeholder)
      return !block.source.data.startsWith('[IMAGE_DATA_STRIPPED:');
    }
    return false;
  });
}
