#!/usr/bin/env node

/**
 * Targeted Fix Script for Remaining TS2835 Errors
 * ==============================================
 * Focuses on fixing the specific import patterns causing TS2835 errors
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// More targeted patterns for .ts/.tsx -> .js conversion
const targetedPatterns = [
  // Import statements with relative paths
  { pattern: /from\s+'\.(.*?)\.ts'/g, replacement: "from './$1.js'" },
  { pattern: /from\s+'\.(.*?)\.tsx'/g, replacement: "from './$1.js'" },

  // Import statements with relative paths (double quotes)
  { pattern: /from\s+"\.(.*?)\.ts"/g, replacement: 'from "./$1.js"' },
  { pattern: /from\s+"\.(.*?)\.tsx"/g, replacement: 'from "./$1.js"' },

  // Import type statements
  { pattern: /import type\s+{(.*?)}\s+from\s+'\.(.*?)\.ts'/g, replacement: "import type {$1} from './$2.js'" },
  { pattern: /import type\s+{(.*?)}\s+from\s+'\.(.*?)\.tsx'/g, replacement: "import type {$1} from './$2.js'" },

  // Import statements with named imports
  { pattern: /import\s+{(.*?)}\s+from\s+'\.(.*?)\.ts'/g, replacement: "import {$1} from './$2.js'" },
  { pattern: /import\s+{(.*?)}\s+from\s+'\.(.*?)\.tsx'/g, replacement: "import {$1} from './$2.js'" },

  // Default exports with named imports
  { pattern: /import\s+([a-zA-Z0-9_]+),\s*{(.*?)}\s+from\s+'\.(.*?)\.ts'/g, replacement: "import $1, {$2} from './$3.js'" },
  { pattern: /import\s+([a-zA-Z0-9_]+),\s*{(.*?)}\s+from\s+'\.(.*?)\.tsx'/g, replacement: "import $1, {$2} from './$3.js'" },

  // Export statements
  { pattern: /export\s+{(.*?)}\s+from\s+'\.(.*?)\.ts'/g, replacement: "export {$1} from './$2.js'" },
  { pattern: /export\s+{(.*?)}\s+from\s+'\.(.*?)\.tsx'/g, replacement: "export {$1} from './$2.js'" },

  // Dynamic imports
  { pattern: /import\('\.(.*?)\.ts'\)/g, replacement: "import('./$1.js')" },
  { pattern: /import\('\.(.*?)\.tsx'\)/g, replacement: "import('./$1.js')" },

  // import * as statements
  { pattern: /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+'\.(.*?)\.ts'/g, replacement: "import * as $1 from './$2.js'" },
  { pattern: /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+'\.(.*?)\.tsx'/g, replacement: "import * as $1 from './$2.js'" },
];

// Get list of files that still have TS2835 errors
function getFilesWithTS2835Errors() {
  const output = require('child_process').execSync('npx tsc --noEmit --skipLibCheck 2>&1', { encoding: 'utf8' });
  const lines = output.split('\n');
  const files = new Set();

  for (const line of lines) {
    if (line.includes('TS2835')) {
      const match = line.match(/^(.*?):/);
      if (match) {
        files.add(match[1]);
      }
    }
  }

  return Array.from(files);
}

function fixFile(targetFile) {
  try {
    let content = fs.readFileSync(targetFile, 'utf8');
    let originalContent = content;
    let hasChanges = false;

    for (const { pattern, replacement } of targetedPatterns) {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(targetFile, content);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${targetFile}: ${error.message}`);
    return false;
  }
}

console.log('🔧 Starting targeted TS2835 error fixing...');

const filesToFix = getFilesWithTS2835Errors();

if (filesToFix.length === 0) {
  console.log('✅ No TS2835 errors found!');
  process.exit(0);
}

console.log(`📝 Files with TS2835 errors (${filesToFix.length} total):`);
filesToFix.forEach(file => console.log(`  - ${file}`));

let fixedCount = 0;
for (const file of filesToFix) {
  if (fixFile(file)) {
    console.log(`✅ Fixed: ${file}`);
    fixedCount++;
  }
}

console.log(`🎉 Fixed ${fixedCount} out of ${filesToFix.length} files with TS2835 errors.`);