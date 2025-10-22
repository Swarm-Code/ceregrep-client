/**
 * Mode-Specific System Prompts - DISABLED
 * No mode-specific prompts to avoid Cerebras issues
 */

export type AgentMode = 'PLAN' | 'ACT' | 'AUTO' | 'DEBUG';

export function getBaseSystemPrompt(): string[] {
  return [];
}

export function getModeSpecificPrompt(mode: AgentMode): string[] {
  return [];
}

export function getModeSystemPrompt(mode: AgentMode): string[] {
  return [];
}

export function getModeDescription(mode: AgentMode): string {
  switch (mode) {
    case 'PLAN':
      return 'Planning mode';
    case 'ACT':
      return 'Action mode';
    case 'AUTO':
      return 'Autonomous mode';
    case 'DEBUG':
      return 'Debug mode';
  }
}

export function getModeEmoji(mode: AgentMode): string {
  switch (mode) {
    case 'PLAN':
      return '📋';
    case 'ACT':
      return '⚡';
    case 'AUTO':
      return '🤖';
    case 'DEBUG':
      return '🔍';
  }
}
