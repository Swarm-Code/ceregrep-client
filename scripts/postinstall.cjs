#!/usr/bin/env node

/**
 * Post-install script to ensure ceregrep binary has correct permissions
 * This fixes issues where npm doesn't preserve executable permissions on install
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function fixPermissions() {
  try {
    // Find the installed location of the CLI script
    const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

    if (!fs.existsSync(cliPath)) {
      console.warn('[ceregrep] Warning: CLI script not found at', cliPath);
      console.warn('[ceregrep] Make sure to run: npm run build');
      return false;
    }

    // Make it executable
    if (process.platform !== 'win32') {
      // Unix-like systems
      try {
        fs.chmodSync(cliPath, 0o755);
        console.log('[ceregrep] ✓ Fixed permissions for CLI executable');
      } catch (err) {
        console.warn('[ceregrep] Warning: Could not fix CLI permissions:', err.message);
        console.warn('[ceregrep] Try running: chmod +x', cliPath);
        return false;
      }
    } else {
      // Windows - no-op, but log it
      console.log('[ceregrep] ✓ Running on Windows, skipping permission fixes');
    }

    return true;
  } catch (err) {
    console.error('[ceregrep] Error during post-install:', err.message);
    return false;
  }
}

// Run the fix
const success = fixPermissions();

if (!success && process.platform !== 'win32') {
  console.error('[ceregrep] Post-install permission fix failed');
  console.error('[ceregrep] To fix manually, run:');
  console.error('[ceregrep]   chmod +x $(npm bin)/ceregrep');
  process.exit(1);
}
