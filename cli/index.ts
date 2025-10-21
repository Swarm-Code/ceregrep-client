#!/usr/bin/env node
/**
 * CLI for Ceregrep Agent Framework
 * Headless command-line interface - no UI, pure stdout/stderr
 */

import { Command } from 'commander';
import { CeregrepClient } from '../sdk/typescript/index.js';
import { getTools } from '../tools/index.js';
import { getConfig, getCurrentProjectConfig, saveCurrentProjectConfig } from '../config/loader.js';
import { PersistentShell } from '../utils/shell.js';
import { StreamRenderer } from './stream-renderer.js';
import { getTokenStats } from '../core/tokens.js';
import {
  listMCPServers,
  testMCPServer,
  connectToAllServers,
  disconnectAllServers,
} from '../mcp/client.js';
import { MCPServerConfig } from '../config/schema.js';
import { checkForUpdates, formatUpdateNotification } from '../utils/version-check.js';
import { runDiagnostics, formatDiagnostics } from '../utils/doctor.js';
import { checkExecutablePermissions, formatPermissionError } from '../utils/permission-check.js';
import { execSync } from 'child_process';
import { createAgentCommand } from './commands/agent.js';
import { createCompletionCommand } from './commands/completion.js';

// Check permissions on startup
const permCheck = checkExecutablePermissions();
if (!permCheck.isExecutable) {
  console.error(formatPermissionError(permCheck));
  process.exit(1);
}

const program = new Command();

program
  .name('ceregrep')
  .description('Headless agent framework with Bash, Ripgrep, and MCP support')
  .version('0.2.2');

// Check for updates asynchronously (non-blocking)
async function checkVersionOnStartup() {
  try {
    const versionInfo = await checkForUpdates();
    if (versionInfo.isOutdated) {
      const notification = formatUpdateNotification(versionInfo);
      console.log(notification);
    }
  } catch (error) {
    // Silently ignore version check errors
  }
}

// Run version check in background (non-blocking)
checkVersionOnStartup().catch(() => {
  // Ignore errors
});

program
  .command('query')
  .description('Query the agent with a prompt')
  .argument('<prompt>', 'Prompt to send to the agent')
  .option('-m, --model <model>', 'Model to use (default: claude-sonnet-4-20250514)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug output')
  .option('--thinking', 'Enable extended thinking mode')
  .option('--ultrathink', 'Enable ultrathink mode')
  .option('--max-thinking-tokens <tokens>', 'Maximum thinking tokens')
  .action(async (prompt: string, options: any) => {
    const renderer = new StreamRenderer(options.verbose || false);

    try {
      const configOverrides: any = {
        model: options.model,
        verbose: options.verbose,
        debug: options.debug,
      };

      // Add thinking mode settings if specified
      if (options.thinking) {
        configOverrides.enableThinking = true;
        if (!configOverrides.maxThinkingTokens && !options.maxThinkingTokens) {
          configOverrides.maxThinkingTokens = 10000; // Default thinking tokens
        }
      }

      if (options.ultrathink) {
        configOverrides.ultrathinkMode = true;
        configOverrides.enableThinking = true;
        if (!configOverrides.maxThinkingTokens && !options.maxThinkingTokens) {
          configOverrides.maxThinkingTokens = 20000; // More tokens for ultrathink
        }
      }

      if (options.maxThinkingTokens) {
        configOverrides.maxThinkingTokens = parseInt(options.maxThinkingTokens, 10);
      }

      const client = new CeregrepClient(configOverrides);

      // Show prompt header
      renderer.showPrompt(prompt);

      renderer.startQuery();

      // Stream messages in real-time
      for await (const message of client.queryStream(prompt, {
        verbose: options.verbose,
        debug: options.debug,
        enableThinking: configOverrides.enableThinking,
        ultrathinkMode: configOverrides.ultrathinkMode,
        maxThinkingTokens: configOverrides.maxThinkingTokens,
      })) {
        renderer.handleMessage(message);
      }

      // Get final token stats
      const history = client.getHistory();
      const stats = getTokenStats(history);

      // Finish rendering
      renderer.finish();

      // Show final synthesized response
      renderer.showFinalResponse();

      // Show token usage
      if (stats.total > 0) {
        renderer.showTokenStats(stats);
      }

      // Clean up persistent shell to allow process to exit
      PersistentShell.getInstance().close();
      process.exit(0);
    } catch (error) {
      renderer.finish(error instanceof Error ? error : new Error(String(error)));
      PersistentShell.getInstance().close();
      process.exit(1);
    }
  });

