/**
 * Configuration loader
 * Loads and merges config from global and project directories
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config, ConfigSchema } from './schema.js';

const CONFIG_FILENAMES = ['.swarmrc', '.ceregrep.json'];
const DEPRECATED_FILENAMES = ['.ceregrep.json'];

/**
 * Load configuration from file
 * Returns both the config and the filename that was loaded
 */
function loadConfigFile(path: string): { config: Partial<Config>; filename: string } | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    const config = JSON.parse(content);
    const filename = path.split('/').pop() || path;
    return { config, filename };
  } catch (error) {
    console.warn(`Failed to load config from ${path}:`, error);
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
 */
export function getConfig(cwd: string = process.cwd()): Config {
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
