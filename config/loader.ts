/**
 * Configuration loader
 * Loads and merges config from global and project directories
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Config, ConfigSchema } from './schema.js';

const CONFIG_FILENAMES = ['.ceregrep.json', '.swarmrc'];

/**
 * Load configuration from file
 */
function loadConfigFile(path: string): Partial<Config> | null {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load config from ${path}:`, error);
    return null;
  }
}

/**
 * Get global config from home directory
 */
export function getGlobalConfig(): Partial<Config> {
  const homeDir = homedir();

  for (const filename of CONFIG_FILENAMES) {
    const config = loadConfigFile(join(homeDir, filename));
    if (config) {
      return config;
    }
  }

  return {};
}

/**
 * Get project config from current working directory
 */
export function getProjectConfig(cwd: string = process.cwd()): Partial<Config> {
  for (const filename of CONFIG_FILENAMES) {
    const config = loadConfigFile(join(cwd, filename));
    if (config) {
      return config;
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
 * Save project config to .ceregrep.json
 */
export function saveCurrentProjectConfig(config: Partial<Config>, cwd: string = process.cwd()): void {
  const configPath = join(cwd, '.ceregrep.json');

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
  const configPath = join(homeDir, '.ceregrep.json');

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
