# Memory Profiling Guide for Scout TUI

Scout includes **production-grade memory profiling** based on industry best practices. This guide covers how to use these tools to detect and fix memory issues before they become production emergencies.

> ⚠️ **Memory profiling is OPT-IN** to avoid overhead in normal operation. Enable it only when debugging memory issues.

## Quick Start

### Enable Memory Profiling

Memory profiling is disabled by default. Enable it by setting an environment variable:

```bash
MEMORY_PROFILE=1 scout tui
```

When enabled, profiling:
1. **Captures baseline** - Records initial heap and RSS on startup
2. **Monitors continuously** - Checks every 5 seconds for problematic patterns
3. **Detects alerts** - Warns of memory leaks, GC churn, or excessive growth
4. **Logs to file** - Writes critical alerts to `~/.ceregrep/memory-alerts.jsonl`

### View Memory Status During Operation

Press **`Ctrl+M`** to open the Memory Status Panel:
```
┌─ Memory Status ──────────────────┐
│ Heap: 245MB / 512MB peak (+15%)  │
│ RSS:  456MB / 789MB peak (+12%)  │
│ ⚠ Suspected leak: Heap grown...  │
│                                   │
│ Ctrl+M to close • Ctrl+G for     │
│ full report                       │
└──────────────────────────────────┘
```

### Generate Full Memory Report

Press **`Ctrl+G`** to dump a complete memory report to console:
```
Memory Profiler Report
======================
Baseline Heap:       245MB
Current Peak Heap:   512MB
Current Heap Growth: 109%
Baseline RSS:        456MB
Current Peak RSS:    789MB
Current RSS Growth:  73%
GC Collections:      143
Average GC Time:     8.5ms

Recent Alerts:
  [warning] suspected_leak: Heap grown 50% from baseline
  [critical] heap_growth: Heap exceeded 6144MB threshold: 6250MB
```

## Understanding Memory Issues

### The Problem: Node.js Memory at Scale

Node.js runs on a **single thread** with a **V8-managed heap**. This means:
- Memory leaks accumulate over time
- You can't "thread away" a leak
- Slow leaks can still cost millions in cloud bills (autoscaling gone wild)
- By the time users report slowdowns, memory is already critical

### Why These Metrics Matter

| Metric | What It Tells You |
|--------|-------------------|
| **Heap Growth %** | Is memory being retained? (>50% = suspect) |
| **RSS Growth %** | Is the whole process getting bigger? (>50% = concern) |
| **GC Frequency** | Is garbage collection running too often? (>every 100ms = churn) |
| **GC Duration** | Are GC pauses long? (>50ms = noticeable slowdown) |
| **Peak Heap** | What's the worst case memory usage? (helps sizing containers) |

## Alert Types

Scout automatically raises alerts for these conditions:

### 1. Suspected Memory Leak
```
[warning] suspected_leak: Heap grown 75% from baseline
```
**What it means:** Heap is significantly larger than at startup without stabilizing.

**Why it matters:** Could indicate objects being held in memory unnecessarily (event listeners, caches, closures).

**What to do:**
- Take heap snapshots before/after the operation
- Use Chrome DevTools to find "Retainers" of large objects
- Check for event listeners that aren't cleaned up

### 2. Heap Growth Threshold
```
[critical] heap_growth: Heap exceeded 6144MB threshold: 6250MB
```
**What it means:** Total heap usage exceeded the warning threshold (default 6GB).

**Why it matters:** System is running low on available memory. Next large allocation could crash the process.

**What to do:**
- Immediately check what's consuming memory (heap snapshot)
- Look for unbounded arrays, caches without eviction
- Consider restarting the process or scaling up

### 3. RSS Growth (Resident Memory)
```
[warning] rss_limit: RSS grown 65% from baseline
```
**What it means:** The full process memory (not just heap) is growing.

**Why it matters:** Could indicate native module memory leaks or fragmentation.

**What to do:**
- Compare heap growth vs RSS growth
- If RSS >> Heap, suspect native modules or buffer leaks
- Check third-party dependencies with native bindings

## Techniques for Finding Memory Leaks

### Technique 1: Monitor Debug Log During Suspect Actions
```bash
# In one terminal, enable logging and memory profiling
MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui

# In another terminal, watch for memory alerts in real-time
tail -f ~/.ceregrep/scout-debug.log | grep -E "MEMORY|ALERT"
```

