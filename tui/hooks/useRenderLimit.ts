/**
 * Hook to dynamically calculate how many messages to render based on terminal dimensions
 * Uses process.stdout to get terminal size (avoids ESM/CommonJS issues)
 *
 * Calculation:
 * - Reserve 10 lines for header/footer/input
 * - Each message takes ~3 lines average
 * - Calculate: (height - 10) / 3 = max messages to render
 */

export function useRenderLimit(): number {
  // Get terminal dimensions from process.stdout
  // These are available in Node.js and don't have ESM/CommonJS compatibility issues
  const width = process.stdout.columns || 80;
  const height = process.stdout.rows || 24;

  // Reserve space for:
  // - Status bar: 1 line
  // - Input box: 2 lines
  // - Message navigator: 2 lines (if shown)
  // - Padding/margins: 5 lines
  const RESERVED_LINES = 10;

  // Estimate lines per message
  // - Typical message takes 3 lines (header + content + spacing)
  const LINES_PER_MESSAGE = 3;

  // Calculate available space for messages
  const availableLines = Math.max(height - RESERVED_LINES, 20); // Minimum 20 lines
  const maxMessages = Math.floor(availableLines / LINES_PER_MESSAGE);

  // Ensure we render at least 10 messages, at most 100
  return Math.max(10, Math.min(maxMessages, 100));
}
