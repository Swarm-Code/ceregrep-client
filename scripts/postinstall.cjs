#!/usr/bin/env node

/**
 * Post-install script to ensure swarm-scout binary has correct permissions
 * This fixes issues where npm doesn't preserve executable permissions on install
 */

const fs = require('fs');
const path = require('path');

function fixPermissions() {
  try {
    // Find the installed location of the CLI script
    const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

    if (!fs.existsSync(cliPath)) {
      console.warn('[swarm-scout] Warning: CLI script not found at', cliPath);
      console.warn('[swarm-scout] Make sure to run: npm run build');
      console.warn('[swarm-scout] This is expected during development before first build');
      return false;
    }

    // Make it executable
    if (process.platform !== 'win32') {
      // Unix-like systems
      try {
        const currentPerms = fs.statSync(cliPath).mode;
        fs.chmodSync(cliPath, 0o755);
        console.log('[swarm-scout] ✓ Fixed permissions for CLI executable (755)');
        console.log('[swarm-scout]   Path:', cliPath);
      } catch (err) {
        console.warn('[swarm-scout] Warning: Could not fix CLI permissions:', err.message);
        console.warn('[swarm-scout] Try running: chmod +x', cliPath);
        return false;
      }
    } else {
      // Windows - no-op, but log it
      console.log('[swarm-scout] ✓ Running on Windows, skipping permission fixes');
    }

    return true;
  } catch (err) {
    console.error('[swarm-scout] Error during post-install:', err.message);
    return false;
  }
}

// Run the fix
const success = fixPermissions();

if (!success && process.platform !== 'win32') {
  console.warn('[swarm-scout] Post-install permission fix failed');
  console.warn('[swarm-scout] To fix manually, run:');
  console.warn('[swarm-scout]   chmod +x $(npm bin)/swarm-scout');
  // Don't exit with error - this is not fatal
}
