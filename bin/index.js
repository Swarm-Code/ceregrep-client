#!/usr/bin/env node
// Scout CLI wrapper - spawns Node.js with increased heap size for long conversations
import { spawn } from 'child_process';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to resolve swarm-scout package location
let pkgRoot;
try {
  const pkgPath = require.resolve('swarm-scout/package.json');
  pkgRoot = path.dirname(pkgPath);
} catch {
  // Fallback for npm link - use relative path from this script
  pkgRoot = path.resolve(__dirname, '..');
}

const distPath = path.join(pkgRoot, 'dist/cli/index.js');

// Spawn Node.js with increased heap size and garbage collection control
// This fixes the memory ceiling that prevented long conversations from working
const nodeArgs = [
  '--max-old-space-size=8192',  // 8GB heap limit (vs default ~1.4GB for 64-bit)
  '--expose-gc',                 // Enable manual garbage collection for cleanup
  distPath,
  ...process.argv.slice(2)       // Pass through all CLI arguments
];

// Set NODE_ENV to development if DevTools is enabled (needed for profiling)
const env = { ...process.env };
if (process.env.DEV === 'true' || process.env.REACT_DEVTOOLS === 'true') {
  env.NODE_ENV = 'development';
}

const child = spawn('node', nodeArgs, {
  stdio: 'inherit',              // Inherit stdin, stdout, stderr for transparent terminal interaction
  cwd: process.cwd(),            // Preserve current working directory
  env: env                        // Pass environment variables with DevTools mode if enabled
});

// Handle spawn errors
child.on('error', (err) => {
  console.error('Failed to start scout:', err.message);
  process.exit(1);
});

// Forward exit code from child process
child.on('exit', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  } else if (signal) {
    process.kill(process.pid, signal);
  }
});
