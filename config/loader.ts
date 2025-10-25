/**
 * Configuration loader
 * Loads and merges config from global and project directories
 * Supports both old .swarmrc file and new .swarmrc/ folder structure
 */

import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config, ConfigSchema } from './schema.js';
import {
  SwarmRcMainConfigSchema,
  ProviderConfigSchema
} from './swarmrc-loader.js';
import { getOAuthManager } from '../auth/oauth-manager-instance.js';

const CONFIG_FILENAMES = ['.swarmrc', '.ceregrep.json'];
const DEPRECATED_FILENAMES = ['.ceregrep.json'];

/**
 * Load configuration from file or folder
 * Returns both the config and the filename that was loaded
 */
function loadConfigFile(path: string): { config: Partial<Config>; filename: string } | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    // Check if path is a directory (new .swarmrc/ folder structure)
    const stats = statSync(path);
    if (stats.isDirectory()) {
      // Use new swarmrc-loader for folder structure
      // This is handled separately in getConfig now
      return null;
    }

    // Old file-based config
    const content = readFileSync(path, 'utf-8');
    const config = JSON.parse(content);
    const filename = path.split('/').pop() || path;
    return { config, filename };
  } catch (error) {
    // Only warn if it's not EISDIR error (directory read attempt)
    if ((error as any).code !== 'EISDIR') {
      console.warn(`Failed to load config from ${path}:`, error);
    }
    return null;
  }
}

/**
 * Show deprecation warning for old config files
 */
function showDeprecationWarning(filename: string, isGlobal: boolean): void {
  const location = isGlobal ? 'home directory (~/)' : 'project directory';
  const newFilename = '.swarmrc';

  console.warn('\n⚠️  DEPRECATION WARNING: Using .ceregrep.json is deprecated.');
  console.warn(`   Found in ${location}`);
  console.warn(`   Please rename to ${newFilename} for the new configuration format.`);
  console.warn('   Support for .ceregrep.json will be removed in a future version.\n');
  console.warn(`   To migrate: mv ${filename} ${newFilename}\n`);
}

/**
 * Get global config from home directory
 */
export function getGlobalConfig(): Partial<Config> {
  const homeDir = homedir();

  for (const filename of CONFIG_FILENAMES) {
    const result = loadConfigFile(join(homeDir, filename));
    if (result) {
      // Show deprecation warning if using old config file
      if (DEPRECATED_FILENAMES.includes(result.filename)) {
        showDeprecationWarning(result.filename, true);
      }
      return result.config;
    }
  }

  return {};
}

/**
 * Get project config from current working directory
 */
export function getProjectConfig(cwd: string = process.cwd()): Partial<Config> {
  for (const filename of CONFIG_FILENAMES) {
    const result = loadConfigFile(join(cwd, filename));
    if (result) {
      // Show deprecation warning if using old config file
      if (DEPRECATED_FILENAMES.includes(result.filename)) {
        showDeprecationWarning(result.filename, false);
      }
      return result.config;
    }
  }

  return {};
}

/**
 * Get merged config (project overrides global)
 * Also reads from environment variables
 * Supports both old .swarmrc file and new .swarmrc/ folder structure
 */
