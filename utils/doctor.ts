/**
 * Diagnostic utility for checking ceregrep health
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/loader.js';
import { getMCPTools, listMCPServers } from '../mcp/client.js';

interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string[];
}

/**
 * Run all diagnostics
 */
export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  results.push(await checkNodeVersion());
  results.push(await checkNpmAvailable());
  results.push(await checkDependencies());
  results.push(await checkConfiguration());
  results.push(await checkMCPServers());
  results.push(await checkTools());
  results.push(await checkConfigFiles());

  return results;
}

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<DiagnosticResult> {
  try {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0], 10);

    if (major >= 18) {
      return {
        name: 'Node.js Version',
        status: 'pass',
        message: `✓ Node.js ${version} (required: >=18.0.0)`,
      };
    }

    return {
      name: 'Node.js Version',
      status: 'fail',
      message: `✗ Node.js ${version} is too old (required: >=18.0.0)`,
    };
  } catch (error) {
    return {
      name: 'Node.js Version',
      status: 'fail',
      message: '✗ Could not determine Node.js version',
    };
  }
}

/**
 * Check npm availability
 */
async function checkNpmAvailable(): Promise<DiagnosticResult> {
  try {
    const version = execSync('npm --version', { encoding: 'utf-8' }).trim();
    return {
      name: 'npm Availability',
      status: 'pass',
      message: `✓ npm ${version} is available`,
    };
  } catch (error) {
    return {
      name: 'npm Availability',
      status: 'fail',
      message: '✗ npm is not available in PATH',
    };
  }
}

/**
 * Check if dependencies are installed
 */
