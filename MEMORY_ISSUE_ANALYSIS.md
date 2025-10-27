# Memory Issue Analysis: Kode vs Scout TUI

## Executive Summary

The JavaScript heap out of memory error occurs in Scout TUI but not in Kode due to fundamental differences in how these applications are executed. Kode implements a sophisticated cross-platform CLI wrapper that manages memory allocation effectively, while Scout TUI runs directly with Node.js default memory limits.

## Root Cause Analysis

### 1. Kode's Memory Management Implementation

**File: `/home/alejandro/Swarm/ceregrep-client/Kode/scripts/build.mjs`**

Kode's build process creates a CLI wrapper (lines 104-163) that implements intelligent process execution:

```javascript
// Cross-platform CLI wrapper for Kode
// Prefers Bun but falls back to Node.js with tsx loader

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// Try to use Bun first, then fallback to Node.js
const runWithBun = () => {
  const proc = spawn('bun', ['run', distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd()  // Uses current working directory
  });
  // ... error handling
};

const runWithNode = () => {
  const proc = spawn('node', [distPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    cwd: process.cwd()  // Uses current working directory
  });
  // ... error handling
};
```

**Key advantages of Kode's approach:**
- **Bun Runtime Preference**: Bun has more efficient memory management than Node.js
- **Proper Process Spawning**: Uses `child_process.spawn()` with explicit configuration
- **Working Directory Preservation**: Maintains context with `cwd: process.cwd()`

### 2. Scout TUI's Memory Management Gap

**File: `/home/alejandro/Swarm/ceregrep-client/bin/scout.sh`** (also referenced as `index.js`)

Scout's CLI wrapper contains only a comment about heap size but no actual implementation:

```javascript
#!/usr/bin/env node
// Scout CLI wrapper - increases Node heap size for long conversations
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

// ... resolution logic

const distPath = path.join(pkgRoot, 'dist/cli/index.js');
await import(distPath);  // Direct import without memory configuration
```

**File: `/home/alejandro/Swarm/ceregrep-client/cli/index.ts`** (lines 1-5)

The actual CLI entry point:
```typescript
#!/usr/bin/env node
/**
 * CLI for Ceregrep Agent Framework
 * Headless command-line interface - no UI, pure stdout/stderr
 */
```

When the TUI is started via `scout tui` command, it loads the TUI components directly without any memory limit configuration:

**File: `/home/alejandro/Swarm/ceregrep-client/cli/index.ts`** (lines 625-652)
```typescript
program
  .command('tui')
  .description('Start the interactive TUI interface')
  .option('-c, --conversation <id>', 'Load a specific conversation')
  .option('-a, --agent <id>', 'Start with a specific agent')
  .option('-l, --log', 'Enable conversation logging to ~/.swarm-cli/logs/')
  .option('--debug', 'Enable debug output')
  .action(async (options: any) => {
    try {
      // Enable debug environment variables if --debug flag is set
      if (options.debug) {
        process.env.DEBUG_CEREBRAS = '1';
        process.env.DEBUG_MCP = '1';
        process.env.DEBUG = '1';
        console.log('🔍 Debug mode enabled - verbose output will be shown\n');
      }

      const { startTUI } = await import('../tui/index.js');  // Direct import
      startTUI({
        conversationId: options.conversation,
        agentId: options.agent,
        enableLogging: options.log,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
```

## Technical Deep Dive

### Node.js Default Heap Limits

Node.js V8 engine has default heap limits:
- **64-bit systems**: ~1.4GB (1400MB)
- **32-bit systems**: ~0.7GB (700MB)

Your error shows:
```
[1957833:0x354e11a0]   136998 ms: Mark-Compact 4198.3 (4283.0) -> 4085.0 (4185.1) MB
```

This indicates the application reached ~4.2GB of memory usage, far exceeding Node.js's default limits.

### Kode's Memory Efficiency Factors

1. **Bun Runtime**: Bun is built on Zig and has a more efficient JavaScript engine with better memory management
2. **Process Isolation**: Kode's wrapper spawns separate processes, which helps with memory cleanup
3. **Explicit Resource Management**: The wrapper pattern provides better control over execution context

### Scout TUI's Memory Vulnerabilities

1. **Direct Execution**: No memory limit overrides in the execution chain
2. **Long-running Process**: TUI applications maintain state in a single Node.js process
3. **Context Accumulation**: Long conversations accumulate context without proper compaction
4. **Component Complexity**: Ink-based TUI with React components can create memory pressure

## Solution Implementation

### 1. Modify Scout's CLI Wrapper

**File to modify: `/home/alejandro/Swarm/ceregrep-client/bin/scout.sh`**

Replace the current implementation with:

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

// Spawn Node.js with increased heap size (8GB in this example)
const nodeArgs = [
  '--max-old-space-size=8192',  // 8GB heap limit
  distPath,
  ...process.argv.slice(2)
];

const child = spawn('node', nodeArgs, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env
});

child.on('error', (err) => {
  console.error('Failed to start scout:', err.message);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
```

### 2. Alternative: Environment Variable Approach

Set the Node.js options before running Scout:

```bash
export NODE_OPTIONS="--max-old-space-size=8192"
scout tui
```

### 3. Implement Memory Monitoring

**File: `/home/alejandro/Swarm/ceregrep-client/tui/components/App.tsx`**

Add memory monitoring in the App component:

```typescript
// Add this to the App component's useEffect hooks
useEffect(() => {
  const monitorMemory = () => {
    if (globalThis.process && globalThis.process.memoryUsage) {
      const mem = globalThis.process.memoryUsage();
      const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
      
      // Log if heap usage exceeds 80% of total
      if (heapUsedMB / heapTotalMB > 0.8) {
        console.warn(`High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`);
      }
    }
  };

  const interval = setInterval(monitorMemory, 30000); // Check every 30 seconds
  return () => clearInterval(interval);
}, []);
```

## Verification Steps

1. **Before Fix**: 
   - Run Scout TUI with a long conversation
   - Monitor memory usage with `node --inspect` and Chrome DevTools

2. **After Fix**:
   - Verify Node.js is invoked with `--max-old-space-size` flag
   - Test same operations that previously caused OOM errors
   - Monitor memory usage doesn't exceed configured limits

## Best Practices for TUI Memory Management

1. **Context Compaction**: 
   - **File: `/home/alejandro/Swarm/ceregrep-client/utils/autoCompactCore.js`**
   - Implement regular cleanup of conversation history

2. **Resource Cleanup**:
   - Properly dispose of components when not in use
   - Clear event listeners and subscriptions

3. **Streaming Data**:
   - Process large data in chunks rather than loading everything into memory

4. **Monitoring**:
   - Add memory usage logging to detect issues early

## Conclusion

The memory issue in Scout TUI occurs because it runs directly with Node.js default heap limits, while Kode uses a sophisticated wrapper that either leverages Bun's better memory management or properly configures Node.js execution parameters. Implementing a similar wrapper pattern with explicit heap size configuration will resolve the out-of-memory errors.

To implement these fixes, please switch to ACT mode with "/mode act" and I'll help you make the necessary code changes.