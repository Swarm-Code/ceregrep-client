# Ink Tools Integration Guide

Scout now uses advanced Ink components and tools for better TUI performance and debugging.

## Installed Tools

### 1. **ink-use-stdout-dimensions**
Dynamic terminal dimension tracking for responsive rendering.

**What it does:**
- Returns current terminal width and height `[width, height]`
- Updates automatically when terminal is resized
- Used to calculate how many messages to render

**Current Implementation:**
- `tui/hooks/useRenderLimit.ts` - Custom hook that uses `process.stdout.columns` and `process.stdout.rows` (avoids ESM/CommonJS issues with the package)
- Formula: `(height - 10 reserved lines) / 3 lines per message = max messages`
- Renders 10-100 messages depending on terminal size
- Installed but using native Node.js API instead to avoid module compatibility issues

**Usage:**
```typescript
import { useRenderLimit } from '../hooks/useRenderLimit.js';

function MyComponent() {
  const maxMessages = useRenderLimit();
  const renderedMessages = allMessages.slice(-maxMessages);
  return <MessageList messages={renderedMessages} />;
}
```

---

### 2. **ink-spawn**
Better process spawning for Ink-based CLI applications.

**What it does:**
- Spawn child processes from within Ink components
- Better integration with Ink's event loop
- Could replace our manual `fork()` approach in resourceLoaderPool

**Current Status:**
- Installed but not yet integrated
- Could be used to spawn resource loader worker more cleanly

**Potential Implementation:**
```typescript
// Instead of manual fork() in resourceLoaderPool
import spawn from 'ink-spawn';

const worker = spawn('node', [workerPath], {
  stdio: ['ignore', 'inherit', 'inherit', 'ipc']
});
```

---

### 3. **ink-text-input**
Optimized text input component for Ink.

**What it does:**
- Drop-in text input component optimized for terminal
- Better keyboard handling than custom implementations
- Supports mask, placeholder, etc.

**Current Status:**
- Installed but not integrated (we use custom EfficientTextInput)

**When to Use:**
- If EfficientTextInput has performance issues
- As a fallback/alternative text input

**Usage:**
```typescript
import TextInput from 'ink-text-input';

<TextInput
  value={value}
  onChange={onChange}
  placeholder="Enter text..."
/>
```

---

### 4. **react-devtools-core**
React DevTools integration for debugging Ink components in real-time.

**What it does:**
- Connect to React DevTools from CLI
- Inspect component tree while app is running
- Modify props and see changes instantly
- No need to restart app

**How to Use:**

1. Start Scout with DevTools enabled:
```bash
DEV=true scout tui
```

2. In another terminal, start React DevTools:
```bash
npx react-devtools
```

3. React DevTools will open and automatically connect
4. You can now:
   - Inspect component hierarchy
   - View/edit component props
   - Watch re-renders
   - Monitor state changes
   - Profile component performance

5. Press `Ctrl+C` in the Scout terminal to exit

---

## Benefits of These Tools

| Tool | Benefit |
|------|---------|
| **ink-use-stdout-dimensions** | Messages scale to terminal size (no hardcoded limits) |
| **ink-spawn** | Cleaner process management in Ink context |
| **ink-text-input** | Proven text input, potential fallback option |
| **react-devtools-core** | Real-time debugging without restarting |

---

## Environment Variables

```bash
# Enable React DevTools debugging
DEV=true scout tui

# Combined with memory profiling
DEV=true MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui

# Combined with logging
DEV=true LOG_FILE=scout-debug.log scout tui
```

---

## Future Improvements

1. **Replace resourceLoaderPool** with `ink-spawn` for cleaner process management
2. **Add ink-text-input** as fallback if EfficientTextInput has issues
3. **Extend DevTools integration** with custom DevTools panels for Scout-specific debugging
4. **Use dimensions** to auto-adjust other UI elements (sidebar width, etc.)

---

## Architecture

```
Scout TUI
├── useRenderLimit() ← Uses ink-use-stdout-dimensions
│   └── Returns dynamic MAX_RENDERED_MESSAGES
├── ResourceLoaderPool
│   └── Could use ink-spawn for worker management
├── EfficientTextInput
│   └── Alternative: ink-text-input component
└── React DevTools
    └── DEV=true enables debugging connection
```

---

## Debugging Tips

1. **To see component re-renders:** Open React DevTools Profiler, record, interact with app
2. **To inspect message rendering:** Use DevTools to select `<MessageList>` and inspect props
3. **To find performance issues:** Check DevTools "Highlight Updates When Components Render"
4. **To test UI at different sizes:** Resize terminal while app is running (dimensions auto-update)

---

## Resources

- [Ink DevTools](https://github.com/vadimdemedes/ink#react-devtools)
- [ink-use-stdout-dimensions](https://github.com/cameronhunter/ink-monorepo/tree/master/packages/ink-use-stdout-dimensions)
- [ink-spawn](https://github.com/kraenhansen/ink-spawn)
- [ink-text-input](https://github.com/vadimdemedes/ink-text-input)
