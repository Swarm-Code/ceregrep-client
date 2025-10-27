/**
 * TUI Entry Point
 * Starts the Ink-based TUI interface
 *
 * React DevTools Integration:
 * - Run: npx react-devtools (in another terminal)
 * - Then: REACT_DEVTOOLS=true scout tui (or DEV=true)
 * - DevTools will automatically connect and show component tree
 */

// React DevTools integration - import at module level BEFORE React
// This must be one of the first imports for DevTools to work correctly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

try {
  if (process.env.DEV === 'true' || process.env.REACT_DEVTOOLS === 'true') {
    // Synchronous import for module initialization
    // This connects to standalone React DevTools app
    // Note: NODE_ENV must be 'development' for profiling to work
    // This is set by the launcher script when DevTools is enabled
    require('react-devtools');
  }
} catch (err) {
  // Silently fail if not installed or available
}

import React from 'react';
import { render } from 'ink';
import { App } from './components/App.js';
import { initDiagnostics } from './utils/diagnostics.js';
import { initMemoryProfiler } from './utils/memoryProfiler.js';

export interface TUIOptions {
  conversationId?: string;
  agentId?: string;
  enableLogging?: boolean;
}

/**
 * Start the TUI
 */
export async function startTUI(options: TUIOptions = {}): Promise<void> {
  // Initialize diagnostics first (logging, profiling, tracing)
  await initDiagnostics();

  // Initialize memory profiler if enabled (opt-in via MEMORY_PROFILE env var)
  // This establishes baseline and starts continuous monitoring
  await initMemoryProfiler();

  render(
    <App
      initialConversationId={options.conversationId}
      initialAgentId={options.agentId}
      enableLogging={options.enableLogging}
    />,
    {
      exitOnCtrlC: false, // We handle Ctrl+C manually
    }
  );
}
