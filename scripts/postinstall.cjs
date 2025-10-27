#!/usr/bin/env node

/**
 * Post-install script to ensure swarm-scout binary has correct permissions
 * This fixes issues where npm doesn't preserve executable permissions on install
 * Handles both local and global installations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function fixPermissionsForPath(cliPath, label) {
  if (!fs.existsSync(cliPath)) {
    return null; // Path doesn't exist, skip silently
  }

  try {
    // Check current permissions
    const stats = fs.statSync(cliPath);
    const currentMode = stats.mode & parseInt('777', 8);
    const targetMode = 0o755;

    // Only change if needed
    if (currentMode !== targetMode) {
      fs.chmodSync(cliPath, targetMode);
      console.log(`[swarm-scout] ✓ Fixed permissions for ${label} (755)`);
      console.log(`[swarm-scout]   Path: ${cliPath}`);
      return true;
    } else {
      console.log(`[swarm-scout] ✓ Permissions already correct for ${label}`);
      return true;
    }
  } catch (err) {
    console.warn(`[swarm-scout] Warning: Could not fix ${label} permissions:`, err.message);
    if (err.code === 'EACCES') {
      console.warn('[swarm-scout] Try running with sudo for global installations');
    }
    return false;
  }
}

function fixPermissions() {
  if (process.platform === 'win32') {
    console.log('[swarm-scout] ✓ Running on Windows, skipping permission fixes');
    return true;
  }

  let anySuccess = false;

  try {
    // 1. Fix local installation path (for development and local installs)
    const localCliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
    const localResult = fixPermissionsForPath(localCliPath, 'CLI executable');
    if (localResult === true) anySuccess = true;

    // 2. Try to detect and fix global installation paths
    // This handles 'npm install -g' or 'npm link'
    try {
      // Try to find where npm puts global packages
      const npmPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();

      // Common global installation paths
      const globalPaths = [
        path.join(npmPrefix, 'lib', 'node_modules', 'swarm-scout', 'dist', 'cli', 'index.js'),
        path.join(npmPrefix, 'node_modules', 'swarm-scout', 'dist', 'cli', 'index.js'),
      ];

      for (const globalPath of globalPaths) {
        const globalResult = fixPermissionsForPath(globalPath, 'global CLI executable');
        if (globalResult === true) anySuccess = true;
      }
    } catch (err) {
      // Silently ignore if we can't detect global paths
      // This is not critical and might fail in CI/CD environments
    }

    // 3. Fix any symlinks in bin directories
    try {
      const npmBin = execSync('npm bin -g', { encoding: 'utf8' }).trim();
      const binLinks = [
        path.join(npmBin, 'scout'),
        path.join(npmBin, 'swarm-scout')
      ];

      for (const binLink of binLinks) {
        if (fs.existsSync(binLink)) {
          try {
            // Follow symlink to actual file
            const realPath = fs.realpathSync(binLink);
            const result = fixPermissionsForPath(realPath, `CLI executable (via ${path.basename(binLink)})`);
            if (result === true) anySuccess = true;
          } catch (err) {
            // Ignore symlink resolution errors
          }
        }
      }
    } catch (err) {
      // Silently ignore if we can't find bin directory
    }

  } catch (err) {
    console.error('[swarm-scout] Error during post-install:', err.message);
  }

  if (!anySuccess) {
    console.warn('[swarm-scout] Post-install: Could not fix permissions automatically');
    console.warn('[swarm-scout] If you experience permission issues, run:');
    console.warn('[swarm-scout]   sudo chmod +x $(which scout) || chmod +x $(npm bin)/scout');
  }

  // Don't fail the installation even if permissions couldn't be fixed
  return true;
}

// Run the fix
fixPermissions();
