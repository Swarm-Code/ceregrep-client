/**
 * Grep Tool - Search for patterns in files using ripgrep
 * Converted from Kode implementation to headless TypeScript
 */

import { stat } from 'fs/promises';
import { resolve } from 'path';
import { z } from 'zod';
import { Tool } from '../../core/tool.js';
import { ripGrep } from '../../utils/ripgrep.js';

const DESCRIPTION = `
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files containing specific patterns
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead
`;

const inputSchema = z.strictObject({
  pattern: z
    .string()
    .describe('The regular expression pattern to search for in file contents'),
  path: z
    .string()
    .optional()
    .describe(
      'The directory to search in. Defaults to the current working directory.',
    ),
  include: z
    .string()
    .optional()
    .describe(
      'File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")',
    ),
});

const MAX_RESULTS = 100;

type Input = typeof inputSchema;
type Output = {
  durationMs: number;
  numFiles: number;
  filenames: string[];
};

export const GrepTool = {
  name: 'Grep',
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
  renderResultForAssistant({ numFiles, filenames }: Output) {
    if (numFiles === 0) {
      return 'No files found';
    }
    let result = `Found ${numFiles} file${numFiles === 1 ? '' : 's'}\n${filenames.slice(0, MAX_RESULTS).join('\n')}`;
    if (numFiles > MAX_RESULTS) {
      result +=
        '\n(Results are truncated. Consider using a more specific path or pattern.)';
    }
    return result;
  },
  async *call({ pattern, path, include }: z.infer<typeof inputSchema>, { abortController }: any) {
    const start = Date.now();
    const absolutePath = path ? resolve(path) : process.cwd();

    const args = ['-li', pattern];
    if (include) {
      args.push('--glob', include);
    }

    const results = await ripGrep(args, absolutePath, abortController.signal);

    const stats = await Promise.all(results.map(_ => stat(_)));
    const matches = results
      .map((_, i) => [_, stats[i]!] as const)
      .sort((a, b) => {
        if (process.env.NODE_ENV === 'test') {
          return a[0].localeCompare(b[0]);
        }
        const timeComparison = (b[1].mtimeMs ?? 0) - (a[1].mtimeMs ?? 0);
        if (timeComparison === 0) {
          return a[0].localeCompare(b[0]);
        }
        return timeComparison;
      })
      .map(_ => _[0]);

    const output = {
      filenames: matches,
      durationMs: Date.now() - start,
      numFiles: matches.length,
    };

    yield {
      type: 'result',
      resultForAssistant: this.renderResultForAssistant!(output),
      data: output,
    };
  },
} as Tool;
