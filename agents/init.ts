/**
 * Agent Initialization
 * Install default agent templates on first run or when requested
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AgentConfig } from './schema.js';
import { createAgent, getAgent, getGlobalAgentsDir } from './manager.js';
import { ensureDir } from '../utils/shell.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * List of default template filenames
 */
const DEFAULT_TEMPLATES = [
  'debug-agent.json',
  'postgres-agent.json',
  'context-agent.json',
  'review-agent.json',
  'test-agent.json',
  'docs-agent.json',
  'orchestrator-agent.json',
];

/**
 * Load a default template from the templates directory
 */
async function loadTemplate(filename: string): Promise<AgentConfig> {
  const templatePath = join(__dirname, 'templates', filename);
  const content = await readFile(templatePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Initialize default agent templates
 *
 * @param force - If true, overwrite existing agents
 * @returns Number of agents installed
 */
export async function initializeDefaultAgents(force: boolean = false): Promise<{
  installed: string[];
  skipped: string[];
  errors: Array<{ template: string; error: string }>;
}> {
  const installed: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ template: string; error: string }> = [];

  // Ensure global agents directory exists
  const globalDir = getGlobalAgentsDir();
  await ensureDir(globalDir);

  for (const templateFile of DEFAULT_TEMPLATES) {
    try {
      const template = await loadTemplate(templateFile);

      // Check if agent already exists
      const existing = await getAgent(template.id);

      if (existing && !force) {
        skipped.push(template.id);
        continue;
      }

      if (existing && force) {
        // Delete existing and recreate
        const fs = await import('fs/promises');
        await fs.rm(existing.path);
      }

      // Create agent in global scope
      await createAgent(
        {
          id: template.id,
          name: template.name,
          description: template.description,
          systemPrompt: template.systemPrompt,
          systemPromptMode: template.systemPromptMode,
          tools: template.tools,
          mcpServers: template.mcpServers,
        },
        'global'
      );

      installed.push(template.id);
    } catch (error) {
      errors.push({
        template: templateFile,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { installed, skipped, errors };
}

/**
 * Check if default agents are installed
 */
export async function hasDefaultAgents(): Promise<boolean> {
  try {
    const templates = await Promise.all(
      DEFAULT_TEMPLATES.map(async (file) => {
        const template = await loadTemplate(file);
        const existing = await getAgent(template.id);
        return existing !== null;
      })
    );

    // Return true if at least one default agent exists
    return templates.some((exists) => exists);
  } catch {
    return false;
  }
}

/**
 * Get list of default agent IDs
 */
export function getDefaultAgentIds(): string[] {
  return DEFAULT_TEMPLATES.map((file) => file.replace('.json', ''));
}
