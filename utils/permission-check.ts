/**
 * Permission and environment checking utility
 * Detects and provides helpful error messages for common issues
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface PermissionCheckResult {
  isExecutable: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Check if the current CLI script is executable
 */
export function checkExecutablePermissions(): PermissionCheckResult {
  try {
    // Get the path to this script
    const scriptPath = new URL(import.meta.url).pathname;

    // Check if it's readable and executable
    try {
      fs.accessSync(scriptPath, fs.constants.R_OK | fs.constants.X_OK);
      return { isExecutable: true };
    } catch (err) {
      // Not executable, try to get the actual CLI path
      const cliPath = path.join(
        path.dirname(scriptPath),
        '..',
        'cli',
        'index.js'
      );

      if (fs.existsSync(cliPath)) {
        const stats = fs.statSync(cliPath);
        const isExecutable = (stats.mode & 0o111) !== 0;

        if (!isExecutable) {
          return {
            isExecutable: false,
            error: `CLI script is not executable: ${cliPath}`,
            suggestion: `Run: chmod +x ${cliPath}`,
          };
        }

        return { isExecutable: true };
      }

      return {
        isExecutable: false,
        error: 'CLI script not found',
        suggestion: 'Try reinstalling: npm install -g ceregrep@latest',
      };
    }
  } catch (err) {
    return {
      isExecutable: false,
      error: `Permission check failed: ${err instanceof Error ? err.message : String(err)}`,
      suggestion: 'Try running: ceregrep install',
    };
  }
}

/**
 * Check if MCP can be initialized properly
 */
export async function checkMCPAvailability(): Promise<PermissionCheckResult> {
  try {
    // Check if context7-mcp is available
    try {
      execSync('npx @upstash/context7-mcp --help', {
        stdio: 'pipe',
        timeout: 5000,
      });
      return { isExecutable: true };
    } catch (err) {
      return {
        isExecutable: false,
        error: 'Context7 MCP server not available',
        suggestion:
          'Run: npm install -g @upstash/context7-mcp or configure MCP servers with: ceregrep mcp add',
      };
    }
  } catch (err) {
    return {
      isExecutable: false,
      error: `MCP availability check failed: ${err instanceof Error ? err.message : String(err)}`,
      suggestion: 'Try running: ceregrep doctor',
    };
  }
}

/**
 * Format permission error message
 */
export function formatPermissionError(result: PermissionCheckResult): string {
  if (result.isExecutable) {
    return '';
  }

  const lines: string[] = [
    '\n╔════════════════════════════════════════════════════════════╗',
    '║                  ⚠️  Permission Error                       ║',
    '╠════════════════════════════════════════════════════════════╣',
    `║  ${result.error?.padEnd(56) || 'Unknown permission issue'.padEnd(56)} ║`,
  ];

  if (result.suggestion) {
    lines.push('╠════════════════════════════════════════════════════════════╣');
    lines.push(`║  Fix:                                                      ║`);
    const suggestion = result.suggestion;
    const maxLen = 54;

    if (suggestion.length > maxLen) {
      // Split long suggestions
      for (let i = 0; i < suggestion.length; i += maxLen) {
        lines.push(`║    ${suggestion.substring(i, i + maxLen).padEnd(54)} ║`);
      }
    } else {
      lines.push(`║    ${suggestion.padEnd(54)} ║`);
    }
  }

  lines.push('╚════════════════════════════════════════════════════════════╝\n');

  return lines.join('\n');
}
