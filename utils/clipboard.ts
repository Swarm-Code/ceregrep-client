/**
 * Clipboard utilities for handling text and image paste
 * Supports pasting images and large text blocks into Scout TUI
 */

import clipboard from 'clipboardy';
import { readFile } from 'fs/promises';
import { ImageBlockParam } from '@anthropic-ai/sdk/resources/messages/messages.js';
import { getImageFromClipboard, getImageMediaType, validateImageSize, isClipboardImageSupported } from './imagePaste.js';

export interface ClipboardImage {
  data: string; // base64 encoded
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  size: number; // bytes
  width?: number;
  height?: number;
  originalPath?: string; // Original file path if pasted from file
}

export interface ClipboardContent {
  type: 'text' | 'image' | 'empty';
  text?: string;
  image?: ClipboardImage;
}

/**
 * Read text from clipboard
 */
export async function readClipboardText(): Promise<string> {
  try {
    return await clipboard.read();
  } catch (error) {
    console.error('Failed to read clipboard:', error);
    return '';
  }
}

/**
 * Write text to clipboard
 */
export async function writeClipboardText(text: string): Promise<void> {
  try {
    await clipboard.write(text);
  } catch (error) {
    console.error('Failed to write to clipboard:', error);
  }
}

/**
 * Detect if clipboard contains an image
 * Uses platform-specific methods (macOS osascript) or fallback to file path detection
 */
export async function detectClipboardImage(): Promise<ClipboardImage | null> {
  // Try platform-specific image clipboard (macOS)
  if (isClipboardImageSupported()) {
    const base64Image = getImageFromClipboard();
    if (base64Image) {
      const validation = validateImageSize(base64Image);
      return {
        data: base64Image,
        mediaType: 'image/png', // macOS clipboard gives PNG
        size: validation.size,
      };
    }
  }

  // Fallback: check if clipboard text contains an image path or base64 data
  try {
    const text = await clipboard.read();
    
    // Check if it's a file path to an image
    if (text.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
      try {
        const imageBuffer = await readFile(text);
        const base64 = imageBuffer.toString('base64');
        const ext = text.toLowerCase().split('.').pop();
        const mediaType = getImageMediaType(`.${ext}`);
        
        return {
          data: base64,
          mediaType,
          size: imageBuffer.length,
          originalPath: text,
        };
      } catch (err) {
        // File might not exist or not accessible
        return null;
      }
    }
    
    // Check if it's already base64 image data
    const base64Match = text.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/i);
    if (base64Match) {
      const ext = base64Match[1].toLowerCase().replace('jpg', 'jpeg');
      const mediaType = getImageMediaType(`.${ext}`);
      const base64Data = base64Match[2];
      const size = Math.ceil(base64Data.length * 0.75); // Approximate size
      
      return {
        data: base64Data,
        mediaType,
        size,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to detect clipboard image:', error);
    return null;
  }
}

/**
 * Read clipboard content and determine type
 */
export async function readClipboardContent(): Promise<ClipboardContent> {
  // First check for images
  const image = await detectClipboardImage();
  if (image) {
    return { type: 'image', image };
  }
  
  // Then check for text
  const text = await readClipboardText();
  if (text && text.trim()) {
    return { type: 'text', text };
  }
  
  return { type: 'empty' };
}

/**
 * Convert clipboard image to Anthropic ImageBlockParam
 */
export function clipboardImageToContentBlock(image: ClipboardImage): ImageBlockParam {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: image.mediaType,
      data: image.data,
    },
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if text is "large" and should be handled specially
 * Large text is defined as > 1000 characters or > 20 lines
 */
export function isLargeText(text: string): boolean {
  const lines = text.split('\n').length;
  return text.length > 1000 || lines > 20;
}

/**
 * Create a preview of large text
 */
export function createTextPreview(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;
  
  const lines = text.split('\n');
  const lineCount = lines.length;
  
  // Show first few lines and indicate more
  const preview = text.slice(0, maxLength);
  const charRemaining = text.length - maxLength;
  const lineInfo = lineCount > 1 ? ` (${lineCount} lines)` : '';
  
  return `${preview}... [+${charRemaining} chars${lineInfo}]`;
}
