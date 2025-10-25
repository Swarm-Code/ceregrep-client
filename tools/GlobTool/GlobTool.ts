/**
 * Glob Tool - Fast file pattern matching
 * Converted from Kode implementation to headless TypeScript
 */

import { stat } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { z } from 'zod';
import fastGlob from 'fast-glob';
import { Tool } from '../../core/tool.js';

const DESCRIPTION = `- Fast file pattern matching tool that works with any codebase size
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
`;

const inputSchema = z.strictObject({
  pattern: z.string().describe('The glob pattern to match files against'),
  path: z
    .string()
    .optional()
    .describe(
      'The directory to search in. Defaults to the current working directory.',
    ),
});

const MAX_RESULTS = 100;

type Input = typeof inputSchema;
type Output = {
  durationMs: number;
  numFiles: number;
  filenames: string[];
  truncated: boolean;
};

export const GlobTool = {
  name: 'Glob',
  async description() {
    return DESCRIPTION.trim();
  },
  inputSchema,
  isReadOnly() {
    return true;
  },
  async isEnabled() {
    return true;
  },
  needsPermissions({ path }: z.infer<typeof inputSchema>) {
    return true;
  },
  renderResultForAssistant({ numFiles, filenames, truncated }: Output) {
    if (numFiles === 0) {
      return 'No files found';
    }
    let result = filenames.join('\n');
    // Only add truncation message if results were actually truncated
    if (truncated) {
      result +=
        '\n(Results are truncated. Consider using a more specific path or pattern.)';
    }
    return result;
  },
  async *call(
    { pattern, path }: z.infer<typeof inputSchema>,
    { abortController }: any,
  ) {
    const start = Date.now();
    const absolutePath = path
      ? isAbsolute(path)
        ? path
        : resolve(process.cwd(), path)
      : process.cwd();

    // Check if aborted before execution
    if (abortController.signal.aborted) {
      const output: Output = {
        filenames: [],
        durationMs: Date.now() - start,
        numFiles: 0,
        truncated: false,
      };

      yield {
        type: 'result',
        resultForAssistant: 'Search was cancelled',
        data: output,
      };
      return;
    }

    // Use fast-glob to find matching files
    const files = await fastGlob(pattern, {
      cwd: absolutePath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
      onlyFiles: true,
    });

    // Get file stats and sort by modification time
    const stats = await Promise.all(files.map((file: string) => stat(file)));
    const matches = files
      .map((file: string, i: number) => [file, stats[i]!] as const)
      .sort((a: readonly [string, import('fs').Stats], b: readonly [string, import('fs').Stats]) => {
        if (process.env.NODE_ENV === 'test') {
          return a[0].localeCompare(b[0]);
        }
        const timeComparison = Number(b[1].mtimeMs) - Number(a[1].mtimeMs);
        if (timeComparison === 0) {
          return a[0].localeCompare(b[0]);
        }
        return timeComparison;
      })
      .map((entry: readonly [string, import('fs').Stats]) => entry[0]);

    // Limit results to MAX_RESULTS
    const truncated = matches.length > MAX_RESULTS;
    const filenames = matches.slice(0, MAX_RESULTS);

    const output: Output = {
      filenames,
      durationMs: Date.now() - start,
      numFiles: filenames.length,
      truncated,
    };

    yield {
      type: 'result',
      resultForAssistant: this.renderResultForAssistant!(output),
      data: output,
    };
  },
} as Tool;
