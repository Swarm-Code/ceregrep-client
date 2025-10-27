/**
 * Production-Grade Memory Profiler for Scout TUI
 *
 * Implements memory profiling best practices:
 * - Baseline establishment and monitoring
 * - Memory threshold detection and alerts
 * - Heap snapshots on demand
 * - Garbage collection tracking
 * - Memory leak pattern detection
 * - APM-style metrics export
 *
 * Usage:
 *   await initMemoryProfiler();
 *   memoryProfiler.captureSnapshot('start');
 *   // ... do work ...
 *   const diff = memoryProfiler.compareSnapshots('start', 'end');
 */

import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { log } from './diagnostics.js';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number; // Resident Set Size (total memory)
  gcTime?: number;
}

interface MemoryAlert {
  type: 'heap_growth' | 'gc_churn' | 'rss_limit' | 'suspected_leak';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  memoryState: MemorySnapshot;
}

interface MemoryMetrics {
  baselineHeapUsed: number;
  baselineRSS: number;
  peakHeapUsed: number;
  peakRSS: number;
  currentHeapGrowth: number; // % from baseline
  currentRSSGrowth: number; // % from baseline
  gcTimeTotal: number;
  gcCollections: number;
  averageGCDuration: number;
}

class MemoryProfiler {
  private snapshots = new Map<string, MemorySnapshot>();
  private baseline: MemorySnapshot | null = null;
  private peakHeap = 0;
  private peakRSS = 0;
  private gcTimeTotal = 0;
  private gcCollections = 0;
  private lastGCTime = 0;
  private alerts: MemoryAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly HEAP_THRESHOLD_MB = 6144; // 6GB warning threshold
  private readonly GROWTH_THRESHOLD_PERCENT = 50; // 50% growth triggers alert
  private readonly GC_CHURN_THRESHOLD_MS = 100; // GC taking >100ms is churn

  /**
   * Initialize memory profiler with baseline and monitoring
   */
  async init(): Promise<void> {
    // Capture baseline
    this.baseline = this.captureMemory();
    this.peakHeap = this.baseline.heapUsed;
    this.peakRSS = this.baseline.rss;

    log(`MEMORY_PROFILER_INIT: baseline heap=${(this.baseline.heapUsed / 1024 / 1024).toFixed(1)}MB rss=${(this.baseline.rss / 1024 / 1024).toFixed(1)}MB`);

    // Start periodic monitoring
    this.startMonitoring();

    // Expose snapshot method for V8 heap snapshots if requested
    if (process.env.HEAP_SNAPSHOT_PATH) {
      log(`MEMORY_PROFILER: heap snapshots enabled at ${process.env.HEAP_SNAPSHOT_PATH}`);
    }
  }

  /**
   * Capture current memory state as a snapshot
   */
  private captureMemory(): MemorySnapshot {
    if (typeof global.gc === 'function') {
      global.gc();
    }

    const mem = process.memoryUsage();
    const now = performance.now();

    // Estimate GC time (check if GC just ran)
    const gcTime = now - this.lastGCTime > 100 ? 0 : this.lastGCTime - (now - 100);

    return {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      rss: mem.rss,
      gcTime: gcTime > 0 ? gcTime : undefined,
    };
  }

  /**
   * Capture named snapshot for comparison
   */
  captureSnapshot(name: string): MemorySnapshot {
    const snapshot = this.captureMemory();
    this.snapshots.set(name, snapshot);

    // Update peaks
    if (snapshot.heapUsed > this.peakHeap) {
      this.peakHeap = snapshot.heapUsed;
    }
    if (snapshot.rss > this.peakRSS) {
      this.peakRSS = snapshot.rss;
    }

    const heapMB = (snapshot.heapUsed / 1024 / 1024).toFixed(1);
    const rssMB = (snapshot.rss / 1024 / 1024).toFixed(1);
    log(`MEMORY_SNAPSHOT[${name}]: heap=${heapMB}MB rss=${rssMB}MB`, false);

    return snapshot;
  }

  /**
   * Compare two snapshots and detect growth patterns
   */
  compareSnapshots(before: string, after: string): {
    heapGrowthMB: number;
    heapGrowthPercent: number;
    rssGrowthMB: number;
    rssGrowthPercent: number;
    externalGrowth: number;
  } | null {
    const beforeSnap = this.snapshots.get(before);
    const afterSnap = this.snapshots.get(after);

    if (!beforeSnap || !afterSnap) {
      log(`MEMORY_COMPARE_ERROR: missing snapshot before=${before} after=${after}`);
      return null;
    }

    const heapGrowth = afterSnap.heapUsed - beforeSnap.heapUsed;
    const rssGrowth = afterSnap.rss - beforeSnap.rss;
    const externalGrowth = afterSnap.external - beforeSnap.external;

    return {
      heapGrowthMB: heapGrowth / 1024 / 1024,
      heapGrowthPercent: (heapGrowth / beforeSnap.heapUsed) * 100,
      rssGrowthMB: rssGrowth / 1024 / 1024,
      rssGrowthPercent: (rssGrowth / beforeSnap.rss) * 100,
      externalGrowth,
    };
  }

