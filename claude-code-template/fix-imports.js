#!/usr/bin/env node

/**
 * Import Path Fix Script for Claude Code Integration
 * ================================================
 * Systematically removes .ts and .tsx extensions from import statements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to fix
const importPatterns = [
  { pattern: /from\s+['"]([^'"]+)\.ts['"]/g, replacement: "from '$1'" },
  { pattern: /from\s+['"]([^'"]+)\.tsx['"]/g, replacement: "from '$1'" },
  { pattern: /import\s+['"]([^'"]+)\.ts['"]/g, replacement: "import '$1'" },
  { pattern: /import\s+['"]([^'"]+)\.tsx['"]/g, replacement: "import '$1'" },
];

// Files to process (TypeScript and TSX files)
function getAllTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist' && item.name !== '.git') {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    for (const { pattern, replacement } of importPatterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in: ${path.relative(__dirname, filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('🔧 Fixing TypeScript import paths...');

const allFiles = getAllTsFiles(__dirname);
let fixedCount = 0;

for (const file of allFiles) {
  if (fixImportsInFile(file)) {
    fixedCount++;
  }
}

console.log(`🎉 Import fix complete! Fixed ${fixedCount} files out of ${allFiles.length} total.`);