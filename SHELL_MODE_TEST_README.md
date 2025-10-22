# Shell Mode Integration Test

This document describes the shell mode integration test and how to use it.

## Overview

The `test-shell-mode.js` script verifies that the shell mode functionality works correctly across the entire system. It tests:

1. **PTY Functionality** - Spawning processes, sending input, receiving output
2. **keyToAnsi Utility** - Converting Ink key events to ANSI escape sequences
3. **Terminal Scrolling** - Using @xterm/headless for scrollback
4. **AnsiOutput Rendering** - Structured terminal output with colors and styles
5. **Terminal Serialization** - Converting terminal state to AnsiOutput format

## Running the Test

```bash
node test-shell-mode.js
```

The test will:
- Run automated tests for all components
- Report results with color-coded output
- Display a manual testing guide at the end
- Exit with code 0 if all tests pass, 1 if any fail

## Test Components

### 1. keyToAnsi Utility Tests

Tests the conversion of Ink key events to ANSI sequences:
- Arrow keys (`↑ ↓ ← →`)
- Control combinations (`Ctrl+C`, `Ctrl+D`, `Ctrl+L`, etc.)
- Ctrl+Arrow combinations
- Special keys (`Tab`, `Enter`, `Escape`, `Backspace`, `Delete`)
- Navigation keys (`PageUp`, `PageDown`, `Home`, `End`)
- Function keys (`F1`-`F12`)
- Regular characters

### 2. PTY Basic Functionality Tests

Tests basic pseudo-terminal operations:
- Spawning a simple command via PTY
- Verifying PID assignment
- Capturing output
- Verifying exit codes

### 3. PTY Interactive Input Tests

Tests interactive PTY communication:
- Spawning an interactive bash shell
- Sending commands via `write()`
- Receiving and verifying output
- Clean process termination

### 4. PTY Scrolling Tests

Tests terminal scrollback functionality:
- Creating a headless terminal
- Writing more lines than fit on screen
- Testing scroll up/down operations
- Testing scroll to top/bottom
- Verifying viewport changes

### 5. AnsiOutput Structure Tests

Tests the AnsiOutput data structure:
- Creating sample AnsiOutput with colors and styles
- Validating structure (lines, tokens, properties)
- JSON serialization/deserialization
- Token property validation (bold, colors, etc.)

### 6. Terminal Serialization Tests

Tests converting terminal state to AnsiOutput:
- Writing ANSI colored text to terminal
- Serializing to AnsiOutput format
- Verifying color/style preservation
- Checking line and token structure

## Manual Testing Guide

After running the automated tests, the script displays a comprehensive manual testing guide for the TUI.

### Starting the TUI

```bash
npm run build
node dist/cli/index.js tui
```

### Testing Workflow

1. **Enter Terminal Panel**: Press `t`
2. **Create Terminal**: Press `n`, enter command (e.g., `bash`), give it a name
3. **View Output**: Select terminal, press `Enter`
4. **Interactive Mode**: Press `i` while viewing a running terminal
5. **Test Controls**: Try scrolling, killing, clearing, etc.

### Interactive Commands to Test

Create terminals with these commands to test various scenarios:

```bash
bash           # Interactive shell
python         # Python REPL
vim            # Full-screen editor (test arrow keys, ESC)
less           # Pager (test scrolling)
htop           # Process viewer (test colors)
```

### Control Sequences to Test

In interactive mode, try:
- `Ctrl+C` - Send interrupt (SIGINT)
- `Ctrl+D` - Send EOF
- `Ctrl+L` - Clear screen
- Arrow keys - Navigation
- `PageUp`/`PageDown` - Scrolling

### Terminal Management

Test these operations:
- `k` - Kill terminal
- `e` - Toggle expose to agent
- `c` - Clear output
- `r` - Refresh list
- `ESC` - Navigate back through views

## Expected Test Results

The test suite should report approximately:
- **28-31 tests passed** (depending on environment)
- **0-3 tests failed** (edge cases that depend on terminal state)

### Known Edge Cases

1. **Scroll Test**: May fail if already at top of buffer (expected)
2. **Serialization**: May fail if terminal hasn't flushed writes (timing issue)
3. **keyToAnsi**: Requires TypeScript loader (may fail if not installed)

## Dependencies

The test requires:
- `node-pty` - PTY implementation
- `@xterm/headless` - Terminal emulation
- Built project files in `dist/` directory

Install with:
```bash
npm install
npm run build
```

## Architecture Overview

### PTY Flow

```
User Input → keyToAnsi() → ANSI Sequence → writeToPty() → PTY Process
                                                                ↓
ShellExecutionService ← Terminal Buffer ← Output Stream ← PTY Process
         ↓
serializeTerminalToObject() → AnsiOutput → TUI Rendering
```

### Key Files

- `/services/shell-execution.ts` - PTY management and execution
- `/tui/utils/keyToAnsi.ts` - Key to ANSI conversion
- `/utils/terminalSerializer.ts` - Terminal to AnsiOutput conversion
- `/tui/components/TerminalPanel.tsx` - TUI terminal panel component
- `/tui/terminal-storage.ts` - Background terminal management

## Troubleshooting

### node-pty not found

```bash
npm install node-pty
```

On some systems, you may need build tools:
```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# macOS
xcode-select --install
```

### @xterm/headless not found

```bash
npm install @xterm/headless
```

### Terminal serializer not found

```bash
npm run build
```

### Tests timing out

Increase timeout in the test file or check for hung processes:
```bash
ps aux | grep node
```

## Contributing

When adding new shell mode features:

1. Add tests to `test-shell-mode.js`
2. Update this README with new test cases
3. Add manual testing steps if applicable
4. Verify all existing tests still pass

## License

Same as the main project (AGPL-3.0)