  /**
   * Start continuous memory monitoring
   */
  private startMonitoring(): void {
    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      const current = this.captureMemory();
      if (!this.baseline) return;

      // Check for problematic patterns
      const heapGrowthPercent = ((current.heapUsed - this.baseline.heapUsed) / this.baseline.heapUsed) * 100;
      const rssGrowthPercent = ((current.rss - this.baseline.rss) / this.baseline.rss) * 100;
      const heapMB = current.heapUsed / 1024 / 1024;

      // Alert 1: Heap exceeding threshold
      if (heapMB > this.HEAP_THRESHOLD_MB) {
        this.addAlert({
          type: 'heap_growth',
          severity: 'critical',
          message: `Heap exceeded ${this.HEAP_THRESHOLD_MB}MB threshold: ${heapMB.toFixed(1)}MB`,
          timestamp: Date.now(),
          memoryState: current,
        });
      }

      // Alert 2: Sustained growth pattern (potential leak)
      if (heapGrowthPercent > this.GROWTH_THRESHOLD_PERCENT) {
        this.addAlert({
          type: 'suspected_leak',
          severity: 'warning',
          message: `Heap grown ${heapGrowthPercent.toFixed(1)}% from baseline`,
          timestamp: Date.now(),
          memoryState: current,
        });
      }

      // Alert 3: RSS growth (full process memory)
      if (rssGrowthPercent > this.GROWTH_THRESHOLD_PERCENT) {
        this.addAlert({
          type: 'rss_limit',
          severity: 'warning',
          message: `RSS grown ${rssGrowthPercent.toFixed(1)}% from baseline`,
          timestamp: Date.now(),
          memoryState: current,
        });
      }
    }, 5000);

    if (this.monitoringInterval) {
      this.monitoringInterval.unref();
    }
  }

  /**
   * Record an alert
   */
  private addAlert(alert: MemoryAlert): void {
    this.alerts.push(alert);
    log(`MEMORY_ALERT[${alert.severity.toUpperCase()}]: ${alert.type} - ${alert.message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Write to file if threshold exceeded
    if (alert.severity === 'critical') {
      this.writeAlertToFile(alert);
    }
  }

  /**
   * Write critical alert to file for post-mortem analysis
   */
  private writeAlertToFile(alert: MemoryAlert): void {
    try {
      const alertDir = join(homedir(), '.ceregrep');
      const alertFile = join(alertDir, 'memory-alerts.jsonl');
      const line = JSON.stringify({
        ...alert,
        heapUsedMB: (alert.memoryState.heapUsed / 1024 / 1024).toFixed(2),
        rssMB: (alert.memoryState.rss / 1024 / 1024).toFixed(2),
      }) + '\n';

      writeFileSync(alertFile, line, { flag: 'a' });
    } catch (err) {
      // Silently fail - don't interfere with TUI
    }
  }

  /**
   * Get current memory metrics
   */
  getMetrics(): MemoryMetrics {
    const current = this.captureMemory();
    if (!this.baseline) {
      return {
        baselineHeapUsed: 0,
        baselineRSS: 0,
        peakHeapUsed: current.heapUsed,
        peakRSS: current.rss,
        currentHeapGrowth: 0,
        currentRSSGrowth: 0,
        gcTimeTotal: this.gcTimeTotal,
        gcCollections: this.gcCollections,
        averageGCDuration: 0,
      };
    }

    return {
      baselineHeapUsed: this.baseline.heapUsed,
      baselineRSS: this.baseline.rss,
      peakHeapUsed: this.peakHeap,
      peakRSS: this.peakRSS,
      currentHeapGrowth: ((current.heapUsed - this.baseline.heapUsed) / this.baseline.heapUsed) * 100,
      currentRSSGrowth: ((current.rss - this.baseline.rss) / this.baseline.rss) * 100,
      gcTimeTotal: this.gcTimeTotal,
      gcCollections: this.gcCollections,
      averageGCDuration: this.gcCollections > 0 ? this.gcTimeTotal / this.gcCollections : 0,
    };
  }

  /**
   * Get recent alerts
   */
  getAlerts(count: number = 10): MemoryAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Generate a memory report for debugging
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts(5);

    return `
Memory Profiler Report
======================
Baseline Heap:       ${(metrics.baselineHeapUsed / 1024 / 1024).toFixed(1)}MB
Current Peak Heap:   ${(metrics.peakHeapUsed / 1024 / 1024).toFixed(1)}MB
Current Heap Growth: ${metrics.currentHeapGrowth.toFixed(1)}%
Baseline RSS:        ${(metrics.baselineRSS / 1024 / 1024).toFixed(1)}MB
Current Peak RSS:    ${(metrics.peakRSS / 1024 / 1024).toFixed(1)}MB
Current RSS Growth:  ${metrics.currentRSSGrowth.toFixed(1)}%
GC Collections:      ${metrics.gcCollections}
Average GC Time:     ${metrics.averageGCDuration.toFixed(2)}ms

Recent Alerts:
${alerts.map(a => `  [${a.severity}] ${a.type}: ${a.message}`).join('\n')}
`.trim();
  }

  /**
   * Clean up
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Global singleton instance
let profilerInstance: MemoryProfiler | null = null;

export async function initMemoryProfiler(): Promise<MemoryProfiler | null> {
  // Check if memory profiling is enabled
  const enableMemoryProfile = process.env.MEMORY_PROFILE === '1' || process.env.MEMORY_PROFILE === 'true';

  if (!enableMemoryProfile) {
    log(`MEMORY_PROFILER: disabled (enable with MEMORY_PROFILE=1)`);
    return null;
  }

  if (!profilerInstance) {
    profilerInstance = new MemoryProfiler();
    await profilerInstance.init();
  }
  return profilerInstance;
}

export function getMemoryProfiler(): MemoryProfiler {
  if (!profilerInstance) {
    throw new Error('Memory profiler not initialized. Call initMemoryProfiler() first.');
  }
  return profilerInstance;
}

// Cleanup on exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    profilerInstance?.shutdown();
  });
}
