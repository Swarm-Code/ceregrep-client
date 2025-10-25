#!/usr/bin/env node
/**
 * CLI for Ceregrep Agent Framework
 * Headless command-line interface - no UI, pure stdout/stderr
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import { CeregrepClient } from '../sdk/typescript/index.js';
import { getTools } from '../tools/index.js';
import { getConfig, getCurrentProjectConfig, saveCurrentProjectConfig, getConfigSources } from '../config/loader.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
import { PersistentShell } from '../utils/shell.js';
import { StreamRenderer } from './stream-renderer.js';
import { getTokenStats } from '../core/tokens.js';
import { Message } from '../core/messages.js';
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
  .name('scout')
  .description('Headless agent framework with Bash, Ripgrep, and MCP support')
  .version(version);

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
      // Enable debug environment variables if --debug flag is set
      if (options.debug) {
        process.env.DEBUG_CEREBRAS = '1';
        process.env.DEBUG_MCP = '1';
        process.env.DEBUG = '1';
        console.log('🔍 Debug mode enabled - verbose output will be shown\n');
      }

      // Only include overrides that are actually set (not undefined)
      const configOverrides: any = {};
      if (options.model) configOverrides.model = options.model;
      if (options.verbose) configOverrides.verbose = options.verbose;
      if (options.debug) configOverrides.debug = options.debug;

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

      // Load tools and filter out write-capable tools (read-only mode for CLI query)
      const allTools = await getTools(true);
      const readOnlyTools = allTools.filter(tool => {
        const toolName = tool.name;
        // Block write-capable tools in CLI query mode
        const blockedTools = ['Edit', 'Write', 'Bash', 'FileEditTool', 'FileWriteTool', 'BashTool', 'TodoWrite', 'TodoWriteTool'];
        return !blockedTools.includes(toolName);
      });

      const client = new CeregrepClient(configOverrides);

      // Show prompt header
      renderer.showPrompt(prompt);

      renderer.startQuery();

      // Collect all messages for token stats (SDK is now stateless)
      const allMessages: Message[] = [];

      // Stream messages in real-time
      // Pass empty message history since CLI is single-query
      // Use read-only tools to prevent file modifications
      for await (const message of client.queryStream([], prompt, {
        verbose: options.verbose,
        debug: options.debug,
        enableThinking: configOverrides.enableThinking,
        ultrathinkMode: configOverrides.ultrathinkMode,
        maxThinkingTokens: configOverrides.maxThinkingTokens,
        tools: readOnlyTools,
      })) {
        renderer.handleMessage(message);
        allMessages.push(message);
      }

      // Get final token stats from collected messages
      const stats = getTokenStats(allMessages);

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
      const sources = getConfigSources();

      console.log('╔════════════════════════════════════════╗');
      console.log('║     Scout Configuration           ║');
      console.log('╚════════════════════════════════════════╝\n');

      // Config sources
      console.log('📍 Configuration Sources:');
      if (sources.global) {
        console.log(`  Global: ${sources.global}`);
      } else {
        console.log('  Global: None');
      }
      if (sources.project) {
        console.log(`  Project: ${sources.project}`);
      } else {
        console.log('  Project: None');
      }
      console.log();

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
  .description('Update scout to the latest version')
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
        execSync('npm install -g swarm-scout@latest --force', {
          stdio: 'inherit',
        });
        console.log(
          `\n✓ Successfully updated to version ${versionInfo.latest}`
        );
        await disconnectAllServers();
        process.exit(0);
      } catch (error) {
        console.error('✗ Failed to update. Please try manually:');
        console.error('  npm install -g swarm-scout@latest');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('install')
  .description('Reinstall scout (useful for fixing issues)')
  .action(async () => {
    try {
      const version = await import('../utils/version-check.js').then(
        (m) => m.getLocalVersion()
      );

      console.log(`Reinstalling scout ${version}...\n`);

      try {
        execSync('npm install -g . --force', {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log(`\n✓ Successfully reinstalled scout ${version}`);
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

// TUI command
program
  .command('tui')
  .description('Start the interactive TUI interface')
  .option('-c, --conversation <id>', 'Load a specific conversation')
  .option('-a, --agent <id>', 'Start with a specific agent')
  .option('-l, --log', 'Enable conversation logging to ~/.swarm-cli/logs/')
  .option('--debug', 'Enable debug output')
  .action(async (options: any) => {
    try {
      // Enable debug environment variables if --debug flag is set
      if (options.debug) {
        process.env.DEBUG_CEREBRAS = '1';
        process.env.DEBUG_MCP = '1';
        process.env.DEBUG = '1';
        console.log('🔍 Debug mode enabled - verbose output will be shown\n');
      }

      const { startTUI } = await import('../tui/index.js');
      startTUI({
        conversationId: options.conversation,
        agentId: options.agent,
        enableLogging: options.log,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// TUI Query command (headless TUI for testing)
program
  .command('tui-query')
  .description('Query using TUI mode system prompts (headless for testing)')
  .argument('<prompt>', 'Prompt to send to the agent')
  .option('-m, --mode <mode>', 'TUI mode: plan, act, auto, or debug (default: plan)', 'plan')
  .option('--debug', 'Enable debug output')
  .action(async (prompt: string, options: any) => {
    const renderer = new StreamRenderer(false);

    try {
      // Enable debug environment variables if --debug flag is set
      if (options.debug) {
        process.env.DEBUG_CEREBRAS = '1';
        process.env.DEBUG_MCP = '1';
        process.env.DEBUG = '1';
        console.log('🔍 Debug mode enabled - verbose output will be shown\n');
      }

      // Import TUI mode prompt logic
      const { getModeSystemPrompt } = await import('../tui/mode-prompts.js');
      const { getBackgroundAgent } = await import('../tui/background-agent.js');

      // Validate mode
      const validModes = ['plan', 'act', 'auto', 'debug'];
      const mode = options.mode.toLowerCase();
      if (!validModes.includes(mode)) {
        console.error(`Error: Invalid mode "${options.mode}". Must be one of: ${validModes.join(', ')}`);
        process.exit(1);
      }

      // Map lowercase mode to TUI AgentMode type
      const agentMode = mode.toUpperCase() as 'PLAN' | 'ACT' | 'AUTO' | 'DEBUG';

      // Get background context (git status, etc.)
      const backgroundAgent = getBackgroundAgent();
      const bgContext = await backgroundAgent.getContext([]);

      // Get mode-specific system prompt
      const modePrompt = getModeSystemPrompt(agentMode);

      // Inject background context into system prompt
      const contextLines = backgroundAgent.formatContextForPrompt(bgContext);
      const fullPrompt = [...modePrompt, ...contextLines];

      const client = new CeregrepClient({
        debug: options.debug,
      });

      // Show prompt header
      renderer.showPrompt(prompt);
      console.log(`Mode: ${agentMode}\n`);

      renderer.startQuery();

      // Collect messages for stats
      const allMessages: Message[] = [];

      // Stream messages in real-time with stateless SDK
      for await (const message of client.queryStream([], prompt, {
        systemPrompt: fullPrompt,
        debug: options.debug,
      })) {
        renderer.handleMessage(message);
        allMessages.push(message);
      }

      // Get final token stats from collected messages
      const stats = getTokenStats(allMessages);

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
      await disconnectAllServers();
      process.exit(0);
    } catch (error) {
      renderer.finish(error instanceof Error ? error : new Error(String(error)));
      PersistentShell.getInstance().close();
      await disconnectAllServers();
      process.exit(1);
    }
  });

// Agent management commands
program.addCommand(createAgentCommand());

// Shell completion commands
program.addCommand(createCompletionCommand());

program.parse();
