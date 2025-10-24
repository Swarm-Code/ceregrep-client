// Macro constants for Claude Code Integration

export const MACRO = {
  VERSION: '1.0.88-integrated',
  BUILD_TIME: new Date().toISOString(),
  PRODUCT_NAME: 'Claude Code',
  CLI_NAME: 'claude-code',
  AUTHOR: 'Anthropic',
  REPOSITORY: 'https://github.com/anthropics/claude-code',
  DESCRIPTION: 'Enhanced Claude Code with integrated features',
  README_URL: 'https://docs.claude.com/en/docs/claude-code',
  PACKAGE_URL: 'https://www.npmjs.com/package/@anthropic-ai/claude-code',

  // Build configuration
  BUILD_TARGET: 'node',
  BUILD_FORMAT: 'esm',

  // Feature flags
  FEATURES: {
    THINKING_MODE: true,
    MCP_SUPPORT: true,
    AGENT_TOOLS: true,
    FILE_OPERATIONS: true,
    BASH_INTEGRATION: true,
    UI_COMPONENTS: true
  },

  // Environment detection
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_TEST: process.env.NODE_ENV === 'test',

  // User feedback
  ISSUES_EXPLAINER: 'visit https://github.com/anthropics/claude-code/issues'
};

(globalThis as any).MACRO = MACRO;