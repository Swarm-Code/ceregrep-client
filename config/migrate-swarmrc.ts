/**
 * Migration Utility for .swarmrc File to .swarmrc/ Folder Structure
 * Converts old single-file config to new folder-based structure
 */

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { Config, ConfigSchema } from './schema.js';
import {
  ensureSwarmRcStructure,
  saveMainConfig,
  saveProviderConfig,
  saveMCPServers,
  addModelToProvider,
  ProviderType,
  ProviderModel,
} from './swarmrc-loader.js';

interface MigrationResult {
  migrated: boolean;
  message: string;
}

/**
 * Migrate old .swarmrc file to new .swarmrc/ folder structure
 */
export async function migrateSwarmRc(cwd: string = process.cwd()): Promise<MigrationResult> {
  const oldConfigPath = join(cwd, '.swarmrc');
  const newConfigDir = join(cwd, '.swarmrc');

  // Check if new structure already exists
  if (existsSync(newConfigDir) && statSync(newConfigDir).isDirectory()) {
    return {
      migrated: false,
      message: 'Already using new .swarmrc/ folder structure. No migration needed.',
    };
  }

  // Check if old .swarmrc file exists
  if (!existsSync(oldConfigPath) || !statSync(oldConfigPath).isFile()) {
    // No old config, create default structure
    await ensureSwarmRcStructure(cwd);
    return {
      migrated: false,
      message: 'No old .swarmrc file found. Created default .swarmrc/ structure.',
    };
  }

  try {
    // Read and parse old config
    const oldContent = readFileSync(oldConfigPath, 'utf-8');
    const oldConfig: Partial<Config> = JSON.parse(oldContent);

    // Validate old config
    const validation = ConfigSchema.safeParse(oldConfig);
    if (!validation.success) {
      return {
        migrated: false,
        message: `Old .swarmrc file has invalid format: ${validation.error.message}`,
      };
    }

    // Backup old file
    const backupPath = join(cwd, '.swarmrc.backup');
    renameSync(oldConfigPath, backupPath);

    // Create new folder structure
    await ensureSwarmRcStructure(cwd);

    // Migrate provider config
    if (oldConfig.provider && oldConfig.model) {
      const providerType = oldConfig.provider.type as ProviderType;
      const model: ProviderModel = {
        name: oldConfig.model,
        apiKey: oldConfig.provider.apiKey,
        baseURL: oldConfig.provider.baseURL,
        temperature: oldConfig.provider.temperature,
        top_p: oldConfig.provider.top_p,
        isDefault: true,
      };

      // Add model to provider
      await addModelToProvider(providerType, model, cwd);

      // Set as active in main config
      const mainConfig: any = {
        activeProvider: providerType,
        activeModel: oldConfig.model,
      };

      if (oldConfig.verbose !== undefined) mainConfig.verbose = oldConfig.verbose;
      if (oldConfig.debug !== undefined) mainConfig.debug = oldConfig.debug;
      if (oldConfig.enableThinking !== undefined) mainConfig.enableThinking = oldConfig.enableThinking;
      if (oldConfig.ultrathinkMode !== undefined) mainConfig.ultrathinkMode = oldConfig.ultrathinkMode;
      if (oldConfig.maxThinkingTokens !== undefined) mainConfig.maxThinkingTokens = oldConfig.maxThinkingTokens;
      if (oldConfig.autoCompact !== undefined) mainConfig.autoCompact = oldConfig.autoCompact;
      if (oldConfig.compactionThreshold !== undefined) mainConfig.compactionThreshold = oldConfig.compactionThreshold;
      if (oldConfig.compactionKeepRecentCount !== undefined) mainConfig.compactionKeepRecentCount = oldConfig.compactionKeepRecentCount;

      await saveMainConfig(mainConfig, cwd);
    } else {
      // No provider config, just migrate settings
      const mainConfig: any = {};

      if (oldConfig.verbose !== undefined) mainConfig.verbose = oldConfig.verbose;
      if (oldConfig.debug !== undefined) mainConfig.debug = oldConfig.debug;
      if (oldConfig.enableThinking !== undefined) mainConfig.enableThinking = oldConfig.enableThinking;
      if (oldConfig.ultrathinkMode !== undefined) mainConfig.ultrathinkMode = oldConfig.ultrathinkMode;
      if (oldConfig.maxThinkingTokens !== undefined) mainConfig.maxThinkingTokens = oldConfig.maxThinkingTokens;
      if (oldConfig.autoCompact !== undefined) mainConfig.autoCompact = oldConfig.autoCompact;
      if (oldConfig.compactionThreshold !== undefined) mainConfig.compactionThreshold = oldConfig.compactionThreshold;
      if (oldConfig.compactionKeepRecentCount !== undefined) mainConfig.compactionKeepRecentCount = oldConfig.compactionKeepRecentCount;

      await saveMainConfig(mainConfig, cwd);
    }

    // Migrate MCP servers
    if (oldConfig.mcpServers) {
      await saveMCPServers(oldConfig.mcpServers, cwd);
    }

    return {
      migrated: true,
      message: `Successfully migrated .swarmrc to .swarmrc/ folder structure. Old file backed up to .swarmrc.backup`,
    };
  } catch (error) {
    return {
      migrated: false,
      message: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
