/**
 * Image paste utilities for handling clipboard image data
 * Supports macOS clipboard image capture via osascript
 */

import { execSync } from 'child_process';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SCREENSHOT_PATH = join(tmpdir(), 'ceregrep_cli_latest_screenshot.png');

export const CLIPBOARD_ERROR_MESSAGE =
  'No image found in clipboard. Use Cmd + Ctrl + Shift + 4 (macOS) to copy a screenshot to clipboard.';

export const IMAGE_PLACEHOLDER = '[Image pasted]';

/**
 * Get base64 encoded image from clipboard (macOS only for now)
 * Returns null if no image is available or platform is not supported
 */
export function getImageFromClipboard(): string | null {
  if (process.platform !== 'darwin') {
    // Only support image paste on macOS for now
    // TODO: Add Windows/Linux support
    return null;
  }

  try {
    // Check if clipboard has image data using AppleScript
    execSync(`osascript -e 'the clipboard as «class PNGf»'`, {
      stdio: 'ignore',
    });

    // Save the PNG data from clipboard to temporary file
    execSync(
      `osascript -e 'set png_data to (the clipboard as «class PNGf»)' -e 'set fp to open for access POSIX file "${SCREENSHOT_PATH}" with write permission' -e 'write png_data to fp' -e 'close access fp'`,
      { stdio: 'ignore' },
    );

    // Read the image file and convert to base64
    const imageBuffer = readFileSync(SCREENSHOT_PATH);
    const base64Image = imageBuffer.toString('base64');

    // Cleanup temporary file
    if (existsSync(SCREENSHOT_PATH)) {
      unlinkSync(SCREENSHOT_PATH);
    }

    return base64Image;
  } catch (error) {
    // No image in clipboard or error occurred
    return null;
  }
}

/**
 * Check if platform supports clipboard image paste
 */
export function isClipboardImageSupported(): boolean {
  return process.platform === 'darwin';
}

/**
 * Get image media type from file extension or default to PNG
 */
export function getImageMediaType(ext?: string): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  if (!ext) return 'image/png';
  
  const normalized = ext.toLowerCase().replace(/^\./, '');
  switch (normalized) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'png':
    default:
      return 'image/png';
  }
}

/**
 * Validate image size (in bytes)
 * Max size is 5MB for Anthropic API
 */
export function validateImageSize(base64: string): { valid: boolean; size: number; maxSize: number } {
  // Base64 encoding increases size by ~33%
  const sizeBytes = Math.ceil((base64.length * 3) / 4);
  const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  
  return {
    valid: sizeBytes <= maxSizeBytes,
    size: sizeBytes,
    maxSize: maxSizeBytes,
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
