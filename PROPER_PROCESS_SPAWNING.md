# Proper Process Spawning: Fixing Scout's Memory Issues

## What's Wrong with Scout's Current Process Spawning

### 1. Direct Import Instead of Process Spawning

**Current Implementation** (`/home/alejandro/Swarm/ceregrep-client/bin/scout.sh`):
```javascript
const distPath = path.join(pkgRoot, 'dist/cli/index.js');
await import(distPath);  // ← PROBLEM: Runs in same process
```

This approach has critical issues:
- **No Memory Isolation**: Everything runs in the same Node.js process
- **No Configuration Options**: Can't pass Node.js flags like `--max-old-space-size`
- **No Process Monitoring**: No way to track or restart the process if needed
- **Memory Accumulation**: All memory usage accumulates in the single process

### 2. Comparison with Kode's Proper Implementation

**Kode's Approach** (`/home/alejandro/Swarm/ceregrep-client/Kode/scripts/build.mjs`):
```javascript
const { spawn } = require('child_process');  // ← CORRECT: Uses child_process

// Try to use Bun first, then fallback to Node.js
const runWithBun = () => {
  const proc = spawn('bun', ['run', distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',        // ← PROPER: Inherits stdio streams
    cwd: process.cwd()       // ← PROPER: Preserves working directory
  });
};

const runWithNode = () => {
  const proc = spawn('node', [distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
};
```

Key advantages of Kode's approach:
- **Process Isolation**: Separate Node.js process with its own heap
- **Configuration Control**: Can pass Node.js flags and options
- **Resource Management**: Better garbage collection in isolated process
- **Error Handling**: Can catch and handle process spawn errors
- **Exit Management**: Properly handles process exit codes

## How to Fix Scout's Process Spawning

### 1. Modify the CLI Wrapper

Replace `/home/alejandro/Swarm/ceregrep-client/bin/scout.sh` with:

```javascript
#!/usr/bin/env node
// Scout CLI wrapper - increases Node heap size for long conversations
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

// Spawn Node.js with increased heap size and proper configuration
const nodeArgs = [
  '--max-old-space-size=8192',  // 8GB heap limit
  '--expose-gc',                // Enable garbage collection
  distPath,
  ...process.argv.slice(2)
];

const child = spawn('node', nodeArgs, {
  stdio: 'inherit',             // Inherit stdin, stdout, stderr
  cwd: process.cwd(),           // Preserve current working directory
  env: process.env              // Preserve environment variables
});

child.on('error', (err) => {
  console.error('Failed to start scout:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== null) {
    process.exit(code);
  } else {
    process.kill(process.pid, signal);
  }
});
```

### 2. Benefits of This Approach

1. **Increased Memory Limit**: `--max-old-space-size=8192` sets 8GB heap (vs default ~1.4GB)
2. **Garbage Collection Control**: `--expose-gc` allows manual GC triggering
3. **Process Isolation**: TUI runs in separate process with independent memory space
4. **Proper Error Handling**: Catches spawn errors and handles process exits
5. **Environment Preservation**: Maintains working directory and environment variables

### 3. Additional Memory Management Strategies

To further improve memory handling, you could also:

**Add periodic garbage collection** in the TUI App component:
```typescript
// In /home/alejandro/Swarm/ceregrep-client/tui/components/App.tsx
useEffect(() => {
  // Trigger garbage collection periodically if exposed
  if (global.gc) {
    const gcInterval = setInterval(() => {
      global.gc();
    }, 300000); // Every 5 minutes
    
    return () => clearInterval(gcInterval);
  }
});
```

**Implement memory monitoring**:
```typescript
// Add to App.tsx
useEffect(() => {
  const monitorMemory = () => {
    if (process.memoryUsage) {
      const mem = process.memoryUsage();
      const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
      
      // Log high memory usage
      if (heapUsedMB / heapTotalMB > 0.8) {
        console.warn(`⚠️  High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`);
      }
    }
  };

  const interval = setInterval(monitorMemory, 60000); // Check every minute
  return () => clearInterval(interval);
}, []);
```

This proper process spawning approach will resolve the memory issues you've been experiencing with the Scout TUI by giving it adequate memory resources and better process management, similar to how Kode handles it.