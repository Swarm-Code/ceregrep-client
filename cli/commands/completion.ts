/**
 * Completion CLI Commands
 * Shell completion installation
 */

import { Command } from 'commander';
import { install, uninstall } from 'tabtab';

/**
 * Create completion command
 */
export function createCompletionCommand(): Command {
  const completionCommand = new Command('completion')
    .description('Manage shell completion');

  // ceregrep completion install - Install shell completion
  completionCommand
    .command('install')
    .description('Install shell completion for bash/zsh')
    .action(async () => {
      try {
        console.log('Installing ceregrep shell completion...\n');

        await install({
          name: 'ceregrep',
          completer: 'ceregrep',
        });

        console.log('✓ Shell completion installed successfully!');
        console.log('\nPlease restart your shell or run:');
        console.log('  source ~/.bashrc    # for bash');
        console.log('  source ~/.zshrc     # for zsh\n');
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  // ceregrep completion uninstall - Uninstall shell completion
  completionCommand
    .command('uninstall')
    .description('Uninstall shell completion')
    .action(async () => {
      try {
        console.log('Uninstalling ceregrep shell completion...\n');

        await uninstall({
          name: 'ceregrep',
        });

        console.log('✓ Shell completion uninstalled successfully!\n');
        process.exit(0);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  return completionCommand;
}
