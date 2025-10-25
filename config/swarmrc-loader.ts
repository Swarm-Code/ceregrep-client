/**
 * SwarmRC Folder-Based Configuration Loader
 *
 * Handles the new .swarmrc/ folder structure:
 * .swarmrc/
 * ├── config.json          # Main config (activeAgent, activeProvider, activeModel, verbose, debug)
 * ├── providers/
 * │   ├── cerebras.json    # { models: [{name, apiKey, baseURL, temperature, top_p, isDefault}] }
 * │   ├── openai.json
 * │   ├── anthropic.json
 * │   └── ...
 * ├── agents/              # Existing agent structure - not modified here
 * └── mcp-servers.json     # MCP server configurations
 *
 * Features:
 * - Backward compatibility with old .swarmrc file
 * - TypeScript types with Zod validation
 * - Handles both global (~/.swarmrc/) and project (.swarmrc/) locations
 * - Async operations using fs/promises
 */

import { z } from 'zod';
import { existsSync, statSync } from 'fs';
import { mkdir, readFile, writeFile, readdir, rename, stat } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { MCPServerConfigSchema, type MCPServerConfig } from './schema.js';

// ============================================================================
// Provider Types
// ============================================================================

export const ProviderTypeSchema = z.enum([
  'anthropic',
  'cerebras',
  'openai',
  'openrouter',
  'r1',
  'google',
]);

export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// ============================================================================
// Model Configuration
// ============================================================================

export const ProviderModelSchema = z.object({
  name: z.string().describe('Model name/identifier'),
  apiKey: z.string().optional().describe('API key for this model (optional if using env var)'),
  baseURL: z.string().url().optional().describe('Base URL for API endpoint'),
  temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
  top_p: z.number().min(0).max(1).optional().describe('Nucleus sampling parameter'),
  isDefault: z.boolean().optional().default(false).describe('Whether this is the default model for this provider'),
  maxTokens: z.number().optional().describe('Maximum tokens for completion'),
  contextWindow: z.number().optional().describe('Model context window size'),
});

export type ProviderModel = z.infer<typeof ProviderModelSchema>;

// ============================================================================
// Provider Configuration
// ============================================================================

