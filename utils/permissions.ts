/**
 * Tool Permissions Management
 * Handles enabling/disabling tools at the global level
 */

import { getConfig, saveCurrentProjectConfig, getCurrentProjectConfig } from '../config/loader.js';

export interface ToolPermissions {
  [toolName: string]: boolean;
}

/**
 * Get permissions for all tools
 * Returns map of tool name -> enabled state
 */
export function getToolPermissions(): ToolPermissions {
  const config = getConfig();
  const permissions: ToolPermissions = {};

  // All tools are enabled by default unless explicitly disabled
  if (config.disabledTools && Array.isArray(config.disabledTools)) {
    config.disabledTools.forEach((toolName: string) => {
      permissions[toolName] = false;
    });
  }

  return permissions;
}

/**
 * Check if a specific tool is enabled
 */
export function isToolEnabled(toolName: string): boolean {
  const permissions = getToolPermissions();
  // Default to true (enabled) if not in permissions map
  return permissions[toolName] !== false;
}

/**
 * Enable or disable a specific tool
 */
export async function setToolPermission(toolName: string, enabled: boolean): Promise<void> {
  const config = getCurrentProjectConfig();

  if (!config.disabledTools) {
    config.disabledTools = [];
  }

  if (enabled) {
    // Remove from disabled list
    config.disabledTools = config.disabledTools.filter((t: string) => t !== toolName);
  } else {
    // Add to disabled list if not already there
    if (!config.disabledTools.includes(toolName)) {
      config.disabledTools.push(toolName);
    }
  }

  saveCurrentProjectConfig(config);
}

/**
 * Enable all tools
 */
export async function enableAllTools(): Promise<void> {
  const config = getCurrentProjectConfig();
  config.disabledTools = [];
  saveCurrentProjectConfig(config);
}

/**
 * Disable all tools (dangerous - use with caution)
 */
export async function disableAllTools(toolNames: string[]): Promise<void> {
  const config = getCurrentProjectConfig();
  config.disabledTools = [...toolNames];
  saveCurrentProjectConfig(config);
}
