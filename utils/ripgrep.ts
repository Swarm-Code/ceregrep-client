/**
 * Ripgrep wrapper for file searching
 * Simplified from swarm-client
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Execute ripgrep search
 *
 * @param args - Ripgrep arguments (e.g., ['-li', 'pattern', '--glob', '*.ts'])
 * @param target - Target directory to search
 * @param abortSignal - AbortSignal for cancellation
 * @returns Array of matching file paths
 */
export async function ripGrep(
  args: string[],
  target: string,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  try {
    // Use system ripgrep (rg)
    const { stdout } = await execFileAsync(
      'rg',
      [...args, target],
      {
        maxBuffer: 1_000_000,
        signal: abortSignal as any,
        timeout: 10_000,
      },
    );

    return stdout.trim().split('\n').filter(Boolean);
  } catch (error: any) {
    // Exit code 1 from ripgrep means "no matches found" - this is normal
    if (error.code === 1) {
      return [];
    }
    // If ripgrep is not installed, throw a helpful error
    if (error.code === 'ENOENT') {
      throw new Error(
        'ripgrep (rg) is not installed. Please install it: https://github.com/BurntSushi/ripgrep#installation',
      );
    }
    throw error;
  }
}

/**
 * List all content files in a directory
 * Uses ripgrep with common ignore files
 */
export async function listAllContentFiles(
  path: string,
  abortSignal?: AbortSignal,
  limit: number = 1000,
): Promise<string[]> {
  try {
    const results = await ripGrep(['-l', '.'], path, abortSignal);
    return results.slice(0, limit);
  } catch (e) {
    console.error('listAllContentFiles failed:', e);
    return [];
  }
}
