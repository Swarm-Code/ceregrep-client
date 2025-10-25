/**
 * LS Tool - List directory contents in a tree structure
 * Converted from Kode implementation to headless TypeScript
 */

import { readdirSync } from 'fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'path';
import { z } from 'zod';
import { Tool } from '../../core/tool.js';

const MAX_FILES = 1000;
const TRUNCATED_MESSAGE = `There are more than ${MAX_FILES} files in the repository. Use the LS tool (passing a specific path), Bash tool, and other tools to explore nested directories. The first ${MAX_FILES} files and directories are included below:\n\n`;

const DESCRIPTION = `Lists the contents of a directory in a tree structure. This tool recursively traverses directories and displays files and subdirectories in a hierarchical format.

Usage:
- Provide an absolute path to list its contents
- The tool shows up to ${MAX_FILES} files and directories
- Hidden files and directories (starting with .) are skipped
- Python __pycache__ directories are skipped
`;

const inputSchema = z.strictObject({
  path: z
    .string()
    .describe(
      'The absolute path to the directory to list (must be absolute, not relative)',
    ),
});

type Input = typeof inputSchema;
type Output = string;

type TreeNode = {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
};

function listDirectory(
  initialPath: string,
  cwd: string,
  abortSignal: AbortSignal,
): string[] {
  const results: string[] = [];

  const queue = [initialPath];
  while (queue.length > 0) {
    if (results.length > MAX_FILES) {
      return results;
    }

    if (abortSignal.aborted) {
      return results;
    }

    const path = queue.shift()!;
    if (skip(path)) {
      continue;
    }

    if (path !== initialPath) {
      results.push(relative(cwd, path) + sep);
    }

    let children;
    try {
      children = readdirSync(path, { withFileTypes: true });
    } catch (e) {
      // eg. EPERM, EACCES, ENOENT, etc.
      console.error(e);
      continue;
    }

    for (const child of children) {
      if (child.isDirectory()) {
        queue.push(join(path, child.name) + sep);
      } else {
        const fileName = join(path, child.name);
        if (skip(fileName)) {
          continue;
        }
        results.push(relative(cwd, fileName));
        if (results.length > MAX_FILES) {
          return results;
        }
      }
    }
  }

  return results;
}

function createFileTree(sortedPaths: string[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const path of sortedPaths) {
    const parts = path.split(sep);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (!part) {
        // directories have trailing slashes
        continue;
      }
      currentPath = currentPath ? `${currentPath}${sep}${part}` : part;
      const isLastPart = i === parts.length - 1;

      const existingNode = currentLevel.find(node => node.name === part);

      if (existingNode) {
        currentLevel = existingNode.children || [];
      } else {
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          type: isLastPart ? 'file' : 'directory',
        };

        if (!isLastPart) {
          newNode.children = [];
        }

        currentLevel.push(newNode);
        currentLevel = newNode.children || [];
      }
    }
  }

  return root;
}

/**
 * Prints a file tree as text
 * Example:
 * - /home/user/project/
 *   - src/
 *     - index.ts
 *     - utils/
 *       - file.ts
 */
function printTree(tree: TreeNode[], level = 0, prefix = '', cwd?: string): string {
  let result = '';

  // Add absolute path at root level
  if (level === 0 && cwd) {
    result += `- ${cwd}${sep}\n`;
    prefix = '  ';
  }

  for (const node of tree) {
    // Add the current node to the result
    result += `${prefix}${'-'} ${node.name}${node.type === 'directory' ? sep : ''}\n`;

    // Recursively print children if they exist
    if (node.children && node.children.length > 0) {
      result += printTree(node.children, level + 1, `${prefix}  `);
    }
  }

  return result;
}

// TODO: Add windows support
function skip(path: string): boolean {
  if (path !== '.' && basename(path).startsWith('.')) {
    return true;
  }
  if (path.includes(`__pycache__${sep}`)) {
    return true;
  }
  return false;
}

export const LSTool = {
  name: 'LS',
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
  renderResultForAssistant(data: Output) {
    return data;
  },
  async *call({ path }: z.infer<typeof inputSchema>, { abortController }: any) {
    const cwd = process.cwd();
    const fullFilePath = isAbsolute(path) ? path : resolve(cwd, path);
    const result = listDirectory(
      fullFilePath,
      cwd,
      abortController.signal,
    ).sort();

    // Plain tree for user display
    const userTree = printTree(createFileTree(result), 0, '', cwd);

    // Tree with safety warning for assistant only
    const assistantTree = userTree;

    if (result.length < MAX_FILES) {
      yield {
        type: 'result',
        data: userTree, // Show user the tree
        resultForAssistant: this.renderResultForAssistant!(assistantTree), // Send to assistant
      };
    } else {
      const userData = `${TRUNCATED_MESSAGE}${userTree}`;
      const assistantData = `${TRUNCATED_MESSAGE}${assistantTree}`;
      yield {
        type: 'result',
        data: userData, // Show user the truncated tree
        resultForAssistant: this.renderResultForAssistant!(assistantData), // Send to assistant
      };
    }
  },
} as Tool;
