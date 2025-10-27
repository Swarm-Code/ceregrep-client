# Enterprise Diagnostics Guide

Scout now includes enterprise-grade diagnostics using Node.js built-in tools. This replaces the slow in-UI debug panel with fast, non-blocking logging to stderr and files.

## Quick Start

### 1. **File Logging (Recommended)**

Enable logging to file and run Scout:

```bash
LOG_FILE=scout-debug.log scout tui
```

This creates `~/.ceregrep/scout-debug.log` with all diagnostics. The file writing is **async and non-blocking** - it won't impact performance.

### 2. **Real-time Monitoring**

In another terminal, watch the log file in real-time:

```bash
# macOS/Linux
tail -f ~/.ceregrep/scout-debug.log

# Or use a smarter log viewer
less +F ~/.ceregrep/scout-debug.log
```

### 3. **Chrome DevTools Inspection** (Advanced)

Attach the Node.js debugger:

```bash
node --inspect scout tui
```

Then open `chrome://inspect` in Chrome and click "Inspect" to get full breakpoints, profiling, and memory inspection.

---

## Log Output Format

All logs go to stderr in this format:

```
[2024-10-27T15:30:45.123Z] EVENT_TYPE: message details (duration_ms)
```

### Example Output

```
[2024-10-27T15:30:45.123Z] INPUT_CHANGE: len=5
[2024-10-27T15:30:45.124Z] KEYSTROKE: len=5 (2.34ms)
[2024-10-27T15:30:45.150Z] COMPLETION: @ mention "fi"
[2024-10-27T15:30:45.152Z] FILE_LOAD: loading files and MCP resources...
[2024-10-27T15:30:45.523Z] FILE_LOAD_COMPLETE: 250 resources (371ms)
[2024-10-27T15:30:45.524Z] COMPLETION_FILTERED: 12 matches in 372.14ms
[2024-10-27T15:30:46.100Z] STREAM: queryStream started
[2024-10-27T15:30:48.450Z] BATCH_UPDATE: 5 msgs after 300ms
[2024-10-27T15:30:48.750Z] BATCH_UPDATE: 3 msgs after 300ms
[2024-10-27T15:30:49.050Z] BATCH_UPDATE: 4 msgs after 300ms
[2024-10-27T15:30:49.100Z] STREAM_FINAL_FLUSH: 2 msgs
[2024-10-27T15:30:49.150Z] STREAM_COMPLETE: 14 messages in 3050.12ms
[2024-10-27T15:30:49.160Z] MEMORY [after-stream]: 245/8192MB (3%) external: 15MB
```

---

## Performance Thresholds

The system automatically logs SLOW events when operations exceed these thresholds:

| Event Type | Threshold | Purpose |
|---|---|---|
| KEYSTROKE | 5ms | Input lag detection |
| FILE_LOAD | 50ms | File operation slowness |
| All others | Default 16ms | Frame time (60fps) |

If a keystroke takes 10ms, you'll see:
```
[TIME] SLOW: KEYSTROKE: len=5 (10.50ms, threshold: 5ms)
```

---

## Diagnostic Events

### Input Events
- **INPUT_CHANGE**: When App.handleInputChange is called
- **KEYSTROKE**: Actual keystroke in InputBox, including duration

### Completion Events
- **COMPLETION**: @ mention pattern detected
- **FILE_LOAD**: Starting file/MCP resource loading
- **FILE_LOAD_COMPLETE**: Finished loading with count and duration
- **COMPLETION_FILTERED**: Fuzzy filtering complete with match count
- **COMPLETION_ERROR**: Error during file loading

### Streaming Events
- **STREAM**: queryStream started
- **BATCH_UPDATE**: State batch update with count and time since last update
- **STREAM_FINAL_FLUSH**: Final state flush before saving
- **STREAM_COMPLETE**: Entire stream finished with message count and total duration

### Memory Events
- **MEMORY**: Heap usage snapshot (heapUsed/heapTotal MB and percentage)

### Performance Events
- **SLOW**: Any operation exceeding its threshold

### Marks & Measures (Advanced)
- **MARK**: Manual performance mark set by code
- **MEASURE**: Duration between two marks

---

## Debugging Input Lag

To find where input lag comes from:

1. Enable logging:
   ```bash
   LOG_FILE=scout-debug.log scout tui
   ```

2. Type normally in the TUI and press Enter

3. Check the log for SLOW events:
   ```bash
   grep "SLOW\|KEYSTROKE\|INPUT_CHANGE" ~/.ceregrep/scout-debug.log | tail -20
   ```

4. Look for patterns:
   - **Multiple SLOW KEYSTROKE events** = Ink rendering bottleneck
   - **SLOW INPUT_CHANGE** = Parent state update is slow
   - **SLOW FILE_LOAD** = File operations blocking
   - **SLOW COMPLETION_FILTERED** = Fuzzy matching expensive

---

## Memory Profiling

To see heap usage over time:

```bash
LOG_FILE=scout-debug.log scout tui
```

Then in another terminal:

```bash
grep "MEMORY" ~/.ceregrep/scout-debug.log
```

Example:
```
[TIME] MEMORY [after-stream]: 245/8192MB (3%) external: 15MB
[TIME] MEMORY [after-long-conversation]: 1245/8192MB (15%) external: 85MB
```

The `(15%)` shows heap usage percentage. If it reaches 85%+, you'll get the orange/red heap warning in the status bar.

---

## Advanced: Chrome DevTools Performance Profiling

1. Start Scout with inspector:
   ```bash
   node --inspect scout tui
   ```

2. Open Chrome and navigate to `chrome://inspect`

3. Click "Inspect" under "Local Host"

4. Go to "Performance" tab and start recording

5. Type in Scout and interact with features

6. Stop recording and analyze the flame graph

7. Look for:
   - Long main thread tasks (blocked event loop)
   - Functions taking >16ms (frame time)
   - Memory allocation patterns
   - GC pauses

---

## Advanced: Node.js Tracing

For detailed async tracing:

```bash
node --trace-events-enabled scout tui
```

This creates a `trace_events.json` file that can be opened in Chrome DevTools timeline.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `LOG_FILE=scout-debug.log` | Enable file logging to ~/.ceregrep/ |
| `DEBUG_LOG` | Alias for LOG_FILE |
| `NODE_DEBUG=*` | Enable all Node.js internal debug logging |
| `DEBUG=scout:*` | Enable debug module logging (if used) |

---

## Tips

1. **Real-time log watching is best** for seeing what's slow
2. **Grep for SLOW** to find performance issues: `grep SLOW ~/.ceregrep/scout-debug.log`
3. **Check after-stream MEMORY** to see conversation impact
4. **Compare KEYSTROKE times** - first keystroke often slower than subsequent ones
5. **FILE_LOAD duration** tells you if file operations are the bottleneck

---

## Implementation Details

All diagnostics are implemented in `/tui/utils/diagnostics.ts`:

- `log(message)` - Write to stderr and queue for file
- `mark(name)` - Set a performance mark
- `measure(name, startMark)` - Calculate duration between marks
- `logMemory(label)` - Snapshot current heap usage
- `logWithThreshold(message, duration, threshold)` - Auto-log if slow

These are **non-blocking**:
- Stderr writes happen immediately
- File writes are async and queued (up to 100 lines per flush)
- No UI impact whatsoever