The log will show memory state before and after operations, immediately flagging if something leaks.

### Technique 2: Analyze Memory Alerts File
```bash
# View all critical memory alerts
cat ~/.ceregrep/memory-alerts.jsonl | jq

# Find when heap growth started
grep -n "heap_growth" ~/.ceregrep/memory-alerts.jsonl | head -5

# Get a timeline of growth
jq '.timestamp, .heapUsedMB' ~/.ceregrep/memory-alerts.jsonl | paste - -
```

The alerts file gives you a complete timeline of what happened and when.

### Technique 3: Compare Memory States Between Sessions
```bash
# Session 1: Run with specific action
rm ~/.ceregrep/scout-debug.log
MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui
# [Do the action]
# [Exit]

# Extract final state
grep "MEMORY_SNAPSHOT" ~/.ceregrep/scout-debug.log | tail -1

# Session 2: Run without the action
rm ~/.ceregrep/scout-debug.log
MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui
# [Don't do the action]
# [Exit after same duration]

# Compare
diff <(grep "MEMORY_SNAPSHOT" session1.log | tail -1) \
     <(grep "MEMORY_SNAPSHOT" session2.log | tail -1)
```

If memory is higher in session 1, you found your leak.

### Technique 4: Node.js Inspector with Heap Snapshots
```bash
# Start Scout with V8 inspector enabled
node --inspect dist/bin/index.js tui

# In a separate terminal, connect via node inspector
node --stdin < /dev/null --eval "
  const inspector = require('inspector').Session();
  inspector.connect();
  // Can programmatically trigger heap snapshots
"

# Or use the heapdump module approach:
# Snapshots are saved to ~/.ceregrep/heapdumps/
```

Inspector allows low-level memory analysis without a browser.

### Technique 5: Real-World Case Study
A fintech company experienced memory pressure after a week of operation:

**Symptoms:**
- GC time increased from 50ms → 900ms
- Heap plateaued at 6GB (should be 500MB)
- Autoscaling kicking in constantly

**Root cause (found via heap snapshot):**
- In-memory LRU cache for API responses
- Cache eviction broken for specific query param combinations
- Thousands of entries accumulating

**Fix:**
- Add TTL expiration: `cache.set(key, value, { ttl: 3600 })`
- Memory cap: `cache.maxSize = 10000`

**Result:**
- GC time dropped 90% (900ms → 50ms)
- Heap dropped 75% (6GB → 1.5GB)
- Autoscaling no longer needed

## Common Pitfalls (And How to Avoid)

### ❌ Anonymous Closures Holding State
```javascript
// BAD: Closure captures entire component context
const listeners = [];
document.addEventListener('click', () => {
  // This closure captures `document` and much more
  listeners.push({ timestamp: Date.now() });
});
```

**Solution:** Bind specific values only:
```javascript
// GOOD: Bind only what you need
const onClick = (timestamp) => listeners.push(timestamp);
document.addEventListener('click', () => onClick(Date.now()));
```

### ❌ Global Variables and Caching Gone Rogue
```javascript
// BAD: Unbounded cache
const cache = {};
function getValue(key) {
  if (!cache[key]) {
    cache[key] = expensiveComputation(key); // Never evicted!
  }
  return cache[key];
}
```

**Solution:** Use libraries with eviction:
```javascript
// GOOD: LRU cache with size limit
const cache = new LRU({ max: 1000 });
function getValue(key) {
  if (!cache.has(key)) {
    cache.set(key, expensiveComputation(key));
  }
  return cache.get(key);
}
```

### ❌ Uncleared Event Listeners
```javascript
// BAD: Listener never removed
function Component() {
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Missing cleanup!
  }, []);
}
```

**Solution:** Clean up on unmount:
```javascript
// GOOD: Cleanup listener
function Component() {
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
}
```

### ❌ Unbounded Queues or Arrays
```javascript
// BAD: Queue grows forever
const logQueue = [];
function log(msg) {
  logQueue.push(msg); // If flush fails, queue leaks!
}
```

**Solution:** Cap the queue size:
```javascript
// GOOD: Bounded queue with overflow protection
const logQueue = [];
const MAX_QUEUE = 10000;
function log(msg) {
  if (logQueue.length >= MAX_QUEUE) {
    logQueue.shift(); // Drop oldest if full
  }
  logQueue.push(msg);
}
```

