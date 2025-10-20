/**
 * Agent Storage Manager
 * Handles CRUD operations for agent configurations with dual storage (global + project)
 */

import { readdir, readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import {
  AgentConfig,
  validateAgentConfig,
  formatValidationErrors,
  createAgentConfig,
  updateAgentConfig,
} from './schema.js';

/**
 * Storage scope for agents
 */
export type AgentScope = 'global' | 'project';

/**
 * Agent with scope information
 */
export interface AgentWithScope {
  config: AgentConfig;
  scope: AgentScope;
  path: string;
}

/**
 * Get global agents directory path
 */
export function getGlobalAgentsDir(): string {
  return join(homedir(), '.ceregrep', 'agents');
}

/**
 * Get project agents directory path
 */
export function getProjectAgentsDir(cwd: string = process.cwd()): string {
  return join(cwd, '.ceregrep', 'agents');
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
  }
}

/**
 * Check if agent exists in given directory
 */
async function agentExistsInDir(id: string, dirPath: string): Promise<boolean> {
  try {
    const filePath = join(dirPath, `${id}.json`);
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read agent config from file
 */
async function readAgentConfig(filePath: string): Promise<AgentConfig> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);

  const validation = validateAgentConfig(parsed);
  if (!validation.success) {
    throw new Error(`Invalid agent config in ${filePath}: ${formatValidationErrors(validation.errors || [])}`);
  }

  return validation.data!;
}

/**
 * Write agent config to file
 */
async function writeAgentConfig(filePath: string, config: AgentConfig): Promise<void> {
  const validation = validateAgentConfig(config);
  if (!validation.success) {
    throw new Error(`Invalid agent config: ${formatValidationErrors(validation.errors || [])}`);
  }

  await writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * List agents in a directory
 */
async function listAgentsInDir(dirPath: string): Promise<AgentConfig[]> {
  try {
    await stat(dirPath);
  } catch {
    return [];
  }

  try {
    const files = await readdir(dirPath);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));

    const configs = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = join(dirPath, file);
          return await readAgentConfig(filePath);
        } catch (error) {
          console.warn(`Failed to load agent from ${file}:`, error instanceof Error ? error.message : String(error));
          return null;
        }
      })
    );

    return configs.filter((config): config is AgentConfig => config !== null);
  } catch (error) {
    console.warn(`Failed to list agents in ${dirPath}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Create a new agent
 */
export async function createAgent(
  config: Omit<AgentConfig, 'createdAt' | 'updatedAt'>,
  scope: AgentScope,
  cwd?: string
): Promise<AgentConfig> {
  const dirPath = scope === 'global' ? getGlobalAgentsDir() : getProjectAgentsDir(cwd);
  await ensureDir(dirPath);

  // Check if agent already exists
  const existsInGlobal = await agentExistsInDir(config.id, getGlobalAgentsDir());
  const existsInProject = cwd ? await agentExistsInDir(config.id, getProjectAgentsDir(cwd)) : false;

  if (existsInGlobal || existsInProject) {
    throw new Error(`Agent with ID "${config.id}" already exists`);
  }

  const fullConfig = createAgentConfig(config);
  const filePath = join(dirPath, `${config.id}.json`);
  await writeAgentConfig(filePath, fullConfig);

  return fullConfig;
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  id: string,
  updates: Partial<Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>>,
  cwd?: string
): Promise<AgentConfig> {
  const existing = await getAgent(id, cwd);
  if (!existing) {
    throw new Error(`Agent with ID "${id}" not found`);
  }

  const updated = updateAgentConfig(existing.config, updates);
  await writeAgentConfig(existing.path, updated);

  return updated;
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string, cwd?: string): Promise<void> {
  const existing = await getAgent(id, cwd);
  if (!existing) {
    throw new Error(`Agent with ID "${id}" not found`);
  }

  await rm(existing.path);
}

/**
 * Get a specific agent (checks project first, then global)
 */
export async function getAgent(id: string, cwd?: string): Promise<AgentWithScope | null> {
  const projectDir = getProjectAgentsDir(cwd);
  const globalDir = getGlobalAgentsDir();

  // Check project directory first
  const projectPath = join(projectDir, `${id}.json`);
  try {
    const config = await readAgentConfig(projectPath);
    return {
      config,
      scope: 'project',
      path: projectPath,
    };
  } catch {
    // Not in project directory, check global
  }

  // Check global directory
  const globalPath = join(globalDir, `${id}.json`);
  try {
    const config = await readAgentConfig(globalPath);
    return {
      config,
      scope: 'global',
      path: globalPath,
    };
  } catch {
    return null;
  }
}

/**
 * List all agents (both global and project)
 */
export async function listAgents(cwd?: string): Promise<{
  global: AgentConfig[];
  project: AgentConfig[];
}> {
  const globalDir = getGlobalAgentsDir();
  const projectDir = getProjectAgentsDir(cwd);

  const [global, project] = await Promise.all([
    listAgentsInDir(globalDir),
    listAgentsInDir(projectDir),
  ]);

  return { global, project };
}

/**
 * Check if an agent ID is available (not used in global or project)
 */
export async function isAgentIdAvailable(id: string, cwd?: string): Promise<boolean> {
  const globalDir = getGlobalAgentsDir();
  const projectDir = getProjectAgentsDir(cwd);

  const existsInGlobal = await agentExistsInDir(id, globalDir);
  const existsInProject = await agentExistsInDir(id, projectDir);

  return !existsInGlobal && !existsInProject;
}

/**
 * Export agent to JSON file
 */
export async function exportAgent(id: string, outputPath: string, cwd?: string): Promise<void> {
  const agent = await getAgent(id, cwd);
  if (!agent) {
    throw new Error(`Agent with ID "${id}" not found`);
  }

  await writeFile(outputPath, JSON.stringify(agent.config, null, 2), 'utf-8');
}

/**
 * Import agent from JSON file
 */
export async function importAgent(
  filePath: string,
  scope: AgentScope,
  cwd?: string,
  overwrite: boolean = false
): Promise<AgentConfig> {
  const content = await readFile(filePath, 'utf-8');
  const parsed = JSON.parse(content);

  const validation = validateAgentConfig(parsed);
  if (!validation.success) {
    throw new Error(`Invalid agent config: ${formatValidationErrors(validation.errors || [])}`);
  }

  const config = validation.data!;

  // Check if agent already exists
  const existing = await getAgent(config.id, cwd);
  if (existing && !overwrite) {
    throw new Error(`Agent with ID "${config.id}" already exists. Use --force to overwrite.`);
  }

  if (existing && overwrite) {
    // Update existing agent
    return await updateAgent(config.id, config, cwd);
  } else {
    // Create new agent
    return await createAgent(config, scope, cwd);
  }
}