export function getConfig(cwd: string = process.cwd()): Config {
  // Check if new .swarmrc/ folder structure exists
  const newStructurePath = join(cwd, '.swarmrc');
  if (existsSync(newStructurePath) && statSync(newStructurePath).isDirectory()) {
    // Load new .swarmrc/ folder structure synchronously
    try {
      const config: Partial<Config> = {};

      // Load main config
      const configPath = join(newStructurePath, 'config.json');
      if (existsSync(configPath)) {
        const mainConfigData = JSON.parse(readFileSync(configPath, 'utf-8'));
        const mainConfig = SwarmRcMainConfigSchema.parse(mainConfigData);

        config.verbose = mainConfig.verbose;
        config.debug = mainConfig.debug;
        config.enableThinking = mainConfig.enableThinking;
        config.ultrathinkMode = mainConfig.ultrathinkMode;
        config.maxThinkingTokens = mainConfig.maxThinkingTokens;
        config.autoCompact = mainConfig.autoCompact;
        config.compactionThreshold = mainConfig.compactionThreshold;
        config.compactionKeepRecentCount = mainConfig.compactionKeepRecentCount;

        // Load active provider's model
        if (mainConfig.activeProvider && mainConfig.activeModel) {
          // Try project provider config first, then global
          let providerPath = join(newStructurePath, 'providers', `${mainConfig.activeProvider}.json`);
          let providerConfig: any = null;

          if (existsSync(providerPath)) {
            const providerData = JSON.parse(readFileSync(providerPath, 'utf-8'));
            providerConfig = ProviderConfigSchema.parse(providerData);
          } else {
            // Fall back to global provider config (for OAuth models)
            const globalProviderPath = join(homedir(), '.swarmrc', 'providers', `${mainConfig.activeProvider}.json`);
            if (existsSync(globalProviderPath)) {
              const providerData = JSON.parse(readFileSync(globalProviderPath, 'utf-8'));
              providerConfig = ProviderConfigSchema.parse(providerData);
            }
          }

          if (providerConfig) {
            const activeModel = providerConfig.models[mainConfig.activeModel];
            if (activeModel) {
              config.model = mainConfig.activeModel;

              // Handle OAuth token loading
              let apiKey = activeModel.apiKey;
              if (apiKey === 'oauth' && mainConfig.activeProvider === 'anthropic') {
                // Load OAuth token synchronously from file
                try {
                  const tokenStorePath = join(homedir(), '.ceregrep', 'oauth', 'anthropic.json');
                  if (existsSync(tokenStorePath)) {
                    const tokenData = JSON.parse(readFileSync(tokenStorePath, 'utf-8'));
                    apiKey = tokenData.access_token;
                  } else {
                    console.warn('OAuth token file not found. Please authenticate with /model.');
                    apiKey = undefined;
                  }
                } catch (error) {
                  console.warn('Failed to load OAuth token:', error);
                  apiKey = undefined;
                }
              }

              config.provider = {
                type: mainConfig.activeProvider,
                apiKey,
                baseURL: activeModel.baseURL,
                temperature: activeModel.temperature,
                top_p: activeModel.top_p,
              };
            }
          }
        }
      }

      // Load MCP servers
      const mcpPath = join(newStructurePath, 'mcp-servers.json');
      if (existsSync(mcpPath)) {
        const mcpData = JSON.parse(readFileSync(mcpPath, 'utf-8'));
        config.mcpServers = mcpData;
      }

      // Override with environment variables if present
      if (process.env.ANTHROPIC_API_KEY && !config.provider?.apiKey) {
        if (!config.provider) config.provider = { type: 'anthropic' };
        config.provider.apiKey = process.env.ANTHROPIC_API_KEY;
      }

      // Validate and apply defaults
      const validated = ConfigSchema.parse(config);
      return validated;
    } catch (error) {
      console.warn('Failed to load new .swarmrc/ config, falling back to old format:', error);
    }
  }

  // Fall back to old file-based config
  const globalConfig = getGlobalConfig();
  const projectConfig = getProjectConfig(cwd);

  // Merge configs (project overrides global)
  const mergedConfig = {
    ...globalConfig,
    ...projectConfig,
  };

  // Override with environment variables if present
  if (process.env.ANTHROPIC_API_KEY && !mergedConfig.apiKey) {
    mergedConfig.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  // Validate and apply defaults
  const validated = ConfigSchema.parse(mergedConfig);

  return validated;
}

/**
 * Get config sources (which files are being loaded)
 */
export function getConfigSources(cwd: string = process.cwd()): {
  global: string | null;
  project: string | null;
} {
  const homeDir = homedir();

  let globalSource: string | null = null;
  for (const filename of CONFIG_FILENAMES) {
    const path = join(homeDir, filename);
    if (existsSync(path)) {
      globalSource = path;
      break;
    }
  }

  let projectSource: string | null = null;
  for (const filename of CONFIG_FILENAMES) {
    const path = join(cwd, filename);
    if (existsSync(path)) {
      projectSource = path;
      break;
    }
  }

  return { global: globalSource, project: projectSource };
}

/**
 * Get current project config (alias for backward compatibility)
 */
export function getCurrentProjectConfig(cwd: string = process.cwd()): Partial<Config> {
  return getProjectConfig(cwd);
}

/**
 * Save project config to .swarmrc
 */
export function saveCurrentProjectConfig(config: Partial<Config>, cwd: string = process.cwd()): void {
  const configPath = join(cwd, '.swarmrc');

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save config to ${configPath}: ${error}`);
  }
}

/**
 * Save global config to home directory
 */
export function saveGlobalConfig(config: Partial<Config>): void {
  const homeDir = homedir();
  const configPath = join(homeDir, '.swarmrc');

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to save config to ${configPath}: ${error}`);
  }
}

/**
 * Save config (alias for saveGlobalConfig)
 */
export function saveConfig(config: Partial<Config>): void {
  saveGlobalConfig(config);
}
