/**
 * Enterprise-grade diagnostics using Node.js built-in tools
 * Writes directly to disk without blocking the event loop
 *
 * Usage:
 * - node --inspect scout tui          (attach Chrome DevTools)
 * - node --trace-events scout tui     (captures all async operations)
 * - LOG_FILE=debug.log scout tui      (enables file logging)
 */

import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { performance } from 'perf_hooks';

// Global performance markers
const markers: Map<string, number> = new Map();

// Queue for non-blocking file writes
const logQueue: string[] = [];
let isWriting = false;
let flushScheduled = false;
let logFile: string | null = null;

/**
 * Initialize diagnostics - must be called on startup
 */
export async function initDiagnostics() {
  // Check if logging is enabled via env var
  const enableLogging = process.env.LOG_FILE || process.env.DEBUG_LOG;

  if (enableLogging) {
    const filename = typeof enableLogging === 'string' ? enableLogging : 'scout-debug.log';
    logFile = join(homedir(), '.ceregrep', filename);

    try {
      await fs.mkdir(join(homedir(), '.ceregrep'), { recursive: true });
      await fs.writeFile(logFile, `=== Scout Debug Log Started ${new Date().toISOString()} ===\n`);
      // Silently start logging - don't print to stderr (would interfere with TUI)
    } catch (err) {
      // Silently fail - can't log init errors without interfering with TUI
    }
  }

  // Set up process event handlers for crashes
  process.on('uncaughtException', (err) => {
    const msg = `UNCAUGHT_EXCEPTION: ${err.message}\n${err.stack}\n`;
    logImmediate(msg);
    console.error('[DIAGNOSTICS] Uncaught exception logged');
  });

  process.on('unhandledRejection', (reason) => {
    const msg = `UNHANDLED_REJECTION: ${String(reason)}\n`;
    logImmediate(msg);
    console.error('[DIAGNOSTICS] Unhandled rejection logged');
  });
}

/**
 * Mark a performance point (like a breakpoint)
 * Later call measure() to see duration between two marks
 */
export function mark(name: string) {
  markers.set(name, performance.now());
  log(`MARK: ${name}`);
}

/**
 * Measure time between two marks or since a mark
 */
export function measure(name: string, startMark?: string) {
  if (startMark && markers.has(startMark)) {
    const startTime = markers.get(startMark)!;
    const endTime = performance.now();
    const duration = endTime - startTime;
    log(`MEASURE: ${name} - ${duration.toFixed(2)}ms (from ${startMark})`);
    return duration;
  } else {
    log(`MEASURE: ${name} - no start mark`);
    return 0;
  }
}

/**
 * Get stack trace with file:line info
 */
function getStackTrace(depth: number = 2): string {
  const stack = new Error().stack || '';
  const lines = stack.split('\n').slice(2, 2 + depth); // Skip Error and getStackTrace
  const traces = lines
    .map(line => {
      const match = line.match(/at (.+) \((.+?):(\d+):\d+\)/);
      if (match) {
        const [, func, file, lineNum] = match;
        const shortFile = file.split('/').slice(-2).join('/'); // Last 2 path segments (shorter)
        return `${shortFile}:${lineNum}`;
      }
      return '';
    })
    .filter(t => t && !t.includes('diagnostics.ts'));
  return traces.length > 0 ? ` [${traces.join(' ← ')}]` : '';
}

/**
 * Log event with timestamp and stack trace (non-blocking queue-based)
 * NOTE: Does NOT write to stderr in TUI mode to avoid flicker
 */
export function log(message: string, includeStack: boolean = true) {
  const timestamp = new Date().toISOString();
  const stack = includeStack ? getStackTrace(4) : '';
  const line = `[${timestamp}] ${message}${stack}\n`;

  // Queue for file write only (no stderr to avoid TUI flicker)
  if (logFile) {
    logQueue.push(line);
    // Only schedule one flush at a time to prevent callback accumulation
    if (!flushScheduled && !isWriting) {
      flushScheduled = true;
      setImmediate(() => {
        flushScheduled = false;
        flushLogQueue();
      });
    }
  }
}

/**
 * Immediate synchronous log for critical errors
 */
function logImmediate(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  process.stderr.write(line);

  if (logFile) {
    try {
      // Use synchronous write for critical errors
      require('fs').appendFileSync(logFile, line);
    } catch (err) {
      process.stderr.write(`Failed to write to log file: ${err}\n`);
    }
  }
}

/**
 * Flush queued logs to file (non-blocking)
 */
async function flushLogQueue() {
  if (isWriting || logQueue.length === 0 || !logFile) return;

  isWriting = true;
  try {
    // Batch write queued logs - take all available
    const linesToWrite = logQueue.splice(0, logQueue.length);
    if (linesToWrite.length > 0) {
      await fs.appendFile(logFile, linesToWrite.join(''));
    }
  } catch (err) {
    // Silently fail - don't write to stderr (would interfere with TUI)
  } finally {
    isWriting = false;

    // If more queued while we were writing, reschedule flush
    if (logQueue.length > 0) {
      flushScheduled = true;
      setImmediate(() => {
        flushScheduled = false;
        flushLogQueue();
      });
    }
  }
}

/**
 * Trace async function execution
 * Shows when function starts/completes and duration
 */
export function traceAsync<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return (async (...args: any[]) => {
    const startMark = `${name}-start`;
    mark(startMark);
    log(`ASYNC_START: ${name}`);

    try {
      const result = await fn(...args);
      const duration = measure(`${name}-complete`, startMark);
      log(`ASYNC_COMPLETE: ${name} (${duration.toFixed(2)}ms)`);
      return result;
    } catch (err) {
      const duration = measure(`${name}-error`, startMark);
      log(`ASYNC_ERROR: ${name} after ${duration.toFixed(2)}ms - ${String(err)}`);
      throw err;
    }
  }) as T;
}

/**
 * Trace synchronous function execution
 */
export function traceSync<T extends (...args: any[]) => any>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const startMark = `${name}-sync-start`;
    mark(startMark);
    log(`SYNC_START: ${name}`);

    try {
      const result = fn(...args);
      const duration = measure(`${name}-sync-complete`, startMark);
      log(`SYNC_COMPLETE: ${name} (${duration.toFixed(2)}ms)`);
      return result;
    } catch (err) {
      const duration = measure(`${name}-sync-error`, startMark);
      log(`SYNC_ERROR: ${name} after ${duration.toFixed(2)}ms - ${String(err)}`);
      throw err;
    }
  }) as T;
}

/**
 * Get memory usage snapshot
 */
export function logMemory(label: string) {
  if (typeof global.gc === 'function') {
    global.gc();
  }

  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const externalMB = Math.round(mem.external / 1024 / 1024);

  log(`MEMORY [${label}]: ${heapUsedMB}/${heapTotalMB}MB (${heapUsedMB / heapTotalMB * 100 | 0}%) external: ${externalMB}MB`);
}

/**
 * Log event with automatic duration if it takes too long
 */
export function logWithThreshold(message: string, durationMs: number, thresholdMs: number = 16) {
  if (durationMs > thresholdMs) {
    log(`SLOW: ${message} (${durationMs.toFixed(2)}ms, threshold: ${thresholdMs}ms)`);
  }
}
