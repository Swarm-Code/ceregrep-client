/**
 * File System Resource Provider
 * Provides file-based resources for @ mentions in the TUI
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FileResource {
  uri: string; // file:///absolute/path/to/file.ts
  name: string; // file.ts or relative/path/file.ts
  description?: string;
  mimeType?: string;
  isInRepo: boolean;
  absolutePath: string;
}

/**
 * Get the git repository root directory
 */
export async function getGitRoot(cwd: string = process.cwd()): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Check if a file path is within the git repository
 */
export async function isFileInRepo(filePath: string, cwd: string = process.cwd()): Promise<boolean> {
  const gitRoot = await getGitRoot(cwd);
  if (!gitRoot) {
    return false;
  }

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const normalizedPath = path.normalize(absolutePath);
  const normalizedGitRoot = path.normalize(gitRoot);

  return normalizedPath.startsWith(normalizedGitRoot);
}

/**
 * List files and directories in the repository (respecting .gitignore)
 */
export async function listRepoFiles(cwd: string = process.cwd()): Promise<FileResource[]> {
  const gitRoot = await getGitRoot(cwd);
  if (!gitRoot) {
    return [];
  }

  try {
    // Use git ls-files to get all tracked files
    const { stdout } = await execAsync('git ls-files', { cwd: gitRoot });
    const files = stdout
      .trim()
      .split('\n')
      .filter((f) => f.length > 0);

    const resources: FileResource[] = [];
    const directories = new Set<string>();

    // Add all files
    for (const file of files) {
      const absolutePath = path.join(gitRoot, file);
      const uri = `file://${absolutePath}`;

      resources.push({
        uri,
        name: file,
        absolutePath,
        isInRepo: true,
        mimeType: getMimeType(file),
      });

      // Extract all parent directories
      const parts = file.split('/');
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
        directories.add(currentPath);
      }
    }

    // Add all directories
    for (const dir of Array.from(directories).sort()) {
      const absolutePath = path.join(gitRoot, dir);
      const uri = `file://${absolutePath}`;

      resources.push({
        uri,
        name: dir + '/',
        absolutePath,
        isInRepo: true,
        mimeType: 'inode/directory',
      });
    }

    return resources;
  } catch (error) {
    console.warn('Failed to list repo files:', error);
    return [];
  }
}

/**
 * Search for files matching a pattern in the repository
 */
export async function searchRepoFiles(
  pattern: string,
  cwd: string = process.cwd()
): Promise<FileResource[]> {
  const allFiles = await listRepoFiles(cwd);

  if (!pattern || pattern.length === 0) {
    return allFiles;
  }

  const patternLower = pattern.toLowerCase();

  // Fuzzy match filter
  const fuzzyMatch = (str: string, pattern: string): boolean => {
    const strLower = str.toLowerCase();
    let patternIdx = 0;
    let strIdx = 0;

    while (patternIdx < pattern.length && strIdx < strLower.length) {
      if (pattern[patternIdx] === strLower[strIdx]) {
        patternIdx++;
      }
      strIdx++;
    }

    return patternIdx === pattern.length;
  };

  const matches = allFiles.filter((file) => fuzzyMatch(file.name, patternLower));

  // Sort by relevance (exact match > starts with > contains > fuzzy)
  return matches.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    const aExact = aName === patternLower;
    const bExact = bName === patternLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    const aStarts = aName.startsWith(patternLower);
    const bStarts = bName.startsWith(patternLower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    const aContains = aName.includes(patternLower);
    const bContains = bName.includes(patternLower);
    if (aContains && !bContains) return -1;
    if (!aContains && bContains) return 1;

    return aName.localeCompare(bName);
  });
}

/**
 * Read a file resource
 */
export async function readFileResource(
  filePath: string,
  cwd: string = process.cwd()
): Promise<{ content: string; mimeType: string; isInRepo: boolean }> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
  const isInRepo = await isFileInRepo(absolutePath, cwd);

  const content = await fs.readFile(absolutePath, 'utf-8');
  const mimeType = getMimeType(filePath);

  return {
    content,
    mimeType,
    isInRepo,
  };
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.ts': 'text/typescript',
    '.tsx': 'text/typescript',
    '.js': 'text/javascript',
    '.jsx': 'text/javascript',
    '.json': 'application/json',
    '.md': 'text/markdown',
    '.txt': 'text/plain',
    '.py': 'text/x-python',
    '.rs': 'text/x-rust',
    '.go': 'text/x-go',
    '.java': 'text/x-java',
    '.c': 'text/x-c',
    '.cpp': 'text/x-c++',
    '.h': 'text/x-c',
    '.hpp': 'text/x-c++',
    '.css': 'text/css',
    '.html': 'text/html',
    '.xml': 'text/xml',
    '.yaml': 'text/yaml',
    '.yml': 'text/yaml',
    '.toml': 'text/toml',
    '.sh': 'text/x-shellscript',
    '.bash': 'text/x-shellscript',
    '.zsh': 'text/x-shellscript',
  };

  return mimeTypes[ext] || 'text/plain';
}
