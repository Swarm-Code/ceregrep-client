#!/usr/bin/env node

/**
 * Comprehensive TypeScript Import Fixer
 * ====================================
 * Fixes all TS2835 import extension errors in the Claude Code integration
 */

import fs from 'fs';
import path from 'path';

// Patterns to fix - convert .ts/.tsx imports to .js for NodeNext resolution
const patterns = [
  // Fix relative imports with .ts extensions
  { pattern: /from\s+['"](\.[^'"]+)\.ts['"]/g, replacement: "from '$1.js'" },
  { pattern: /import\s+['"](\.[^'"]+)\.ts['"]/g, replacement: "import '$1.js'" },

  // Fix relative imports with .tsx extensions
  { pattern: /from\s+['"](\.[^'"]+)\.tsx['"]/g, replacement: "from '$1.js'" },
  { pattern: /import\s+['"](\.[^'"]+)\.tsx['"]/g, replacement: "import '$1.js'" },

  // Fix import type statements with extensions
  { pattern: /import\s+type\s+['"](\.[^'"]+)\.ts['"]/g, replacement: "import type '$1.js'" },
  { pattern: /import\s+type\s+['"](\.[^'"]+)\.tsx['"]/g, replacement: "import type '$1.js'" },

  // Fix dynamic imports
  { pattern: /import\(['"](\.[^'"]+)\.ts['"]\)/g, replacement: "import('$1.js')" },
  { pattern: /import\(['"](\.[^'"]+)\.tsx['"]\)/g, replacement: "import('$1.js')" },
];

// Recursively process all TypeScript files in the directory
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory() && !['node_modules', 'dist', '.git'].includes(item.name)) {
      processDirectory(fullPath);
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      fixFileImports(fullPath);
    }
  }
}

function fixFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let hasChanges = false;

    // Apply all patterns
    for (const { pattern, replacement } of patterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    // Write changes if any were made
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      const relativePath = path.relative(process.cwd(), filePath);
      console.log(`✅ Fixed imports in: ${relativePath}`);
    }
  } catch (error) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.error(`❌ Error processing ${relativePath}: ${error.message}`);
  }
}

console.log('🔧 Starting comprehensive TypeScript import fix...');
processDirectory(process.cwd());
console.log('🎉 Import fixing complete!');