program
  .command('list-tools')
  .description('List available tools')
  .action(async () => {
    try {
      const tools = await getTools(true);
      console.log('Available tools:\n');
      for (const tool of tools) {
        const description =
          typeof tool.description === 'string'
            ? tool.description
            : await tool.description();
        console.log(`  ${tool.name}: ${description}`);
      }
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    try {
      const config = getConfig();
      console.log('╔════════════════════════════════════════╗');
      console.log('║     Ceregrep Configuration           ║');
      console.log('╚════════════════════════════════════════╝\n');

      // Core configuration
      console.log('🔧 Core Configuration:');
      console.log(`  Model: ${config.model}`);
      if (config.slowAndCapableModel) {
        console.log(`  Slow and Capable Model: ${config.slowAndCapableModel}`);
      }
      if (config.provider) {
        console.log(`  Provider: ${config.provider.type}`);
      }
      if (config.verbose) console.log('  Verbose: true');
      if (config.debug) console.log('  Debug: true');
      console.log();

      // Thinking mode
      console.log('🧠 Extended Thinking:');
      console.log(`  Enabled: ${config.enableThinking ? 'Yes' : 'No'}`);
      console.log(`  Ultrathink Mode: ${config.ultrathinkMode ? 'Yes' : 'No'}`);
      console.log(`  Max Thinking Tokens: ${config.maxThinkingTokens}`);
      console.log();

      // MCP Servers
      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        console.log('🔗 MCP Servers:');
        for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
          const disabled = serverConfig.disabled ? ' [DISABLED]' : '';
          if (serverConfig.type === 'stdio') {
            console.log(`  • ${name}${disabled}`);
            console.log(`    Command: ${serverConfig.command}`);
            if (serverConfig.args && serverConfig.args.length > 0) {
              console.log(`    Args: ${serverConfig.args.join(' ')}`);
            }
            if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
              console.log(`    Env: ${Object.keys(serverConfig.env).join(', ')}`);
            }
          } else {
            console.log(`  • ${name}${disabled}`);
            console.log(`    URL: ${serverConfig.url}`);
          }
          if (
            serverConfig.disabledTools &&
            serverConfig.disabledTools.length > 0
          ) {
            console.log(
              `    Disabled Tools: ${serverConfig.disabledTools.join(', ')}`
            );
          }
        }
        console.log();
      }

      // Context compaction
      console.log('📦 Context Compaction:');
      console.log(`  Threshold: ${config.compactionThreshold} tokens`);
      console.log(`  Keep Recent: ${config.compactionKeepRecentCount} messages`);
      console.log();

      // Available tools
      console.log('🛠️  Available Tools:');
      const tools = await getTools(true);
      if (tools.length === 0) {
        console.log('  No tools available');
      } else {
        for (const tool of tools) {
          console.log(`  • ${tool.name}`);
        }
      }

      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Run system diagnostics')
  .action(async () => {
    try {
      console.log('Running diagnostics...\n');
      const results = await runDiagnostics();
      const output = formatDiagnostics(results);
      console.log(output);
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update ceregrep to the latest version')
  .action(async () => {
    try {
      console.log('Checking for updates...\n');
      const versionInfo = await checkForUpdates();

      if (!versionInfo.isOutdated) {
        console.log(
          `✓ You are already on the latest version (${versionInfo.current})`
        );
        await disconnectAllServers();
        process.exit(0);
      }

      console.log(
        `Updating from ${versionInfo.current} to ${versionInfo.latest}...`
      );
      console.log('');

      // Run npm update
      try {
        execSync('npm install -g ceregrep@latest --force', {
          stdio: 'inherit',
        });
        console.log(
          `\n✓ Successfully updated to version ${versionInfo.latest}`
        );
        await disconnectAllServers();
        process.exit(0);
      } catch (error) {
        console.error('✗ Failed to update. Please try manually:');
        console.error('  npm install -g ceregrep@latest');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Reinstall ceregrep (useful for fixing issues)')
  .action(async () => {
    try {
      const version = await import('../utils/version-check.js').then(
        (m) => m.getLocalVersion()
      );

      console.log(`Reinstalling ceregrep ${version}...\n`);

      try {
        execSync('npm install -g . --force', {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log(`\n✓ Successfully reinstalled ceregrep ${version}`);
        await disconnectAllServers();
        process.exit(0);
      } catch (error) {
        console.error('✗ Failed to reinstall. Please try manually:');
        console.error('  npm install -g . --force');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// MCP management commands
const mcpCommand = program.command('mcp').description('Manage MCP servers');

mcpCommand
  .command('list')
  .description('List all configured MCP servers')
  .action(async () => {
    try {
      const servers = await listMCPServers();
      if (servers.length === 0) {
        console.log('No MCP servers configured.');
        await disconnectAllServers();
        process.exit(0);
      }

      console.log('Configured MCP servers:\n');
      for (const server of servers) {
        const status = server.status === 'connected' ? '✓' : '✗';
        console.log(`  [${status}] ${server.name} (${server.config.type})`);
        if (server.config.disabled) {
          console.log(`      Status: DISABLED`);
        }
        if (server.config.disabledTools && server.config.disabledTools.length > 0) {
          console.log(`      Disabled tools: ${server.config.disabledTools.join(', ')}`);
        }
        if (server.error) {
          console.log(`      Error: ${server.error}`);
        }
      }

      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

mcpCommand
  .command('add <name>')
  .description('Add a new MCP server')
  .requiredOption('-t, --type <type>', 'Server type: stdio or sse')
  .option('-c, --command <command>', 'Command to run (for stdio type)')
  .option('-a, --args <args...>', 'Arguments for command (for stdio type)')
  .option('-u, --url <url>', 'Server URL (for sse type)')
  .option('-e, --env <env...>', 'Environment variables (format: KEY=VALUE)')
  .action(async (name: string, options: any) => {
    try {
      if (options.type !== 'stdio' && options.type !== 'sse') {
        console.error('Error: type must be "stdio" or "sse"');
        process.exit(1);
      }

      if (options.type === 'stdio' && !options.command) {
        console.error('Error: --command is required for stdio type');
        process.exit(1);
      }

      if (options.type === 'sse' && !options.url) {
        console.error('Error: --url is required for sse type');
        process.exit(1);
      }

      let serverConfig: MCPServerConfig;

      if (options.type === 'stdio') {
        const env: Record<string, string> = {};
        if (options.env) {
          for (const envStr of options.env) {
            const [key, value] = envStr.split('=');
            if (key && value) env[key] = value;
          }
        }

        serverConfig = {
          type: 'stdio',
          command: options.command,
          args: options.args || [],
          env: Object.keys(env).length > 0 ? env : undefined,
          disabled: false,
          disabledTools: [],
        } as any;
      } else {
        serverConfig = {
          type: 'sse',
          url: options.url,
          disabled: false,
          disabledTools: [],
        } as any;
      }

      // Test the connection
      console.log(`Testing connection to ${name}...`);
      const testResult = await testMCPServer(name, serverConfig);

      if (!testResult.success) {
        console.error(`Error: Failed to connect - ${testResult.message}`);
        process.exit(1);
      }

      console.log(`✓ Connection successful - ${testResult.message}`);

      // Save to config
      const config = getCurrentProjectConfig();
      if (!config.mcpServers) config.mcpServers = {};
      config.mcpServers[name] = serverConfig;
      saveCurrentProjectConfig(config);

      console.log(`✓ MCP server "${name}" added to .ceregrep.json`);
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

mcpCommand
  .command('remove <name>')
  .description('Remove an MCP server')
  .action(async (name: string) => {
    try {
      const config = getCurrentProjectConfig();
      if (!config.mcpServers?.[name]) {
        console.error(`Error: MCP server "${name}" not found`);
        process.exit(1);
      }

      delete config.mcpServers[name];
      saveCurrentProjectConfig(config);

      console.log(`✓ MCP server "${name}" removed from .ceregrep.json`);
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

mcpCommand
  .command('test <name>')
  .description('Test connection to an MCP server')
  .action(async (name: string) => {
    try {
      const config = getConfig();
      const serverConfig = config.mcpServers?.[name];

      if (!serverConfig) {
        console.error(`Error: MCP server "${name}" not found in configuration`);
        process.exit(1);
      }

      console.log(`Testing connection to ${name}...`);
      const result = await testMCPServer(name, serverConfig);

      if (result.success) {
        console.log(`✓ ${result.message}`);
      } else {
        console.error(`✗ ${result.message}`);
        process.exit(1);
      }

      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

mcpCommand
  .command('enable <name> [tools...]')
  .description('Enable an MCP server or specific tools')
  .action(async (name: string, tools: string[]) => {
    try {
      const config = getCurrentProjectConfig();
      if (!config.mcpServers?.[name]) {
        console.error(`Error: MCP server "${name}" not found`);
        process.exit(1);
      }

      const server = config.mcpServers[name];
      server.disabled = false;

      if (tools.length > 0) {
        // Re-enable specific tools
        if (!server.disabledTools) server.disabledTools = [];
        server.disabledTools = server.disabledTools.filter(
          (t: string) => !tools.includes(t)
        );
        console.log(`✓ Enabled tools: ${tools.join(', ')}`);
      } else {
        console.log(`✓ Enabled MCP server "${name}"`);
      }

      saveCurrentProjectConfig(config);
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

mcpCommand
  .command('disable <name> [tools...]')
  .description('Disable an MCP server or specific tools')
  .action(async (name: string, tools: string[]) => {
    try {
      const config = getCurrentProjectConfig();
      if (!config.mcpServers?.[name]) {
        console.error(`Error: MCP server "${name}" not found`);
        process.exit(1);
      }

      const server = config.mcpServers[name];

      if (tools.length > 0) {
        // Disable specific tools
        if (!server.disabledTools) server.disabledTools = [];
        for (const tool of tools) {
          if (!server.disabledTools.includes(tool)) {
            server.disabledTools.push(tool);
          }
        }
        console.log(`✓ Disabled tools: ${tools.join(', ')}`);
      } else {
        server.disabled = true;
        console.log(`✓ Disabled MCP server "${name}"`);
      }

      saveCurrentProjectConfig(config);
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Agent management commands
program.addCommand(createAgentCommand());

// Shell completion commands
program.addCommand(createCompletionCommand());

program.parse();
