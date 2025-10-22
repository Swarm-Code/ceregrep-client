# Shell Mode Integration - Complete Implementation

This document describes the complete implementation of shell mode in the ceregrep TUI, enabling seamless interactive terminal passthrough when the bash tool spawns a PTY process.

## Overview

Shell mode transforms the TUI into a full terminal passthrough when a bash command with PTY is running. This provides a native terminal experience while maintaining the TUI's structure and allowing users to exit back to normal chat mode.

## Architecture

### Components Created

#### 1. **ShellInputPrompt** (`tui/components/ShellInputPrompt.tsx`)
- **Purpose**: Invisible component that captures all keyboard input in shell mode
- **Features**:
  - Converts Ink key events to ANSI sequences using `keyToAnsi` utility
  - Forwards input directly to active PTY process
  - Monitors PTY status and auto-exits if process terminates
  - Supports double Ctrl+C to exit (first Ctrl+C goes to PTY, second exits shell mode)
  - Allows Escape key to exit shell mode
- **Renders**: `null` (invisible, only handles input)

#### 2. **AnsiOutputText** (`tui/components/AnsiOutputText.tsx`)
- **Purpose**: Renders ANSI-formatted terminal output with styling
- **Features**:
  - Renders `AnsiOutput` data structure from `terminalSerializer`
  - Preserves all formatting: colors, bold, italic, underline, dim, inverse
  - Supports scrolling with `scrollOffset` and `maxLines` props
  - Helper function `isAnsiOutput()` to detect ANSI data
- **Renders**: Formatted terminal output with proper styling

### Integration Points in App.tsx

#### 1. **Shell Mode State Management**
```typescript
const [shellMode, setShellMode] = useState(false);
const [activeShellPid, setActiveShellPid] = useState<number | null>(null);
const shellModeCheckInterval = useRef<NodeJS.Timeout | null>(null);
```

#### 2. **Active Shell Detection (useEffect)**
- Runs every 500ms to check for active PTY processes
- Scans conversation messages for bash tool executions with PIDs
- Verifies PTY is still active using `ShellExecutionService.isPtyActive(pid)`
- Automatically enters/exits shell mode based on PTY status
- **Key Logic**:
  - Checks latest assistant message for `Bash` tool use
  - Scans user messages (tool results) for PIDs
  - Validates PID is still running before entering shell mode
  - Auto-exits shell mode when process completes

#### 3. **Keyboard Handling Update**
- Escape key priority:
  1. **If in shell mode**: Exit shell mode (return to chat)
  2. **If streaming**: Abort agent execution
  3. **Otherwise**: Normal behavior
- Shell mode takes precedence over other keyboard shortcuts

#### 4. **UI Updates**

##### Shell Mode Indicator
```tsx
{shellMode && activeShellPid && (
  <Box marginBottom={1} borderStyle="round" borderColor="green" padding={1}>
    <Text bold color="green">
      [SHELL MODE] Interactive terminal (PID: {activeShellPid}) | Press Escape to exit
    </Text>
  </Box>
)}
```

##### Input Routing
```tsx
{/* Shell Mode Input Prompt (invisible, captures keyboard) */}
{shellMode && activeShellPid && (
  <ShellInputPrompt
    pid={activeShellPid}
    onExit={() => {
      setShellMode(false);
      setActiveShellPid(null);
    }}
  />
)}

{/* Input Box - only show when NOT in shell mode */}
{!shellMode && (
  <InputBox ... />
)}
```

##### Status Bar Integration
- Added `shellMode` and `shellPid` props to StatusBar
- Shows `[SHELL] PID:xxx` instead of mode/model when in shell mode
- Visual indicator in green color (`#10B981`)

### Enhanced Components

#### MessageList.tsx Updates
- Added `AnsiOutputText` import and `isAnsiOutput` helper
- Updated `ToolExecution` component to detect and render ANSI output
- **Detection**: Checks if `toolOutput` is `AnsiOutput` format
- **Rendering**: Uses `AnsiOutputText` for ANSI data, plain text for regular output
- Maintains existing truncation and verbose mode logic