export const ProviderConfigSchema = z.object({
  models: z.record(z.string(), ProviderModelSchema).default({}).describe('Models for this provider, keyed by model name'),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// ============================================================================
// Main SwarmRC Configuration
// ============================================================================

export const SwarmRcMainConfigSchema = z.object({
  activeAgent: z.string().optional().describe('Currently active agent name'),
  activeProvider: ProviderTypeSchema.optional().describe('Currently active provider'),
  activeModel: z.string().optional().describe('Currently active model name'),
  verbose: z.boolean().optional().default(false).describe('Enable verbose logging'),
  debug: z.boolean().optional().default(false).describe('Enable debug mode'),

  // Thinking mode settings (extended thinking)
  enableThinking: z.boolean().optional().default(false),
  ultrathinkMode: z.boolean().optional().default(false),
  maxThinkingTokens: z.number().optional().default(0),

  // Auto-compaction settings
  autoCompact: z.object({
    enabled: z.boolean().optional().default(true),
    thresholdRatio: z.number().min(0.5).max(0.99).optional().default(0.92),
    contextLength: z.number().optional().default(200000),
    keepRecentCount: z.number().optional().default(10),
  }).optional().default({
    enabled: true,
    thresholdRatio: 0.92,
    contextLength: 200000,
    keepRecentCount: 10,
  }),

  // Legacy compaction settings (deprecated)
  compactionThreshold: z.number().optional().default(100000),
  compactionKeepRecentCount: z.number().optional().default(10),
});

export type SwarmRcMainConfig = z.infer<typeof SwarmRcMainConfigSchema>;

// ============================================================================
// Complete Merged Configuration
// ============================================================================

export interface SwarmRcConfig extends SwarmRcMainConfig {
  providers: Map<ProviderType, ProviderConfig>;
  mcpServers: Record<string, MCPServerConfig>;
  _location: 'global' | 'project';
  _path: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get path to .swarmrc/ directory
 */
export function getSwarmRcDir(cwd?: string): string {
  const baseDir = cwd ?? process.cwd();
  return join(baseDir, '.swarmrc');
}

/**
 * Get path to global .swarmrc/ directory
 */
export function getGlobalSwarmRcDir(): string {
  return join(homedir(), '.swarmrc');
}

/**
 * Check if old .swarmrc file exists (backward compatibility)
 */
export function hasOldSwarmRcFile(cwd?: string): boolean {
  const baseDir = cwd ?? process.cwd();
  return existsSync(join(baseDir, '.swarmrc'));
}

/**
 * Check if global old .swarmrc file exists
 */
export function hasGlobalOldSwarmRcFile(): boolean {
  return existsSync(join(homedir(), '.swarmrc'));
}

/**
 * Ensure .swarmrc/ folder structure exists
 */
export async function ensureSwarmRcStructure(cwd?: string): Promise<void> {
  const swarmRcDir = getSwarmRcDir(cwd);
  const providersDir = join(swarmRcDir, 'providers');
  const agentsDir = join(swarmRcDir, 'agents');

  // Create directories if they don't exist
  await mkdir(swarmRcDir, { recursive: true });
  await mkdir(providersDir, { recursive: true });
  await mkdir(agentsDir, { recursive: true });

  // Create default config.json if it doesn't exist
  const configPath = join(swarmRcDir, 'config.json');
  if (!existsSync(configPath)) {
    const defaultConfig: SwarmRcMainConfig = {
      verbose: false,
      debug: false,
      enableThinking: false,
      ultrathinkMode: false,
      maxThinkingTokens: 0,
      autoCompact: {
        enabled: true,
        thresholdRatio: 0.92,
        contextLength: 200000,
        keepRecentCount: 10,
      },
      compactionThreshold: 100000,
      compactionKeepRecentCount: 10,
    };
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  // Create default mcp-servers.json if it doesn't exist
  const mcpPath = join(swarmRcDir, 'mcp-servers.json');
  if (!existsSync(mcpPath)) {
    await writeFile(mcpPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

/**
 * Ensure global .swarmrc/ folder structure exists
 */
export async function ensureGlobalSwarmRcStructure(): Promise<void> {
  const swarmRcDir = getGlobalSwarmRcDir();
  const swarmRcFile = join(homedir(), '.swarmrc');

  // If .swarmrc exists as a file (old format), rename it first
  if (existsSync(swarmRcFile)) {
    try {
      const stats = statSync(swarmRcFile);
      if (stats.isFile()) {
        const backupPath = join(homedir(), '.swarmrc.backup');
        await rename(swarmRcFile, backupPath);
        console.warn(`\n⚠️  Renamed old ~/.swarmrc file to ~/.swarmrc.backup`);
        console.warn(`   OAuth models will be stored in ~/.swarmrc/ folder\n`);
      }
    } catch (error) {
      // Ignore stat errors - file might not be accessible
    }
  }

  const providersDir = join(swarmRcDir, 'providers');
  const agentsDir = join(swarmRcDir, 'agents');

  await mkdir(swarmRcDir, { recursive: true });
  await mkdir(providersDir, { recursive: true });
  await mkdir(agentsDir, { recursive: true });

  const configPath = join(swarmRcDir, 'config.json');
  if (!existsSync(configPath)) {
    const defaultConfig: SwarmRcMainConfig = {
      verbose: false,
      debug: false,
      enableThinking: false,
      ultrathinkMode: false,
      maxThinkingTokens: 0,
      autoCompact: {
        enabled: true,
        thresholdRatio: 0.92,
        contextLength: 200000,
        keepRecentCount: 10,
      },
      compactionThreshold: 100000,
      compactionKeepRecentCount: 10,
    };
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
  }

  const mcpPath = join(swarmRcDir, 'mcp-servers.json');
  if (!existsSync(mcpPath)) {
    await writeFile(mcpPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

// ============================================================================
// Main Config Operations
// ============================================================================

/**
 * Load main config.json
 */
export async function loadMainConfig(cwd?: string): Promise<SwarmRcMainConfig> {
  const swarmRcDir = getSwarmRcDir(cwd);
  const configPath = join(swarmRcDir, 'config.json');

  if (!existsSync(configPath)) {
    // Check for old .swarmrc file
    if (hasOldSwarmRcFile(cwd)) {
      console.warn('\n⚠️  Old .swarmrc file detected. Please migrate to .swarmrc/ folder structure.');
      console.warn('   Run: swarm migrate-config\n');
    }

    // Return default config
    return SwarmRcMainConfigSchema.parse({});
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return SwarmRcMainConfigSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to load main config from ${configPath}: ${error}`);
  }
}

/**
 * Load global main config
 */
export async function loadGlobalMainConfig(): Promise<SwarmRcMainConfig> {
  const swarmRcDir = getGlobalSwarmRcDir();
  const configPath = join(swarmRcDir, 'config.json');

  if (!existsSync(configPath)) {
    if (hasGlobalOldSwarmRcFile()) {
      console.warn('\n⚠️  Old ~/.swarmrc file detected. Please migrate to ~/.swarmrc/ folder structure.');
      console.warn('   Run: swarm migrate-config --global\n');
    }
    return SwarmRcMainConfigSchema.parse({});
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return SwarmRcMainConfigSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to load global main config from ${configPath}: ${error}`);
  }
}

/**
 * Save main config.json
 */
export async function saveMainConfig(config: SwarmRcMainConfig, cwd?: string): Promise<void> {
  const swarmRcDir = getSwarmRcDir(cwd);
  await ensureSwarmRcStructure(cwd);

  const configPath = join(swarmRcDir, 'config.json');

  try {
    // Validate before saving
    const validated = SwarmRcMainConfigSchema.parse(config);
    await writeFile(configPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save main config to ${configPath}: ${error}`);
  }
}

/**
 * Save global main config
 */
export async function saveGlobalMainConfig(config: SwarmRcMainConfig): Promise<void> {
  const swarmRcDir = getGlobalSwarmRcDir();
  await ensureGlobalSwarmRcStructure();

  const configPath = join(swarmRcDir, 'config.json');

  try {
    const validated = SwarmRcMainConfigSchema.parse(config);
    await writeFile(configPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save global main config to ${configPath}: ${error}`);
  }
}

// ============================================================================
// Provider Config Operations
// ============================================================================

/**
 * Load provider config from providers/{type}.json
 */
export async function loadProviderConfig(
  providerType: ProviderType,
  cwd?: string
): Promise<ProviderConfig> {
  const swarmRcDir = getSwarmRcDir(cwd);
  const providerPath = join(swarmRcDir, 'providers', `${providerType}.json`);

  if (!existsSync(providerPath)) {
    return { models: {} };
  }

  try {
    const content = await readFile(providerPath, 'utf-8');
    const parsed = JSON.parse(content);
    return ProviderConfigSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to load provider config from ${providerPath}: ${error}`);
  }
}

/**
 * Load global provider config
 */
export async function loadGlobalProviderConfig(
  providerType: ProviderType
): Promise<ProviderConfig> {
  const swarmRcDir = getGlobalSwarmRcDir();
  const providerPath = join(swarmRcDir, 'providers', `${providerType}.json`);

  if (!existsSync(providerPath)) {
    return { models: {} };
  }

  try {
    const content = await readFile(providerPath, 'utf-8');
    const parsed = JSON.parse(content);
    return ProviderConfigSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to load global provider config from ${providerPath}: ${error}`);
  }
}

/**
 * Save provider config to providers/{type}.json
 */
export async function saveProviderConfig(
  providerType: ProviderType,
  config: ProviderConfig,
  cwd?: string
): Promise<void> {
  const swarmRcDir = getSwarmRcDir(cwd);
  await ensureSwarmRcStructure(cwd);

  const providerPath = join(swarmRcDir, 'providers', `${providerType}.json`);

  try {
    const validated = ProviderConfigSchema.parse(config);
    await writeFile(providerPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save provider config to ${providerPath}: ${error}`);
  }
}

/**
 * Save global provider config
 */
export async function saveGlobalProviderConfig(
  providerType: ProviderType,
  config: ProviderConfig
): Promise<void> {
  const swarmRcDir = getGlobalSwarmRcDir();
  await ensureGlobalSwarmRcStructure();

  const providerPath = join(swarmRcDir, 'providers', `${providerType}.json`);

  try {
    const validated = ProviderConfigSchema.parse(config);
    await writeFile(providerPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save global provider config to ${providerPath}: ${error}`);
  }
}

/**
 * Add model to provider
 */
export async function addModelToProvider(
  providerType: ProviderType,
  model: ProviderModel,
  cwd?: string
): Promise<void> {
  const config = await loadProviderConfig(providerType, cwd);

  // Add or update model in the Record
  config.models[model.name] = model;

  await saveProviderConfig(providerType, config, cwd);
}

/**
 * Add model to global provider
 */
export async function addModelToGlobalProvider(
  providerType: ProviderType,
  model: ProviderModel
): Promise<void> {
  const config = await loadGlobalProviderConfig(providerType);

  // Add or update model in the Record
  config.models[model.name] = model;

  await saveGlobalProviderConfig(providerType, config);
}

/**
 * Remove model from provider
 */
export async function removeModelFromProvider(
  providerType: ProviderType,
  modelName: string,
  cwd?: string
): Promise<void> {
  const config = await loadProviderConfig(providerType, cwd);

  // Delete model from the Record
  delete config.models[modelName];

  await saveProviderConfig(providerType, config, cwd);
}

/**
 * Remove model from global provider
 */
export async function removeModelFromGlobalProvider(
  providerType: ProviderType,
  modelName: string
): Promise<void> {
  const config = await loadGlobalProviderConfig(providerType);

  // Delete model from the Record
  delete config.models[modelName];

  await saveGlobalProviderConfig(providerType, config);
}

/**
 * Get active model configuration
 */
export async function getActiveModel(cwd?: string): Promise<{
  provider: ProviderType;
  model: ProviderModel;
} | null> {
  const mainConfig = await loadMainConfig(cwd);

  if (!mainConfig.activeProvider || !mainConfig.activeModel) {
    return null;
  }

  const providerConfig = await loadProviderConfig(mainConfig.activeProvider, cwd);
  const model = providerConfig.models[mainConfig.activeModel];

  if (!model) {
    return null;
  }

  return {
    provider: mainConfig.activeProvider,
    model,
  };
}

/**
 * Get global active model
 */
export async function getGlobalActiveModel(): Promise<{
  provider: ProviderType;
  model: ProviderModel;
} | null> {
  const mainConfig = await loadGlobalMainConfig();

  if (!mainConfig.activeProvider || !mainConfig.activeModel) {
    return null;
  }

  const providerConfig = await loadGlobalProviderConfig(mainConfig.activeProvider);
  const model = providerConfig.models[mainConfig.activeModel];

  if (!model) {
    return null;
  }

  return {
    provider: mainConfig.activeProvider,
    model,
  };
}

/**
 * Set active model
 */
export async function setActiveModel(
  provider: ProviderType,
  modelName: string,
  cwd?: string
): Promise<void> {
  // Verify model exists in either project config or global config
  const providerConfig = await loadProviderConfig(provider, cwd);
  let model = providerConfig.models[modelName];

  // If not found in project config, check global config (for OAuth models)
  if (!model) {
    const globalProviderConfig = await loadGlobalProviderConfig(provider);
    model = globalProviderConfig.models[modelName];
  }

  if (!model) {
    throw new Error(`Model '${modelName}' not found in provider '${provider}' (checked both project and global configs)`);
  }

  // Update main config
  const mainConfig = await loadMainConfig(cwd);
  mainConfig.activeProvider = provider;
  mainConfig.activeModel = modelName;

  await saveMainConfig(mainConfig, cwd);
}

/**
 * Set global active model
 */
export async function setGlobalActiveModel(
  provider: ProviderType,
  modelName: string
): Promise<void> {
  const providerConfig = await loadGlobalProviderConfig(provider);
  const model = providerConfig.models[modelName];

  if (!model) {
    throw new Error(`Model '${modelName}' not found in global provider '${provider}'`);
  }

  const mainConfig = await loadGlobalMainConfig();
  mainConfig.activeProvider = provider;
  mainConfig.activeModel = modelName;

  await saveGlobalMainConfig(mainConfig);
}

/**
 * List all providers with their models
 */
export async function listProvidersWithModels(cwd?: string): Promise<
  Array<{
    provider: ProviderType;
    models: ProviderModel[];
  }>
> {
  const swarmRcDir = getSwarmRcDir(cwd);
  const providersDir = join(swarmRcDir, 'providers');

  if (!existsSync(providersDir)) {
    return [];
  }

  const result: Array<{ provider: ProviderType; models: ProviderModel[] }> = [];

  try {
    const files = await readdir(providersDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const providerName = file.replace('.json', '');

      // Validate provider type
      const parseResult = ProviderTypeSchema.safeParse(providerName);
      if (!parseResult.success) continue;

      const providerType = parseResult.data;
      const config = await loadProviderConfig(providerType, cwd);

      result.push({
        provider: providerType,
        models: Object.values(config.models),
      });
    }
  } catch (error) {
    throw new Error(`Failed to list providers: ${error}`);
  }

  return result;
}

/**
 * List all global providers with their models
 */
export async function listGlobalProvidersWithModels(): Promise<
  Array<{
    provider: ProviderType;
    models: ProviderModel[];
  }>
> {
  const swarmRcDir = getGlobalSwarmRcDir();
  const providersDir = join(swarmRcDir, 'providers');

  if (!existsSync(providersDir)) {
    return [];
  }

  const result: Array<{ provider: ProviderType; models: ProviderModel[] }> = [];

  try {
    const files = await readdir(providersDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const providerName = file.replace('.json', '');
      const parseResult = ProviderTypeSchema.safeParse(providerName);
      if (!parseResult.success) continue;

      const providerType = parseResult.data;
      const config = await loadGlobalProviderConfig(providerType);

      result.push({
        provider: providerType,
        models: Object.values(config.models),
      });
    }
  } catch (error) {
    throw new Error(`Failed to list global providers: ${error}`);
  }

  return result;
}

// ============================================================================
// MCP Server Operations
// ============================================================================

/**
 * Load MCP servers from mcp-servers.json
 */
export async function loadMCPServers(cwd?: string): Promise<Record<string, MCPServerConfig>> {
  const swarmRcDir = getSwarmRcDir(cwd);
  const mcpPath = join(swarmRcDir, 'mcp-servers.json');

  if (!existsSync(mcpPath)) {
    return {};
  }

  try {
    const content = await readFile(mcpPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Validate each server config
    const validated: Record<string, MCPServerConfig> = {};
    for (const [name, config] of Object.entries(parsed)) {
      validated[name] = MCPServerConfigSchema.parse(config);
    }

    return validated;
  } catch (error) {
    throw new Error(`Failed to load MCP servers from ${mcpPath}: ${error}`);
  }
}

/**
 * Load global MCP servers
 */
export async function loadGlobalMCPServers(): Promise<Record<string, MCPServerConfig>> {
  const swarmRcDir = getGlobalSwarmRcDir();
  const mcpPath = join(swarmRcDir, 'mcp-servers.json');

  if (!existsSync(mcpPath)) {
    return {};
  }

  try {
    const content = await readFile(mcpPath, 'utf-8');
    const parsed = JSON.parse(content);

    const validated: Record<string, MCPServerConfig> = {};
    for (const [name, config] of Object.entries(parsed)) {
      validated[name] = MCPServerConfigSchema.parse(config);
    }

    return validated;
  } catch (error) {
    throw new Error(`Failed to load global MCP servers from ${mcpPath}: ${error}`);
  }
}

/**
 * Save MCP servers to mcp-servers.json
 */
export async function saveMCPServers(
  servers: Record<string, MCPServerConfig>,
  cwd?: string
): Promise<void> {
  const swarmRcDir = getSwarmRcDir(cwd);
  await ensureSwarmRcStructure(cwd);

  const mcpPath = join(swarmRcDir, 'mcp-servers.json');

  try {
    // Validate all server configs
    const validated: Record<string, MCPServerConfig> = {};
    for (const [name, config] of Object.entries(servers)) {
      validated[name] = MCPServerConfigSchema.parse(config);
    }

    await writeFile(mcpPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save MCP servers to ${mcpPath}: ${error}`);
  }
}

/**
 * Save global MCP servers
 */
export async function saveGlobalMCPServers(
  servers: Record<string, MCPServerConfig>
): Promise<void> {
  const swarmRcDir = getGlobalSwarmRcDir();
  await ensureGlobalSwarmRcStructure();

  const mcpPath = join(swarmRcDir, 'mcp-servers.json');

  try {
    const validated: Record<string, MCPServerConfig> = {};
    for (const [name, config] of Object.entries(servers)) {
      validated[name] = MCPServerConfigSchema.parse(config);
    }

    await writeFile(mcpPath, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save global MCP servers to ${mcpPath}: ${error}`);
  }
}

// ============================================================================
// Complete Config Loading (with merging)
// ============================================================================

/**
 * Load complete SwarmRC config (merges global and project)
 * Project config overrides global config
 */
export async function loadCompleteConfig(cwd?: string): Promise<SwarmRcConfig> {
  // Load global config first
  const globalMainConfig = await loadGlobalMainConfig();
  const globalProviders = await listGlobalProvidersWithModels();
  const globalMCPServers = await loadGlobalMCPServers();

  // Load project config
  const projectMainConfig = await loadMainConfig(cwd);
  const projectProviders = await listProvidersWithModels(cwd);
  const projectMCPServers = await loadMCPServers(cwd);

  // Merge main configs (project overrides global)
  const mergedMainConfig = {
    ...globalMainConfig,
    ...projectMainConfig,
  };

  // Merge providers (project models override global models by name)
  const providersMap = new Map<ProviderType, ProviderConfig>();

  // Add global providers first
  for (const { provider, models } of globalProviders) {
    // Convert array to Record
    const modelsRecord: Record<string, ProviderModel> = {};
    for (const model of models) {
      modelsRecord[model.name] = model;
    }
    providersMap.set(provider, { models: modelsRecord });
  }

  // Merge project providers (override models with same name)
  for (const { provider, models } of projectProviders) {
    const existing = providersMap.get(provider);
    if (existing) {
      // Merge models, project models override global by name
      const mergedModels = { ...existing.models };
      for (const projectModel of models) {
        mergedModels[projectModel.name] = projectModel;
      }
      providersMap.set(provider, { models: mergedModels });
    } else {
      // Convert array to Record
      const modelsRecord: Record<string, ProviderModel> = {};
      for (const model of models) {
        modelsRecord[model.name] = model;
      }
      providersMap.set(provider, { models: modelsRecord });
    }
  }

  // Merge MCP servers (project overrides global)
  const mergedMCPServers = {
    ...globalMCPServers,
    ...projectMCPServers,
  };

  return {
    ...mergedMainConfig,
    providers: providersMap,
    mcpServers: mergedMCPServers,
    _location: cwd ? 'project' : 'global',
    _path: cwd ? getSwarmRcDir(cwd) : getGlobalSwarmRcDir(),
  };
}

/**
 * Get merged config (alias for backward compatibility)
 */
export async function getSwarmRcConfig(cwd?: string): Promise<SwarmRcConfig> {
  return loadCompleteConfig(cwd);
}
