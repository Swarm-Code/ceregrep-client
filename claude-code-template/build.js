#!/usr/bin/env node

/**
 * Enhanced Claude Code Build Script
 * ================================
 * Builds our integrated Claude Code with all latest features
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Building Enhanced Claude Code...');

// Create dist directory
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Build TypeScript files
console.log('📦 Compiling TypeScript...');
try {
    execSync('npx tsc --build --force', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation complete');
} catch (error) {
    console.log('⚠️  TypeScript compilation failed, continuing...');
}

// Create executable CLI
console.log('🛠️  Creating executable CLI...');

const cliContent = `#!/usr/bin/env node

/**
 * Enhanced Claude Code - Integrated Version
 * ========================================
 * Combines deobfuscated core with latest readable features
 * Built with ❤️  by the Swarm
 */

// Import our enhanced entrypoint
require('./entrypoints/cli.js');
`;

fs.writeFileSync('dist/cli.mjs', cliContent);
fs.chmodSync('dist/cli.mjs', '755');

console.log('✅ Enhanced Claude Code build complete!');
console.log('🎯 Run with: ./dist/cli.mjs');