## Environment Variables

Control Scout's memory profiling and debugging:

```bash
# ENABLE MEMORY PROFILING (disabled by default)
MEMORY_PROFILE=1 scout tui

# Enable diagnostic logging (shows keystroke/stream events)
LOG_FILE=scout-debug.log scout tui

# Combine both for full debugging
MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui

# Adjust heap allocation for testing (default 8GB)
node --max-old-space-size=4096 dist/bin/index.js tui

# Enable garbage collection tracking (may impact performance)
node --expose-gc dist/bin/index.js tui

# Enable V8 inspector for deeper analysis
node --inspect dist/bin/index.js tui
# Then use: node -e "require('inspector').open(9229)"
```

**Recommended for Production Debugging:**
```bash
MEMORY_PROFILE=1 LOG_FILE=scout-debug.log scout tui
```

This captures memory alerts and full operation logs with minimal overhead.

## Best Practices for Production

1. **Set memory limits in containers:**
   ```yaml
   resources:
     limits:
       memory: "8Gi"
       cpu: "2"
   ```

2. **Monitor heap usage over time:**
   - Use APM tools (Datadog, New Relic, etc.)
   - Alert if heap growth > 30% in 1 hour
   - Alert if peak RSS > 80% of limit

3. **Trigger heap snapshots on alerts:**
   ```javascript
   if (heapGrowth > 50) {
     takeHeapSnapshot(`leak-${Date.now()}.heapsnapshot`);
   }
   ```

4. **Run periodic load tests:**
   - Don't wait until prod to discover leaks
   - Test under realistic load for 1+ hours
   - Watch memory stabilize (or identify the culprit)

5. **Instrument custom metrics:**
   ```javascript
   const metrics = profiler.getMetrics();
   prometheus.gauge('nodejs_heap_growth_percent', metrics.currentHeapGrowth);
   prometheus.gauge('nodejs_gc_duration_ms', metrics.averageGCDuration);
   ```

## Reading the Debug Log

Scout logs memory events to `~/.ceregrep/scout-debug.log`:

```
[2025-10-27T20:53:35.833Z] MEMORY_PROFILER_INIT: baseline heap=245.3MB rss=456.2MB
[2025-10-27T20:53:40.123Z] MEMORY_SNAPSHOT[after-stream]: heap=312.5MB rss=478.9MB
[2025-10-27T20:54:15.234Z] MEMORY_ALERT[warning]: suspected_leak - Heap grown 50% from baseline
[2025-10-27T20:54:20.345Z] MEMORY_ALERT[critical]: heap_growth - Heap exceeded 6144MB threshold: 6250MB
```

### Log Analysis Commands

```bash
# See all memory events
grep "MEMORY" ~/.ceregrep/scout-debug.log

# Count alerts by type
grep "MEMORY_ALERT" ~/.ceregrep/scout-debug.log | wc -l

# Find critical alerts
grep "critical" ~/.ceregrep/scout-debug.log

# Watch memory growth in real-time
tail -f ~/.ceregrep/scout-debug.log | grep MEMORY
```

## Troubleshooting

### "Memory keeps growing but I don't see alerts"
- Alerts only trigger on significant growth (>50%)
- Check `~/.ceregrep/memory-alerts.jsonl` for critical events
- Press Ctrl+G to see current growth percentage

### "Heap drops but RSS stays high"
- Heap is garbage collected, but OS doesn't reclaim memory immediately
- This is normal. Watch for patterns over 5+ minutes
- If RSS never comes down, suspect memory fragmentation

### "Peak heap is much higher than current heap"
- This is expected. Peak is high-water mark during operation
- Useful for container sizing (should be ~60% of container limit)
- Don't panic unless peak keeps increasing

## Resources

- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Chrome DevTools Heap Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [V8 Garbage Collection](https://v8.dev/blog/trash-talk)
- [Real-world case studies in performance profiling](https://engineering.fb.com/2016/11/21/android/memory/)

## Summary

Memory profiling is not an optimization — it's a survival tool. With Scout's built-in profiler:
- ✅ You catch leaks before they hit production
- ✅ You understand your real memory footprint
- ✅ You debug with data, not guesswork
- ✅ You sleep better (fewer 3am pages)

Use it. Your infrastructure will thank you.
