/**
 * Grep Tool - Search for patterns in files using ripgrep
 * Headless version based on swarm-client GrepTool
 */

import { stat } from 'fs/promises';
import { z } from 'zod';
import { Tool } from '../core/tool.js';
import { ripGrep } from '../utils/ripgrep.js';
import { resolve } from 'path';
import {
  isOutputTooLarge,
  truncateOutput,
  getMaxTokensForTool,
  estimateTokens,
} from '../utils/tool-response-limiter.js';

const inputSchema = z.strictObject({
  pattern: z
    .string()
    .describe('The regular expression pattern to search for in file contents'),
  path: z
    .string()
    .optional()
    .describe('The directory to search in. Defaults to the current working directory.'),
  include: z
    .string()
    .optional()
    .describe('File pattern to include in the search (e.g. "*.ts", "*.{ts,tsx}")'),
});

const MAX_RESULTS = 100;

type Output = {
  durationMs: number;
  numFiles: number;
  filenames: string[];
};

export const GrepTool: Tool = {
  name: 'Grep',
  async description() {
    return 'A powerful search tool built on ripgrep. Supports full regex syntax and file filtering.';
  },
  inputSchema,
  isReadOnly() {
    return true;
  },
  async isEnabled() {
    return true;
  },
  needsPermissions({ path }) {
    // In a full implementation, this would check filesystem permissions
    // For now, always require permissions
    return true;
  },
  renderResultForAssistant({ numFiles, filenames }, pattern?: string) {
    if (numFiles === 0) {
      return 'No files found';
    }

    // Build result with all filenames first
    let result = `Found ${numFiles} file${numFiles === 1 ? '' : 's'}\n${filenames.slice(0, MAX_RESULTS).join('\n')}`;
    if (numFiles > MAX_RESULTS) {
      result += '\n(Results are truncated. Consider using a more specific path or pattern.)';
    }

    // TOKEN-BASED OUTPUT LIMITING: Prevent massive file lists from bloating context
    const maxTokens = getMaxTokensForTool('Grep');

    if (isOutputTooLarge(result, maxTokens)) {
      const estimatedTokens = estimateTokens(result);
      console.error(`🚫 [Output Blocked] Grep results too large: ~${estimatedTokens.toLocaleString()} tokens. Max: ${maxTokens.toLocaleString()} tokens`);

      // Truncate with context-specific suggestions
      result = truncateOutput(result, maxTokens, {
        toolName: 'Grep',
        pattern: pattern || 'unknown',
      });
    }

    return result;
  },
  async *call({ pattern, path, include }, { abortController }) {
    const start = Date.now();
    const absolutePath = path ? resolve(path) : process.cwd();

    try {
      // Build ripgrep arguments
      const args = ['-li', pattern];
      if (include) {
        args.push('--glob', include);
      }

      // Execute ripgrep
      const results = await ripGrep(args, absolutePath, abortController.signal);

      // Get file stats for sorting by modification time
      const stats = await Promise.all(
        results.map(async (filePath) => {
          try {
            return await stat(filePath);
          } catch {
            return null;
          }
        }),
      );

      // Sort by modification time (newest first)
      const matches = results
        .map((filePath, i) => [filePath, stats[i]] as const)
        .filter(([_, stat]) => stat !== null)
        .sort((a, b) => {
          const timeComparison = (b[1]!.mtimeMs ?? 0) - (a[1]!.mtimeMs ?? 0);
          if (timeComparison === 0) {
            // Tiebreaker: sort by filename
            return a[0].localeCompare(b[0]);
          }
          return timeComparison;
        })
        .map(([filePath]) => filePath);

      const output: Output = {
        filenames: matches,
        durationMs: Date.now() - start,
        numFiles: matches.length,
      };

      yield {
        type: 'result',
        resultForAssistant: this.renderResultForAssistant!(output, pattern),
        data: output,
      };
    } catch (error) {
      yield {
        type: 'result',
        resultForAssistant: `Error searching files: ${error instanceof Error ? error.message : String(error)}`,
        data: {
          filenames: [],
          durationMs: Date.now() - start,
          numFiles: 0,
        },
      };
    }
  },
};
