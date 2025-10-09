#!/usr/bin/env node
/**
 * CLI for Ceregrep Agent Framework
 * Headless command-line interface - no UI, pure stdout/stderr
 */

import { Command } from 'commander';
import { CeregrepClient } from '../sdk/typescript/index.js';
import { getTools } from '../tools/index.js';
import { getConfig } from '../config/loader.js';

const program = new Command();

program
  .name('ceregrep')
  .description('Headless agent framework with Bash, Ripgrep, and MCP support')
  .version('0.1.0');

program
  .command('query')
  .description('Query the agent with a prompt')
  .argument('<prompt>', 'Prompt to send to the agent')
  .option('-m, --model <model>', 'Model to use (default: claude-sonnet-4-20250514)')
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug output')
  .action(async (prompt: string, options: any) => {
    try {
      const client = new CeregrepClient({
        model: options.model,
        verbose: options.verbose,
        debug: options.debug,
      });

      console.log('Querying agent...\n');

      const result = await client.query(prompt);

      console.log('\n=== Agent Response ===\n');

      // Extract and display text responses
      const textMessages = result.messages.filter((m) => m.type === 'assistant');
      for (const msg of textMessages) {
        const textContent = (msg as any).message.content
          .filter((c: any) => c.type === 'text')
          .map((c: any) => c.text)
          .join('\n');
        if (textContent) {
          console.log(textContent);
        }
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
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
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Show current configuration')
  .action(() => {
    try {
      const config = getConfig();
      console.log('Current configuration:\n');
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