async function checkDependencies(): Promise<DiagnosticResult> {
  try {
    // Try multiple paths to find package.json
    let packageJsonPath: string | null = null;

    // Try dist/package.json first
    const distPath = path.join(process.cwd(), 'dist', 'package.json');
    if (fs.existsSync(distPath)) {
      packageJsonPath = distPath;
    }

    // Try project root
    if (!packageJsonPath) {
      const rootPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(rootPath)) {
        packageJsonPath = rootPath;
      }
    }

    // Try parent directories
    if (!packageJsonPath) {
      let currentDir = process.cwd();
      for (let i = 0; i < 5; i++) {
        const tryPath = path.join(currentDir, 'package.json');
        if (fs.existsSync(tryPath)) {
          packageJsonPath = tryPath;
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }

    if (!packageJsonPath) {
      return {
        name: 'Dependencies',
        status: 'warn',
        message: '⚠ Could not find package.json to check dependencies',
      };
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = packageJson.dependencies || {};

    const details: string[] = [];
    let allPresent = true;

    // Check key dependencies
    const keyDeps = [
      '@anthropic-ai/sdk',
      '@modelcontextprotocol/sdk',
      'commander',
      'chalk',
      'zod',
    ];

    for (const dep of keyDeps) {
      if (deps[dep]) {
        details.push(`  ✓ ${dep}: ${deps[dep]}`);
      } else {
        details.push(`  ✗ ${dep}: missing`);
        allPresent = false;
      }
    }

    return {
      name: 'Dependencies',
      status: allPresent ? 'pass' : 'fail',
      message: allPresent ? '✓ All dependencies declared' : '✗ Some dependencies missing',
      details,
    };
  } catch (error) {
    return {
      name: 'Dependencies',
      status: 'warn',
      message: '⚠ Could not check dependencies',
    };
  }
}

/**
 * Check configuration files
 */
async function checkConfigFiles(): Promise<DiagnosticResult> {
  try {
    const homeDir = process.env.HOME || '/tmp';
    const globalConfigPath = path.join(homeDir, '.ceregrep.json');
    const projectConfigPath = path.join(process.cwd(), '.ceregrep.json');

    const details: string[] = [];
    let hasConfig = false;

    if (fs.existsSync(globalConfigPath)) {
      details.push(`  ✓ Global config: ${globalConfigPath}`);
      hasConfig = true;
    } else {
      details.push(`  ℹ Global config: ${globalConfigPath} (optional)`);
    }

    if (fs.existsSync(projectConfigPath)) {
      details.push(`  ✓ Project config: ${projectConfigPath}`);
      hasConfig = true;
    } else {
      details.push(`  ℹ Project config: ${projectConfigPath} (optional)`);
    }

    return {
      name: 'Configuration Files',
      status: hasConfig ? 'pass' : 'warn',
      message: hasConfig ? '✓ Configuration files present' : '⚠ No configuration files found (using defaults)',
      details,
    };
  } catch (error) {
    return {
      name: 'Configuration Files',
      status: 'warn',
      message: '⚠ Could not check configuration files',
    };
  }
}

/**
 * Check configuration validity
 */
async function checkConfiguration(): Promise<DiagnosticResult> {
  try {
    const config = getConfig();
    const details: string[] = [];

    if (config.model) {
      details.push(`  ✓ Model: ${config.model}`);
    }

    if (config.provider) {
      details.push(`  ✓ Provider: ${config.provider.type}`);
    }

    if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
      details.push(`  ✓ MCP Servers: ${Object.keys(config.mcpServers).length} configured`);
    }

    return {
      name: 'Configuration',
      status: 'pass',
      message: '✓ Configuration loaded successfully',
      details,
    };
  } catch (error) {
    return {
      name: 'Configuration',
      status: 'warn',
      message: '⚠ Could not load configuration (will use defaults)',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Check MCP servers
 */
async function checkMCPServers(): Promise<DiagnosticResult> {
  try {
    const servers = await listMCPServers();
    const details: string[] = [];

    if (servers.length === 0) {
      return {
        name: 'MCP Servers',
        status: 'warn',
        message: '⚠ No MCP servers configured',
      };
    }

    for (const server of servers) {
      const status = server.status === 'connected' ? '✓' : '✗';
      details.push(`  [${status}] ${server.name} (${server.config.type})`);
      if (server.error) {
        details.push(`      Error: ${server.error}`);
      }
    }

    const connected = servers.filter((s) => s.status === 'connected').length;
    const status = connected > 0 ? 'pass' : 'warn';
    const message =
      connected > 0
        ? `✓ ${connected}/${servers.length} MCP servers connected`
        : `⚠ ${connected}/${servers.length} MCP servers connected`;

    return {
      name: 'MCP Servers',
      status,
      message,
      details,
    };
  } catch (error) {
    return {
      name: 'MCP Servers',
      status: 'warn',
      message: '⚠ Could not check MCP servers',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Check available tools
 */
async function checkTools(): Promise<DiagnosticResult> {
  try {
    const tools = await getMCPTools();

    const builtInTools = tools.filter((t) => t.name === 'bash' || t.name === 'grep');
    const mcpTools = tools.filter((t) => t.name.startsWith('mcp__'));

    const details: string[] = [
      `  ✓ Built-in tools: ${builtInTools.length}`,
      `  ✓ MCP tools: ${mcpTools.length}`,
      `  ✓ Total tools: ${tools.length}`,
    ];

    return {
      name: 'Tools',
      status: tools.length > 0 ? 'pass' : 'warn',
      message:
        tools.length > 0
          ? `✓ ${tools.length} tools available`
          : '⚠ No tools available',
      details,
    };
  } catch (error) {
    return {
      name: 'Tools',
      status: 'warn',
      message: '⚠ Could not check tools',
      details: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Format diagnostic results for display
 */
export function formatDiagnostics(results: DiagnosticResult[]): string {
  const lines: string[] = [
    '\n╔════════════════════════════════════════════════════════════╗',
    '║              Ceregrep System Diagnostics                   ║',
    '╚════════════════════════════════════════════════════════════╝\n',
  ];

  for (const result of results) {
    const icon =
      result.status === 'pass' ? '✓' : result.status === 'fail' ? '✗' : '⚠';
    const statusStr =
      result.status === 'pass' ? 'PASS' : result.status === 'fail' ? 'FAIL' : 'WARN';

    lines.push(`[${statusStr}] ${result.name}`);
    lines.push(`      ${result.message}`);

    if (result.details && result.details.length > 0) {
      for (const detail of result.details) {
        lines.push(`      ${detail}`);
      }
    }

    lines.push('');
  }

  const failCount = results.filter((r) => r.status === 'fail').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;

  lines.push('╔════════════════════════════════════════════════════════════╗');

  if (failCount === 0 && warnCount === 0) {
    lines.push('║              All systems healthy! ✓                        ║');
  } else {
    if (failCount > 0) {
      lines.push(`║              ${failCount} issue(s) found. Please fix above.        ║`);
    }
    if (warnCount > 0) {
      lines.push(`║              ${warnCount} warning(s). Consider reviewing.         ║`);
    }
  }

  lines.push('╚════════════════════════════════════════════════════════════╝\n');

  return lines.join('\n');
}