#### StatusBar.tsx Updates
- Added `shellMode?: boolean` and `shellPid?: number` props
- Right side shows shell status when active:
  ```tsx
  {shellMode && shellPid ? (
    <>
      <Text color="#10B981" bold>[SHELL]</Text>
      <Text color={DIM_WHITE}> PID:{shellPid}</Text>
    </>
  ) : (
    // Normal mode/model display
  )}
  ```

## Key Integration Features

### 1. **Seamless Mode Switching**
- **Entering Shell Mode**:
  - Automatic when bash tool spawns PTY process
  - Detected via PID in tool result data
  - Verified PID is active before switching
- **Exiting Shell Mode**:
  - User presses Escape
  - User presses Ctrl+C twice quickly
  - Process exits/terminates
  - Auto-detected every 500ms

### 2. **Input Passthrough**
- All keyboard input goes directly to PTY in shell mode
- Uses `keyToAnsi` utility for proper ANSI conversion
- Supports:
  - Arrow keys (navigation)
  - Control keys (Ctrl+C, Ctrl+D, Ctrl+L, etc.)
  - Function keys (F1-F12)
  - Text input
  - Modifier combinations (Ctrl+Arrow, Alt+Arrow, Shift+Arrow)

### 3. **Output Rendering**
- **ANSI Output**: Rendered with full formatting via `AnsiOutputText`
  - Colors (foreground and background)
  - Text styling (bold, italic, underline, dim, inverse)
  - Proper line-by-line rendering
- **Plain Text**: Rendered as before for non-ANSI output
- **Auto-detection**: Uses `isAnsiOutput()` to determine format

### 4. **Process Lifecycle Management**
- PTY processes tracked in `ShellExecutionService.activePtys`
- PIDs stored in tool result data
- Active status verified with `process.kill(pid, 0)` signal
- Auto-cleanup when process exits
- Graceful handling of terminated processes

## Usage Flow

### Normal Operation
1. User asks agent to run a bash command
2. Agent uses Bash tool with PTY support
3. Bash tool executes via `ShellExecutionService.execute()`
4. PTY spawned with PID tracked in `activePtys` map
5. Tool result includes PID in data
6. TUI detects active PID and enters shell mode
7. **Shell Mode Active**:
   - Green indicator shown
   - Status bar shows `[SHELL] PID:xxx`
   - Input captured by `ShellInputPrompt`
   - Output rendered with `AnsiOutputText` (if ANSI) or plain text
8. User interacts with terminal directly
9. Process completes or user presses Escape
10. TUI exits shell mode back to chat

### Example Commands
```bash
# Interactive shell
"run htop"
# User can navigate with arrow keys, quit with 'q'

# Interactive editor
"edit file.txt with vim"
# User gets full vim interface

# Long-running process
"watch -n 1 date"
# User sees live updates, can Ctrl+C to stop
```

## Implementation Details

### Shell Mode Detection Algorithm
```typescript
// Every 500ms:
1. Get latest message from currentBranch
2. Check if message is assistant with Bash tool use
3. Scan backwards through user messages for tool results
4. Extract PID from toolUseResult.data
5. Verify PID is active: ShellExecutionService.isPtyActive(pid)
6. If active && !shellMode: setShellMode(true), setActiveShellPid(pid)
7. If !active && shellMode: setShellMode(false), setActiveShellPid(null)
```

### Input Forwarding Flow
```typescript
// In ShellInputPrompt:
1. useInput captures key event: (input, key)
2. Check for exit conditions (Escape, double Ctrl+C)
3. Convert to ANSI: const ansi = keyToAnsi(input, key)
4. Send to PTY: ShellExecutionService.writeToPty(pid, ansi)
5. If write fails: Exit shell mode
6. PTY processes input and generates output
7. Output captured by ShellExecutionService
8. Rendered in MessageList as AnsiOutput
```

