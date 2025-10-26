#!/usr/bin/env node

/**
 * Development helper that cleans up lingering Scout MCP server processes
 * before running a build. Prevents stale uv/python instances from keeping
 * old code in memory during successive Codex runs.
 *
 * The script is best-effort: failures are logged but ignored so it never
 * blocks `npm run build` on systems without pkill (e.g., Windows).
 */

const { execSync } = require('node:child_process');
const { platform } = require('node:os');

if (process.env.SCOUT_SKIP_MCP_CLEANUP) {
  console.log('[dev-kill-scout-mcp] SCOUT_SKIP_MCP_CLEANUP is set, skipping cleanup.');
  process.exit(0);
}

if (platform() === 'win32') {
  console.warn('[dev-kill-scout-mcp] Skipping process cleanup on Windows.');
  process.exit(0);
}

const patterns = [
  'scout/mcp_server.py',
  'scout_mcp/server.py',
  'scout_mcp/bridge/scout_bridge.mjs',
];

let killed = false;

for (const pattern of patterns) {
  try {
    execSync(`pkill -f "${pattern}"`, { stdio: 'ignore' });
    killed = true;
  } catch {
    // pkill exits with 1 when no processes match; ignore.
  }
}

if (killed) {
  console.log('[dev-kill-scout-mcp] Terminated lingering Scout MCP processes.');
} else {
  console.log('[dev-kill-scout-mcp] No matching Scout MCP processes found.');
}
