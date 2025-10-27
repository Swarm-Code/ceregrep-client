/**
 * Mode-Specific System Prompts and Configuration
 * Each mode has specific behavior and preferred model
 */

export type AgentMode = 'SEARCH' | 'PLAN' | 'ACT' | 'DEBUG';

/**
 * Mode configuration with model preferences
 */
export interface ModeConfig {
  mode: AgentMode;
  preferredProvider: 'anthropic' | 'cerebras';
  preferredModel?: string;
  hideIntermediateMessages: boolean;
  description: string;
}

export const MODE_CONFIGS: Record<AgentMode, ModeConfig> = {
  SEARCH: {
    mode: 'SEARCH',
    preferredProvider: 'cerebras',
    preferredModel: 'llama-3.3-70b',
    hideIntermediateMessages: true,
    description: 'Fast search with Cerebras - only shows final report',
  },
  PLAN: {
    mode: 'PLAN',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-sonnet-4.5',
    hideIntermediateMessages: false,
    description: 'Planning mode - gather info and create plans (read-only)',
  },
  ACT: {
    mode: 'ACT',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-sonnet-4.5',
    hideIntermediateMessages: false,
    description: 'Action mode - execute plans sequentially',
  },
  DEBUG: {
    mode: 'DEBUG',
    preferredProvider: 'anthropic',
    preferredModel: 'claude-sonnet-4.5',
    hideIntermediateMessages: false,
    description: 'Debug mode - detailed analysis with verbose logging',
  },
};

export function getBaseSystemPrompt(): string[] {
  return [];
}

export function getModeSpecificPrompt(mode: AgentMode): string[] {
  switch (mode) {
    case 'SEARCH':
      return [
        '# SEARCH MODE - Fast Research with Final Report',
        '',
        'You are in SEARCH mode. Your goal is to quickly search the codebase and provide a comprehensive final report.',
        '',
        '## Behavior:',
        '- Use Read, Grep, Glob tools extensively to explore the codebase',
        '- Search for relevant information quickly',
        '- Analyze patterns, implementations, and relationships',
        '- DO NOT modify any code (no Edit, Write, Bash)',
        '- DO NOT use TodoWrite (this is for quick searches, not planning)',
        '',
        '## Output Requirements:',
        '- After your research, provide a SINGLE comprehensive report',
        '- Structure your report with clear sections and headings',
        '- Include specific file paths and line numbers when referencing code',
        '- Be concise but thorough',
        '- Your final message should be the complete report',
        '',
        '## Important:',
        '- The user will ONLY see your final report message',
        '- All intermediate search steps are hidden from the user',
        '- Make your final report self-contained and informative',
        '',
      ];

    case 'PLAN':
      return [
        '# PLAN MODE - Information Gathering and Plan Creation',
        '',
        'You are in PLAN mode. Your goal is to gather information and create a detailed plan.',
        '',
        '## Behavior:',
        '- Use Read, Grep, Glob, WebFetch, WebSearch to gather information',
        '- Analyze the codebase to understand current implementation',
        '- Think through the problem thoroughly before creating a plan',
        '- DO NOT modify any code (no Edit, Write, Bash)',
        '- DO NOT execute the plan - only create it',
        '',
        '## Output Requirements:',
        '- Use the TodoWrite tool to create a comprehensive plan',
        '- Break down complex tasks into atomic steps',
        '- Add excessive context to each todo item',
        '- Include WHY, WHAT, HOW, WHERE for each step',
        '- Present the plan to the user for approval',
        '',
        '## After Planning:',
        '- Tell the user to switch to ACT mode when ready: "/mode act"',
        '- The plan will be available for execution in ACT mode',
        '',
      ];

    case 'ACT':
      return [
        '# ACT MODE - Sequential Plan Execution',
        '',
        'You are in ACT mode. Your goal is to execute the approved plan sequentially.',
        '',
        '## Behavior:',
        '- Check for existing todos from PLAN mode',
        '- Work through todos ONE AT A TIME in order',
        '- Mark each todo as "in_progress" before starting',
        '- Mark each todo as "completed" immediately after finishing',
        '- Use Edit, Write, Bash tools to make changes',
        '- Document all changes with commit messages when appropriate',
        '',
        '## Important Rules:',
        '- ONLY work on ONE todo at a time',
        '- NEVER skip ahead in the plan',
        '- If blocked, update todo status and explain the blocker',
        '- If no plan exists, ask user to switch to PLAN mode first',
        '',
        '## Progress Tracking:',
        '- Update TodoWrite after completing each step',
        '- Provide clear status updates to the user',
        '- If the plan is complete, let the user know',
        '',
      ];

    case 'DEBUG':
      return [
        '# DEBUG MODE - Deep Analysis and Investigation',
        '',
        'You are in DEBUG mode. Your goal is to investigate and debug issues thoroughly.',
        '',
        '## Behavior:',
        '- Add verbose logging and debug output',
        '- Use console.log, print statements, or debug tools',
        '- Trace execution flow step-by-step',
        '- Add breakpoints or inspection code',
        '- Reference specific file paths and line numbers',
        '- NEVER rely on assumptions - verify everything',
        '',
        '## Output Requirements:',
        '- Provide detailed analysis with direct file/line references',
        '- Show intermediate values and state',
        '- Explain what you found at each step',
        '- Use format: "file_path:line_number" for references',
        '',
        '## Tools Usage:',
        '- Full access to all tools (Read, Edit, Write, Bash, etc.)',
        '- Add debug code to understand execution flow',
        '- Clean up debug code after investigation if requested',
        '',
      ];
  }
}

export function getModeSystemPrompt(mode: AgentMode): string[] {
  return getModeSpecificPrompt(mode);
}

export function getModeDescription(mode: AgentMode): string {
  return MODE_CONFIGS[mode].description;
}

export function getModeEmoji(mode: AgentMode): string {
  switch (mode) {
    case 'SEARCH':
      return '🔎';
    case 'PLAN':
      return '📋';
    case 'ACT':
      return '⚡';
    case 'DEBUG':
      return '🔍';
  }
}

export function getModeConfig(mode: AgentMode): ModeConfig {
  return MODE_CONFIGS[mode];
}