### Output Rendering Flow
```typescript
// In ToolExecution component:
1. Receive toolOutput (string | AnsiOutput)
2. Check format: isAnsiOutput(toolOutput)
3. If AnsiOutput:
   - Render with <AnsiOutputText output={toolOutput} />
   - Full ANSI styling preserved
4. If string:
   - Render as plain text
   - Apply existing truncation logic
```

## Benefits

### 1. **Native Terminal Experience**
- Full PTY support with proper ANSI handling
- All terminal features work: colors, cursor movement, screen clearing
- Interactive programs work seamlessly: vim, nano, htop, etc.

### 2. **Seamless Integration**
- No special commands needed
- Automatic detection and switching
- Clear visual indicators
- Easy exit (Escape key)

### 3. **Maintains TUI Structure**
- Status bar still visible
- Easy to exit back to chat
- Conversation history preserved
- Tool execution tracking maintained

### 4. **Robust Error Handling**
- Auto-exits if PTY dies
- Handles failed writes gracefully
- Validates PID before entering shell mode
- Cleans up properly on exit

## Testing

### Manual Testing Checklist
- [ ] Run interactive command (e.g., `htop`)
- [ ] Verify shell mode indicator appears
- [ ] Test arrow key navigation
- [ ] Test Ctrl+C (first goes to PTY, second exits)
- [ ] Test Escape to exit shell mode
- [ ] Verify output has colors and formatting
- [ ] Test process exit auto-exits shell mode
- [ ] Test multiple shell commands in sequence
- [ ] Verify status bar updates correctly
- [ ] Test with long-running processes

### Key Test Commands
```bash
# Interactive programs
htop
top
vim test.txt
nano test.txt

# Live updates
watch -n 1 date
tail -f /var/log/syslog

# Color output
ls --color=auto
git status

# Control sequences
echo -e "\033[31mRed\033[0m \033[32mGreen\033[0m \033[34mBlue\033[0m"
```

## References

### Related Files
- `/tui/components/ShellInputPrompt.tsx` - Shell mode input handler
- `/tui/components/AnsiOutputText.tsx` - ANSI output renderer
- `/tui/components/App.tsx` - Main integration logic
- `/tui/components/MessageList.tsx` - Enhanced tool output rendering
- `/tui/components/StatusBar.tsx` - Shell mode status display
- `/tui/utils/keyToAnsi.ts` - Key to ANSI conversion utility
- `/services/shell-execution.ts` - PTY process management
- `/utils/terminalSerializer.ts` - Terminal output serialization
- `/tools/bash.ts` - Bash tool with PTY support

### Key Utilities
- `keyToAnsi(input, key)` - Converts Ink keys to ANSI sequences
- `isAnsiOutput(data)` - Checks if data is AnsiOutput format
- `ShellExecutionService.isPtyActive(pid)` - Verifies PTY is running
- `ShellExecutionService.writeToPty(pid, input)` - Writes to PTY
- `serializeTerminalToObject(terminal)` - Converts terminal to AnsiOutput

## Future Enhancements

### Potential Improvements
1. **Scrollback Support**
   - Add scroll offset state
   - Ctrl+Shift+Up/Down to scroll
   - Show scroll indicator

2. **Shell History**
   - Persist shell mode sessions
   - Allow reconnecting to running processes
   - Session management UI

3. **Multiple Shells**
   - Support multiple concurrent shell sessions
   - Tab switching between shells
   - Shell session list

4. **Enhanced Status**
   - Show shell command in status
   - Display shell uptime
   - Process resource usage

5. **Configuration**
   - Custom keybindings for shell mode
   - Color scheme preferences
   - Shell mode behavior options

## Conclusion

The shell mode integration provides a seamless bridge between the chat interface and interactive terminal sessions. By leveraging the existing PTY infrastructure and adding minimal UI components, we've created a powerful feature that enhances the TUI's capabilities while maintaining its core functionality.

The implementation follows Gemini CLI's approach but is adapted to our specific architecture, using Ink components and our existing services. The result is a robust, user-friendly shell mode that feels natural and integrates perfectly with the conversation flow.
