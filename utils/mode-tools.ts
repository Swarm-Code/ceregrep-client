/**
 * Mode-based Tool Filtering
 * Different agent modes have different tool access levels
 */

import { Tool } from '../core/tool.js';

export type AgentMode = 'PLAN' | 'ACT' | 'DEBUG';

/**
 * Get tools filtered by agent mode
 * - PLAN mode: Read-only tools (like CLI query)
 * - ACT mode: All tools enabled
 * - DEBUG mode: Read-only tools (like PLAN)
 */
export function filterToolsByMode(tools: Tool[], mode: AgentMode): Tool[] {
  // ACT mode gets all tools
  if (mode === 'ACT') {
    return tools;
  }

  // PLAN and DEBUG modes get read-only tools only
  const blockedTools = [
    'Edit',
    'Write',
    'Bash',
    'FileEditTool',
    'FileWriteTool',
    'BashTool',
    'TodoWrite',
    'TodoWriteTool',
  ];

  return tools.filter(tool => !blockedTools.includes(tool.name));
}

/**
 * Get description of what tools are available in each mode
 */
export function getModeToolDescription(mode: AgentMode): string {
  switch (mode) {
    case 'PLAN':
      return 'Read-only mode - Can read, search, and analyze but not modify files';
    case 'ACT':
      return 'Full access - Can read, write, edit files and execute commands';
    case 'DEBUG':
      return 'Read-only mode - Can read, search, and analyze but not modify files';
  }
}
