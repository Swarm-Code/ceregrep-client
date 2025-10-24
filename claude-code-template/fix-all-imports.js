#!/usr/bin/env node

/**
 * Complete Import Extension Fixer for Claude Code Integration
 * ========================================================
 * Fixes all TS2835 module resolution errors by converting import paths
 */

import fs from 'fs';
import path from 'path';

// Comprehensive patterns to fix import extensions
const fixPatterns = [
  // Relative imports with .ts extensions -> .js
  { pattern: /from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "from '$1.js'" },
  { pattern: /import\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import '$1.js'" },

  // Relative imports with .tsx extensions -> .js
  { pattern: /from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "from '$1.js'" },
  { pattern: /import\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import '$1.js'" },

  // Import type statements with .ts extensions -> .js
  { pattern: /import\s+type\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import type '$1.js'" },
  { pattern: /import\s+type\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import type '$1.js'" },

  // Import type statements with specific types
  { pattern: /import\s+type\s+{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import type {$1} from '$2.js'" },
  { pattern: /import\s+type\s+{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import type {$1} from '$2.js'" },

  // Import statements with specific imports
  { pattern: /import\s+{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import {$1} from '$2.js'" },
  { pattern: /import\s+{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import {$1} from '$2.js'" },

  // Default imports with named imports
  { pattern: /import\s+([a-zA-Z0-9_]+),\s*{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import $1, {$2} from '$3.js'" },
  { pattern: /import\s+([a-zA-Z0-9_]+),\s*{([^}]*?)}\s+from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import $1, {$2} from '$3.js'" },

  // Dynamic imports
  { pattern: /import\(['"](\.[^'"]*?)\.ts['"]\)/g, replacement: "import('$1.js')" },
  { pattern: /import\(['"](\.[^'"]*?)\.tsx['"]\)/g, replacement: "import('$1.js')" },

  // Import with renaming (import * as X from)
  { pattern: /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "import * as $1 from '$2.js'" },
  { pattern: /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "import * as $1 from '$2.js'" },

  // Fix export statements
  { pattern: /export\s+{[^}]*?}\s+from\s+['"](\.[^'"]*?)\.ts['"]/g, replacement: "export {$&} from '$1.js'" },
  { pattern: /export\s+{[^}]*?}\s+from\s+['"](\.[^'"]*?)\.tsx['"]/g, replacement: "export {$&} from '$1.js'" },
];

// Additional patterns to clean up malformed replacements
const cleanupPatterns = [
  { pattern: /export\s+{[^}]*?}\s+from\s+['"]([^'"]*?)\.ts\.js['"]/g, replacement: "export {$&} from '$1.js'" },
  { pattern: /export\s+{[^}]*?}\s+from\s+['"]([^'"]*?)\.tsx\.js['"]/g, replacement: "export {$&} from '$1.js'" },
  { pattern: /from\s+['"]([^'"]*?)\.ts\.js['"]/g, replacement: "from '$1.js'" },
  { pattern: /from\s+['"]([^'"]*?)\.tsx\.js['"]/g, replacement: "from '$1.js'" },
];

// Process all TypeScript files recursively
function processAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && !['node_modules', 'dist', '.git'].includes(item.name)) {
      files.push(...processAllTsFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Fix imports in a specific file
function fixFileImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let hasChanges = false;

    // Apply all fix patterns
    for (const { pattern, replacement } of fixPatterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    // Apply cleanup patterns to fix any malformed replacements
    for (const { pattern, replacement } of cleanupPatterns) {
      // Use a function to replace to handle the $& reference properly
      const newContent = content.replace(pattern, (match, p1) => {
        return replacement.replace('$1', p1);
      });
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    // Write changes if any were made
    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('🔧 Starting comprehensive import extension fixing...');

const tsFiles = processAllTsFiles('./');
let fixedCount = 0;

for (const file of tsFiles) {
  if (fixFileImports(file)) {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`✅ Fixed imports in: ${relativePath}`);
    fixedCount++;
  }
}

console.log(`🎉 Fixed import extensions in ${fixedCount} files out of ${tsFiles.length} total TypeScript files.`);