#!/usr/bin/env node
// Scout CLI wrapper - increases Node heap size for long conversations
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
await import(distPath);
