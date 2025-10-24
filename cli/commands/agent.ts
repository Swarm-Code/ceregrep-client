/**
 * Agent CLI Commands
 * Command handlers for agent management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAgent,
  listAgents,
  deleteAgent,
  exportAgent,
  importAgent,
  initializeDefaultAgents,
} from '../../agents/index.js';
import { CeregrepClient } from '../../sdk/typescript/index.js';
import { getTools } from '../../tools/index.js';
import { getConfig } from '../../config/loader.js';
import { createAgentClientConfig } from '../../agents/config-merger.js';
import { StreamRenderer } from '../stream-renderer.js';
import { getTokenStats } from '../../core/tokens.js';
import { Message } from '../../core/messages.js';
import { PersistentShell } from '../../utils/shell.js';
import { disconnectAllServers } from '../../mcp/client.js';

/**
 * Create agent command group
 */
export function createAgentCommand(): Command {
  const agentCommand = new Command('agent')
    .description('Manage and invoke scout agents');

  // ceregrep agent <agent-id> <prompt> - Invoke agent
  agentCommand
    .command('invoke')
    .description('Invoke an agent with a prompt')
    .argument('<agent-id>', 'Agent ID to invoke')
    .argument('<prompt>', 'Prompt to send to the agent')
    .option('-m, --model <model>', 'Override model')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--debug', 'Enable debug output')
    .option('--thinking', 'Enable extended thinking mode')
    .option('--ultrathink', 'Enable ultrathink mode')
    .action(async (agentId: string, prompt: string, options: any) => {
      const renderer = new StreamRenderer(options.verbose || false);

      try {
        // Load agent config
        const agent = await getAgent(agentId);
        if (!agent) {
          console.error(`Error: Agent "${agentId}" not found`);
          process.exit(1);
        }

        // Show prompt header
        renderer.showPrompt(prompt);

        renderer.startQuery();

        // Load tools and config
        const tools = await getTools(true);
        const baseConfig = getConfig();

        // Merge agent config with base config
        const clientConfig = createAgentClientConfig(
          baseConfig,
          agent.config,
          tools
        );

        // Apply CLI overrides
        if (options.model) clientConfig.model = options.model;
        if (options.verbose) clientConfig.verbose = true;
        if (options.debug) clientConfig.debug = true;
        if (options.thinking) {
          clientConfig.enableThinking = true;
          if (!clientConfig.maxThinkingTokens) {
            clientConfig.maxThinkingTokens = 10000;
          }
        }
        if (options.ultrathink) {
          clientConfig.ultrathinkMode = true;
          clientConfig.enableThinking = true;
          if (!clientConfig.maxThinkingTokens) {
            clientConfig.maxThinkingTokens = 20000;
          }
        }

        // Create client with agent config
        const client = new CeregrepClient(clientConfig);

        // Collect messages for stats
        const allMessages: Message[] = [];

        // Stream messages with stateless SDK
        for await (const message of client.queryStream([], prompt, clientConfig)) {
          renderer.handleMessage(message);
          allMessages.push(message);
        }

        // Get token stats from collected messages
        const stats = getTokenStats(allMessages);

        // Finish rendering
        renderer.finish();

        // Show final synthesized response
        renderer.showFinalResponse();

        // Show token usage
        if (stats.total > 0) {
          renderer.showTokenStats(stats);
        }

        // Clean up
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

  // ceregrep agent list - List all agents
  agentCommand
    .command('list')
    .description('List all available agents')
    .option('--scope <scope>', 'Filter by scope: global, project, or all', 'all')
    .option('--json', 'Output as JSON')
    .action(async (options: any) => {
      try {
        const agents = await listAgents();

        if (options.json) {
          console.log(JSON.stringify({ global: agents.global, project: agents.project }, null, 2));
          process.exit(0);
        }

        const showGlobal = options.scope === 'all' || options.scope === 'global';
        const showProject = options.scope === 'all' || options.scope === 'project';

        // Color palette for agents
        const colors = [
          chalk.cyan,
          chalk.magenta,
          chalk.yellow,
          chalk.blue,
          chalk.green,
          chalk.red,
        ];

        if (showGlobal && agents.global.length > 0) {
          console.log(chalk.bold.white('Global Agents:'));
          console.log();
          agents.global.forEach((agent, index) => {
            const color = colors[index % colors.length];
            console.log(color.bold(`  ◆ ${agent.name}`));
            console.log(chalk.dim(`    ${agent.id}`));
            console.log(chalk.white(`    ${agent.description}`));
            console.log();
          });
        }

        if (showProject && agents.project.length > 0) {
          console.log(chalk.bold.white('Project Agents:'));
          console.log();
          agents.project.forEach((agent, index) => {
            const color = colors[index % colors.length];
            console.log(color.bold(`  ◆ ${agent.name}`));
            console.log(chalk.dim(`    ${agent.id}`));
            console.log(chalk.white(`    ${agent.description}`));
            console.log();
          });
        }

        if (agents.global.length === 0 && agents.project.length === 0) {
          console.log(chalk.yellow('No agents found. Run "scout agent init" to install default templates.'));
        }

        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep agent show <agent-id> - Show agent configuration
  agentCommand
    .command('show')
    .description('Show agent configuration')
    .argument('<agent-id>', 'Agent ID to show')
    .option('--json', 'Output as JSON')
    .action(async (agentId: string, options: any) => {
      try {
        const agent = await getAgent(agentId);
        if (!agent) {
          console.error(`Error: Agent "${agentId}" not found`);
          process.exit(1);
        }

        if (options.json) {
          console.log(JSON.stringify(agent.config, null, 2));
          process.exit(0);
        }

        console.log('╔════════════════════════════════════════╗');
        console.log(`║  Agent: ${agent.config.name.padEnd(29)}║`);
        console.log('╚════════════════════════════════════════╝\n');

        console.log(`ID: ${agent.config.id}`);
        console.log(`Scope: ${agent.scope}`);
        console.log(`Description: ${agent.config.description}`);
        console.log();

        console.log('System Prompt:');
        console.log(agent.config.systemPrompt);
        console.log();

        console.log(`System Prompt Mode: ${agent.config.systemPromptMode}`);
        console.log();

        const enabledTools = Object.entries(agent.config.tools)
          .filter(([_, enabled]) => enabled)
          .map(([name, _]) => name);

        console.log('Enabled Tools:');
        if (enabledTools.length === 0) {
          console.log('  (none)');
        } else {
          for (const tool of enabledTools) {
            console.log(`  • ${tool}`);
          }
        }
        console.log();

        const enabledServers = Object.entries(agent.config.mcpServers)
          .filter(([_, config]) => config.enabled);

        console.log('MCP Servers:');
        if (enabledServers.length === 0) {
          console.log('  (none)');
        } else {
          for (const [name, config] of enabledServers) {
            console.log(`  • ${name}`);
            if (config.disabledTools.length > 0) {
              console.log(`    Disabled Tools: ${config.disabledTools.join(', ')}`);
            }
          }
        }

        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep agent delete <agent-id> - Delete agent
  agentCommand
    .command('delete')
    .description('Delete an agent')
    .argument('<agent-id>', 'Agent ID to delete')
    .option('--yes', 'Skip confirmation')
    .action(async (agentId: string, options: any) => {
      try {
        const agent = await getAgent(agentId);
        if (!agent) {
          console.error(`Error: Agent "${agentId}" not found`);
          process.exit(1);
        }

        if (!options.yes) {
          console.log(`Are you sure you want to delete agent "${agentId}"? (y/N)`);
          // For now, require --yes flag
          console.error('Error: Use --yes to confirm deletion');
          process.exit(1);
        }

        await deleteAgent(agentId);
        console.log(`✓ Deleted agent "${agentId}"`);
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep agent export <agent-id> - Export agent to JSON
  agentCommand
    .command('export')
    .description('Export agent configuration to JSON file')
    .argument('<agent-id>', 'Agent ID to export')
    .option('-o, --output <file>', 'Output file path', '<agent-id>.json')
    .action(async (agentId: string, options: any) => {
      try {
        const outputPath = options.output === '<agent-id>.json' ? `${agentId}.json` : options.output;
        await exportAgent(agentId, outputPath);
        console.log(`✓ Exported agent to ${outputPath}`);
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep agent import <file> - Import agent from JSON
  agentCommand
    .command('import')
    .description('Import agent configuration from JSON file')
    .argument('<file>', 'JSON file to import')
    .option('--scope <scope>', 'Import scope: global or project', 'global')
    .option('--force', 'Overwrite existing agent')
    .action(async (file: string, options: any) => {
      try {
        const scope = options.scope === 'project' ? 'project' : 'global';
        const agent = await importAgent(file, scope, undefined, options.force);
        console.log(`✓ Imported agent "${agent.id}" (${scope})`);
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep agent init - Initialize default templates
  agentCommand
    .command('init')
    .description('Initialize default agent templates')
    .option('--force', 'Overwrite existing templates')
    .action(async (options: any) => {
      try {
        console.log('Installing default agent templates...\n');
        const result = await initializeDefaultAgents(options.force);

        if (result.installed.length > 0) {
          console.log('✓ Installed agents:');
          for (const id of result.installed) {
            console.log(`  • ${id}`);
          }
        }

        if (result.skipped.length > 0) {
          console.log('\n⊘ Skipped (already exist):');
          for (const id of result.skipped) {
            console.log(`  • ${id}`);
          }
          console.log('\nUse --force to overwrite existing agents.');
        }

        if (result.errors.length > 0) {
          console.log('\n✗ Errors:');
          for (const error of result.errors) {
            console.log(`  • ${error.template}: ${error.error}`);
          }
        }

        console.log(`\n✓ Total agents installed: ${result.installed.length}`);
        process.exit(result.errors.length > 0 ? 1 : 0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return agentCommand;
}
