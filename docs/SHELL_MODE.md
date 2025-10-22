# Shell Mode Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [User Guide](#user-guide)
4. [Developer Guide](#developer-guide)
5. [Comparison to Gemini CLI](#comparison-to-gemini-cli)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Shell Mode?

Shell mode is an interactive terminal emulation feature that allows users to run and interact with shell commands directly within the TUI (Text User Interface). Unlike regular command execution, shell mode provides:

- **Real-time interaction** with running processes
- **Full terminal emulation** using PTY (pseudo-terminal)
- **ANSI escape sequence support** for rich terminal output
- **Interactive shells** like vim, less, htop, and more
- **Background execution** with the ability to switch between terminals
- **Persistent sessions** that survive application restarts

### How It Differs from Regular Command Execution

| Feature | Regular Execution | Shell Mode |
|---------|------------------|------------|
| **Interaction** | One-shot, fire-and-forget | Full interactive control |
| **PTY** | Optional, fallback to child_process | Required for interactivity |
| **Output** | Buffered, displayed after completion | Streaming, real-time updates |
| **Input** | None after launch | Full keyboard input support |
| **ANSI Support** | Limited, stripped for simplicity | Full support with rendering |
| **Use Cases** | Scripts, build commands | vim, less, htop, interactive shells |

### Why PTY is Used

PTY (pseudo-terminal) is essential for shell mode because it:

1. **Emulates a real terminal** - Programs check if stdin/stdout is a TTY
2. **Enables interactive programs** - Programs like vim require TTY to function
3. **Handles terminal control sequences** - Supports cursor movement, colors, etc.
4. **Manages job control** - Proper signal handling (SIGINT, SIGTSTP, etc.)
5. **Provides bidirectional communication** - Read output AND write input

Without PTY, interactive programs would either fail to run or display garbled output.

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TUI Layer (Ink)                         │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ TerminalPanel  │  │ InputBox     │  │  MessageList       │  │
│  │                │  │              │  │                    │  │
│  │ - List view    │  │ - Captures   │  │ - Displays output  │  │
│  │ - Output view  │  │   user input │  │ - ANSI rendering   │  │
│  │ - Interactive  │  │ - Converts   │  │ - Scrolling        │  │
│  │   mode         │  │   to ANSI    │  │                    │  │
│  └───────┬────────┘  └──────┬───────┘  └────────────────────┘  │
└──────────┼───────────────────┼──────────────────────────────────┘
           │                   │
           │ Commands          │ Key Events
           ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Terminal Manager Layer                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            TerminalManager (Singleton)                   │   │
│  │                                                          │   │
│  │  - Session management                                   │   │
│  │  - PTY lifecycle                                        │   │
│  │  - Event emission (output, exit)                       │   │
│  │  - Persistent storage                                   │   │
│  └──────────────┬───────────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  │ PTY Operations
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Shell Execution Layer                          │
│  ┌──────────────────────┐  ┌──────────────────────────────┐    │
│  │ ShellExecutionService│  │        getPty()              │    │
│  │                      │  │                              │    │
│  │ - Execute commands   │  │ - Load node-pty dynamically  │    │
│  │ - Stream output      │  │ - Fallback handling          │    │
│  │ - Handle abort       │  │                              │    │
│  │ - Resize terminal    │  │                              │    │
│  │ - Scroll buffer      │  │                              │    │
│  └──────────┬───────────┘  └────────────┬─────────────────┘    │
└─────────────┼─────────────────────────────┼─────────────────────┘
              │                             │
              │ PTY Process                 │ node-pty module
              ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PTY Layer (node-pty)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  IPty (Pseudo-Terminal)                                  │   │
│  │                                                          │   │
│  │  - Spawn shell process                                  │   │
│  │  - Bidirectional I/O                                    │   │
│  │  - Signal handling                                      │   │
│  │  - Resize support                                       │   │
│  └──────────────┬───────────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  │ Shell Commands
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       System Shell                              │
│              (bash, zsh, sh, powershell, cmd)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (Ink)
    │
    ▼
┌───────────────────┐
│  useInput hook    │ Captures raw keyboard input
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  keyToAnsi()      │ Converts to ANSI escape sequences
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ writeToPty()      │ Sends to PTY process
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  IPty.write()     │ Writes to pseudo-terminal
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Shell Process    │ Executes command
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  PTY Output       │ Raw output with ANSI codes
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ @xterm/headless   │ Parses and renders ANSI
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│serializeTerminal  │ Converts to AnsiOutput format
│    ToObject()     │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  MessageList/     │ Renders in TUI
│  TerminalPanel    │
└───────────────────┘
```

### Key Components

#### 1. ShellExecutionService (`/home/alejandro/Swarm/ceregrep-client/services/shell-execution.ts`)

The core service responsible for shell command execution.

**Responsibilities:**
- Spawn PTY processes
- Stream output events
- Handle process lifecycle
- Manage abort signals
- Support both PTY and child_process fallback
- Render terminal buffers

**Key Methods:**
```typescript
static async execute(
  commandToExecute: string,
  cwd: string,
  onOutputEvent: (event: ShellOutputEvent) => void,
  abortSignal: AbortSignal,
  shouldUseNodePty: boolean,
  shellExecutionConfig: ShellExecutionConfig,
): Promise<ShellExecutionHandle>

static writeToPty(pid: number, input: string): void
static resizePty(pid: number, cols: number, rows: number): void
static scrollPty(pid: number, lines: number): void
static isPtyActive(pid: number): boolean
```

**Features:**
- Automatic fallback from PTY to child_process
- Binary detection for file downloads
- Output truncation protection (16MB buffer)
- Headless terminal rendering with @xterm/headless
- Dynamic line trimming to remove empty lines
- Process group management for cleanup

#### 2. keyToAnsi (`/home/alejandro/Swarm/ceregrep-client/tui/utils/keyToAnsi.ts`)

Converts Ink key events to ANSI escape sequences.

**Responsibilities:**
- Translate keyboard input to terminal control codes
- Handle modifier keys (Ctrl, Alt, Shift)
- Support special keys (arrows, function keys, etc.)
- Provide proper escape sequences for PTY

**Supported Keys:**
- **Arrow keys**: Up, Down, Left, Right (with modifiers)
- **Control combinations**: Ctrl+A through Ctrl+Z
- **Function keys**: F1-F12 (and extended F13-F24)
- **Navigation**: Home, End, PageUp, PageDown, Insert, Delete
- **Special**: Tab, Enter, Escape, Backspace
- **Modifiers**: Ctrl, Alt/Meta, Shift

**Example:**
```typescript
import { keyToAnsi } from './tui/utils/keyToAnsi';

useInput((input, key) => {
  const ansiSequence = keyToAnsi(input, key);
  if (ansiSequence && pty) {
    pty.write(ansiSequence);
  }
});
```

**ANSI Mapping Examples:**
```typescript
keyToAnsi('', { upArrow: true })     // → '\x1b[A'
keyToAnsi('c', { ctrl: true })       // → '\x03' (SIGINT)
keyToAnsi('', { ctrl: true, upArrow: true }) // → '\x1b[1;5A'
keyToAnsi('a', {})                   // → 'a'
```

#### 3. AnsiOutput Renderer (`/home/alejandro/Swarm/ceregrep-client/utils/terminalSerializer.ts`)

Converts terminal buffer to structured output format.

**Responsibilities:**
- Parse ANSI escape sequences
- Extract text formatting (bold, italic, underline, etc.)
- Convert colors to hex values
- Serialize terminal state to JSON

**Data Structures:**
```typescript
interface AnsiToken {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  dim: boolean;
  inverse: boolean;
  fg: string;  // Hex color
  bg: string;  // Hex color
}

type AnsiLine = AnsiToken[];
type AnsiOutput = AnsiLine[];
```

**Example:**
```typescript
const terminal = new Terminal({ cols: 80, rows: 30 });
terminal.write('\x1b[31mRed text\x1b[0m');

const output = serializeTerminalToObject(terminal);
// output = [[{ text: 'Red text', fg: '#ff0000', ... }]]
```

#### 4. TerminalPanel (`/home/alejandro/Swarm/ceregrep-client/tui/components/TerminalPanel.tsx`)

The TUI component for managing terminal sessions.

**Responsibilities:**
- Display terminal list
- Show terminal output
- Capture interactive input
- Handle terminal controls (kill, expose, clear)
- Create new terminals

**Views:**
1. **List View** - Overview of all terminal sessions
2. **Output View** - Detailed output with scrolling
3. **Interactive Mode** - Live input to running PTY
4. **New Terminal** - Create new session

**Keybindings:**
```
List View:
  ↑↓       - Navigate terminals
  Enter    - View terminal output
  N        - New terminal
  K        - Kill terminal
  E        - Toggle expose to agent
  C        - Clear output
  R        - Refresh list
  Esc      - Exit panel

Output View:
  ↑↓       - Scroll output
  PgUp/Dn  - Fast scroll
  I        - Enter interactive mode
  K/E/C    - Same as list view
  Esc      - Back to list

Interactive Mode:
  (typing) - Send to PTY
  Enter    - Send line
  Ctrl+C   - Send SIGINT
  Ctrl+D   - Send EOF
  Ctrl+L   - Clear screen
  Esc      - Back to output view
```

#### 5. TerminalManager (`/home/alejandro/Swarm/ceregrep-client/tui/terminal-storage.ts`)

Manages persistent terminal sessions.

**Responsibilities:**
- Session lifecycle management
- PTY process spawning
- Event emission (output, exit)
- Persistent storage to disk
- Session cleanup

**Key Methods:**
```typescript
async createSession(options: CreateSessionOptions): Promise<TerminalSession>
writeToPty(sessionId: string, input: string): boolean
resizePty(sessionId: string, cols: number, rows: number): boolean
killSession(sessionId: string): Promise<void>
getOutput(sessionId: string, lines: number): string[]
exposeToAgent(sessionId: string, exposed: boolean): void
```

**Storage:**
- Location: `~/.ceregrep/terminals.json`
- Format: JSON array of TerminalSession objects
- Auto-saves on changes
- Loads on startup
- Cleanup: Keeps last 100 sessions

#### 6. getPty (`/home/alejandro/Swarm/ceregrep-client/tui/getPty.ts`)

Dynamic PTY module loader.

**Responsibilities:**
- Dynamically import node-pty
- Handle missing node-pty gracefully
- Provide fallback information

**Example:**
```typescript
const ptyInfo = await getPty();
if (ptyInfo) {
  const pty = ptyInfo.module.spawn('bash', ['-c', 'ls'], { ... });
} else {
  // Fallback to child_process
}
```

---

## User Guide

### How to Use Shell Mode in the TUI

#### Starting a Terminal

1. **Open Terminal Panel**
   - Press the designated key to open terminal panel (depends on TUI configuration)

2. **Create New Terminal**
   - Press `N` in the list view
   - Enter command: `vim myfile.txt`
   - (Optional) Enter name: `my-editor`
   - Press `Tab` to switch fields
   - Press `Enter` to create

3. **The terminal spawns immediately** and starts executing

#### Viewing Terminal Output

1. **In List View**
   - Use `↑↓` to select a terminal
   - Press `Enter` to view its output

2. **In Output View**
   - Scroll with `↑↓` arrow keys
   - Fast scroll with `PageUp`/`PageDown`
   - See real-time updates as the process outputs

#### Interacting with a Running Terminal

1. **Enter Interactive Mode**
   - Press `I` in output view (only works for running terminals)

2. **Send Input**
   - Type commands/input directly
   - Press `Enter` to send the line
   - Special keys work as expected (arrows, backspace, etc.)

3. **Send Control Sequences**
   - `Ctrl+C` - Interrupt (SIGINT)
   - `Ctrl+D` - End of file (EOF)
   - `Ctrl+L` - Clear screen

4. **Exit Interactive Mode**
   - Press `Esc` to return to output view

### Supported Interactive Commands

Shell mode works with **any** program that requires a TTY:

#### Text Editors
- **vim/nvim** - Full modal editing
- **nano** - Simple text editor
- **emacs** - (if in terminal mode)

#### Pagers
- **less** - File viewer with search
- **more** - Basic paging
- **bat** - Syntax-highlighted viewer (if in pager mode)

#### Monitoring Tools
- **htop** - Interactive process viewer
- **top** - System monitor
- **iotop** - I/O monitor (requires root)
- **nethogs** - Network monitor

#### Interactive Shells
- **bash/zsh/fish** - Full shell sessions
- **python/ipython** - Python REPL
- **node** - Node.js REPL
- **irb** - Ruby REPL

#### Build Tools
- **npm run dev** - Development servers with interactive output
- **docker-compose up** - Container logs with color
- **jest --watch** - Test watchers

#### Version Control
- **git add -p** - Interactive staging
- **tig** - Text-mode Git interface

#### Database CLIs
- **psql** - PostgreSQL interactive terminal
- **mysql** - MySQL interactive terminal
- **redis-cli** - Redis CLI

### Keybindings Reference

#### List View
| Key | Action |
|-----|--------|
| `↑↓` | Navigate terminals |
| `Enter` | View terminal output |
| `N` | New terminal |
| `K` | Kill selected terminal |
| `E` | Toggle expose to agent |
| `C` | Clear output |
| `R` | Refresh list |
| `Esc` | Exit panel |

#### Output View
| Key | Action |
|-----|--------|
| `↑↓` | Scroll output |
| `PageUp`/`PageDown` | Fast scroll |
| `I` | Enter interactive mode |
| `K` | Kill terminal |
| `E` | Toggle expose |
| `C` | Clear output |
| `Esc` | Back to list |

#### Interactive Mode
| Key | Action |
|-----|--------|
| (typing) | Send to terminal |
| `Enter` | Send line + newline |
| `Ctrl+C` | Send interrupt signal |
| `Ctrl+D` | Send EOF |
| `Ctrl+L` | Clear screen |
| `Esc` | Back to output view |

### Troubleshooting Common Issues

#### Terminal Shows Garbled Output

**Problem:** ANSI escape codes are visible as raw text.

**Solutions:**
- Ensure PTY is being used (not child_process fallback)
- Check that `showColor` is enabled in config
- Verify @xterm/headless is installed

#### Interactive Mode Doesn't Work

**Problem:** Typing has no effect or keys aren't recognized.

**Solutions:**
- Ensure terminal status is "running" (not "completed" or "stopped")
- Check that PTY process is active
- Verify keyToAnsi is properly converting input
- Test with simple command first (e.g., `cat` or `bash`)

#### Terminal Immediately Exits

**Problem:** Terminal exits right after starting.

**Solutions:**
- Check command syntax (e.g., `vim file.txt` not `vim file.txt &`)
- Ensure command doesn't exit immediately (e.g., avoid `echo "hi"`)
- For shells, use interactive flag (e.g., `bash -i`)
- Check exit code in output view for error messages

#### PTY Not Available

**Problem:** Error message "PTY not available - node-pty is not installed".

**Solutions:**
```bash
# Install node-pty
npm install node-pty

# If on Linux, you may need build tools
sudo apt-get install build-essential python3

# If on macOS with M1/M2, use Rosetta if needed
arch -x86_64 npm install node-pty
```

#### Output Not Updating in Real-Time

**Problem:** Output only appears when process exits.

**Solutions:**
- Verify event listeners are attached in TerminalPanel
- Check that TerminalManager is emitting 'output' events
- Ensure refresh interval is running (500ms default)
- Look for JavaScript errors in console

#### Can't Scroll in Output View

**Problem:** Arrow keys don't scroll output.

**Solutions:**
- Ensure you're in "output view" not "interactive mode"
- Check that output has more lines than visible (20 lines default)
- Try PageUp/PageDown for larger scrolls
- Press `Esc` to exit interactive mode if stuck

#### Terminal Sessions Not Persisting

**Problem:** Terminals disappear after restarting app.

**Solutions:**
- Check write permissions to `~/.ceregrep/`
- Verify `terminals.json` is being created
- Note: Active PTY processes won't survive restart (marked as "stopped")
- Check console for save/load errors

---

## Developer Guide

### How to Extend/Customize

#### Adding Custom Shell Configurations

Edit `/home/alejandro/Swarm/ceregrep-client/utils/shell-utils.ts`:

```typescript
export function getShellConfiguration(): ShellConfiguration {
  // Add custom shell detection
  if (process.env.MY_CUSTOM_SHELL) {
    return {
      executable: process.env.MY_CUSTOM_SHELL,
      argsPrefix: ['-custom', '-flag'],
      shell: 'custom' as ShellType, // Add to ShellType enum first
    };
  }

  // Existing logic...
}
```

#### Customizing Terminal Appearance

Modify `ShellExecutionConfig` in shell-execution.ts:

```typescript
const config: ShellExecutionConfig = {
  terminalWidth: 120,        // Wider terminal
  terminalHeight: 40,        // Taller terminal
  pager: 'less -R',         // Custom pager with color
  showColor: true,           // Enable ANSI colors
  defaultFg: '#00ff00',     // Green text
  defaultBg: '#000000',     // Black background
};
```

#### Adding Custom Output Processors

Create a custom output processor:

```typescript
import type { ShellOutputEvent } from './services/shell-execution';

function processOutput(event: ShellOutputEvent): ProcessedOutput {
  if (event.type === 'data') {
    // Custom processing
    const processed = customFilter(event.chunk);
    return { type: 'processed', data: processed };
  }
  return event;
}

// Use in execution
ShellExecutionService.execute(
  command,
  cwd,
  (event) => {
    const processed = processOutput(event);
    onOutputEvent(processed);
  },
  abortSignal,
  true,
  config
);
```

### How to Add New Key Mappings

Edit `/home/alejandro/Swarm/ceregrep-client/tui/utils/keyToAnsi.ts`:

```typescript
export function keyToAnsi(input: string, key: Key | ParsedKey): string | null {
  // Add new key mapping
  const keyName = 'name' in key ? key.name : undefined;

  if (keyName === 'myCustomKey') {
    return '\x1b[custom_sequence';
  }

  // Add custom modifier combination
  if (key.ctrl && key.shift && key.upArrow) {
    return '\x1b[1;6A'; // Ctrl+Shift+Up
  }

  // Existing logic...
}
```

**Testing new mappings:**
```typescript
import { describe, it, expect } from '@jest/globals';
import { keyToAnsi } from './keyToAnsi';

describe('Custom Keys', () => {
  it('should handle custom key', () => {
    const result = keyToAnsi('', { name: 'myCustomKey' } as ParsedKey);
    expect(result).toBe('\x1b[custom_sequence');
  });
});
```

### How to Handle New Terminal Features

#### Adding Mouse Support

1. **Extend Key interface** to include mouse events:
```typescript
export interface MouseEvent {
  x: number;
  y: number;
  button: 'left' | 'right' | 'middle';
  action: 'press' | 'release' | 'move';
}
```

2. **Add mouse-to-ANSI conversion**:
```typescript
export function mouseToAnsi(event: MouseEvent): string {
  // X10 encoding: ESC [ M Cb Cx Cy
  const cb = event.button === 'left' ? 0 : event.button === 'middle' ? 1 : 2;
  const action = event.action === 'press' ? 0 : 3;
  const byte = 32 + cb + action;

  return `\x1b[M${String.fromCharCode(byte)}${String.fromCharCode(32 + event.x)}${String.fromCharCode(32 + event.y)}`;
}
```

3. **Enable mouse tracking** in PTY:
```typescript
pty.write('\x1b[?1000h'); // Enable mouse tracking
pty.write('\x1b[?1002h'); // Enable button event tracking
pty.write('\x1b[?1003h'); // Enable all event tracking
```

#### Adding Bracketed Paste Mode

```typescript
export function enableBracketedPaste(pty: IPty): void {
  pty.write('\x1b[?2004h');
}

export function pasteText(pty: IPty, text: string): void {
  pty.write('\x1b[200~'); // Start bracketed paste
  pty.write(text);
  pty.write('\x1b[201~'); // End bracketed paste
}
```

#### Adding Custom ANSI Renderers

Create custom AnsiToken renderer:

```typescript
import type { AnsiToken } from '../utils/terminalSerializer';

export function renderAnsiToken(token: AnsiToken): React.ReactNode {
  const style: React.CSSProperties = {
    fontWeight: token.bold ? 'bold' : 'normal',
    fontStyle: token.italic ? 'italic' : 'normal',
    textDecoration: token.underline ? 'underline' : 'none',
    opacity: token.dim ? 0.6 : 1,
    color: token.fg || '#ffffff',
    backgroundColor: token.bg || 'transparent',
  };

  if (token.inverse) {
    [style.color, style.backgroundColor] = [style.backgroundColor, style.color];
  }

  return <span style={style}>{token.text}</span>;
}
```

### Integration Points with Other TUI Components

#### Integrating with MessageList

```typescript
import type { AnsiOutput } from '../utils/terminalSerializer';

interface MessageProps {
  content: string | AnsiOutput;
}

function Message({ content }: MessageProps) {
  if (typeof content === 'string') {
    return <Text>{content}</Text>;
  }

  // Render AnsiOutput
  return (
    <Box flexDirection="column">
      {content.map((line, i) => (
        <Box key={i}>
          {line.map((token, j) => (
            <Text
              key={j}
              bold={token.bold}
              italic={token.italic}
              underline={token.underline}
              dimColor={token.dim}
              color={token.fg || undefined}
              backgroundColor={token.bg || undefined}
            >
              {token.text}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}
```

#### Integrating with Agent System

```typescript
// Expose terminal output to agent
import { TerminalManager } from '../tui/terminal-storage';

const manager = TerminalManager.getInstance();

// Agent can query terminal output
function getTerminalContext(sessionId: string): string {
  const output = manager.getOutput(sessionId, 100);
  return output.join('\n');
}

// Agent can send commands to terminal
function agentExecuteCommand(command: string): Promise<string> {
  const session = await manager.createSession({
    name: `agent_${Date.now()}`,
    command,
    cwd: process.cwd(),
    exposedToAgent: true,
    createdBy: 'agent',
  });

  // Wait for completion
  return new Promise((resolve) => {
    manager.on('exit', (event) => {
      if (event.sessionId === session.id) {
        const output = manager.getOutput(session.id, 1000);
        resolve(output.join('\n'));
      }
    });
  });
}
```

#### Integrating with Config System

```typescript
// Load shell config from user settings
interface UserConfig {
  shell: {
    defaultCommand: string;
    terminalWidth: number;
    terminalHeight: number;
    showColor: boolean;
    pager: string;
  };
}

function loadShellConfig(userConfig: UserConfig): ShellExecutionConfig {
  return {
    terminalWidth: userConfig.shell.terminalWidth || 80,
    terminalHeight: userConfig.shell.terminalHeight || 30,
    showColor: userConfig.shell.showColor ?? true,
    pager: userConfig.shell.pager || 'cat',
  };
}
```

---

## Comparison to Gemini CLI

### What Was Copied 1:1

The following components are direct adaptations from Gemini CLI:

#### 1. ShellExecutionService Core Logic
**Source:** Gemini CLI's shell execution service

**What was copied:**
- PTY spawning logic with node-pty
- Fallback to child_process when PTY unavailable
- Binary detection for file streams
- Output buffering with truncation protection
- Process cleanup with SIGTERM → SIGKILL escalation
- AbortSignal integration

**License:** Apache 2.0 (preserved in file headers)

**File:** `/home/alejandro/Swarm/ceregrep-client/services/shell-execution.ts`

#### 2. terminalSerializer
**Source:** Gemini CLI's ANSI serialization

**What was copied:**
- AnsiToken/AnsiLine/AnsiOutput data structures
- Cell-based terminal buffer parsing
- ANSI color palette (256 colors)
- RGB and palette color conversion
- Attribute handling (bold, italic, underline, etc.)

**License:** Apache 2.0

**File:** `/home/alejandro/Swarm/ceregrep-client/utils/terminalSerializer.ts`

#### 3. getPty Utility
**Source:** Gemini CLI's PTY loader

**What was copied:**
- Dynamic import of node-pty
- Module availability detection
- IPty interface definition
- Graceful fallback handling

**File:** `/home/alejandro/Swarm/ceregrep-client/tui/getPty.ts`

#### 4. Shell Configuration
**Source:** Gemini CLI's shell utils

**What was copied:**
- Platform detection (Windows vs Unix)
- Shell executable detection
- Argument prefix configuration (bash -c, powershell -Command)

**File:** `/home/alejandro/Swarm/ceregrep-client/utils/shell-utils.ts`

### What Was Adapted

#### 1. keyToAnsi Utility
**Source:** Gemini CLI's keyToAnsi hook

**Adaptations:**
- **Enhanced:** 40+ key combinations vs ~15 in original
- **Added:** Full function key support (F1-F24)
- **Added:** Comprehensive modifier support (Ctrl, Alt, Shift)
- **Added:** Helper functions (shouldHandleInTUI, isParsedKey)
- **Added:** Extensive documentation and tests
- **Maintained:** Core algorithm and interface compatibility

**Improvements:**
```typescript
// Original: Basic arrow and control keys
// Enhanced: Full keyboard support including:
- Function keys F1-F20
- Navigation keys (Home, End, PageUp, PageDown)
- Modified arrow keys (Ctrl+Arrow, Alt+Arrow, Shift+Arrow)
- Extended control sequences
- Type guards and helper functions
```

#### 2. TerminalManager
**Source:** Inspired by Gemini CLI's shell execution model

**Adaptations:**
- **Added:** Persistent session storage
- **Added:** Event-driven architecture (EventEmitter)
- **Added:** Multi-session management
- **Added:** Session exposure control
- **Added:** Interactive PTY writing
- **Changed:** Session lifecycle from one-shot to persistent

**New Features:**
```typescript
// Original: Execute and forget
execute(command) → result

// Enhanced: Persistent interactive sessions
createSession(options) → session
writeToPty(sessionId, input)
resizePty(sessionId, cols, rows)
killSession(sessionId)
exposeToAgent(sessionId, exposed)
```

#### 3. TerminalPanel TUI Component
**Source:** Original implementation (not in Gemini CLI)

**Inspirations from Gemini CLI:**
- Split-pane layout concept
- Real-time output streaming
- Keyboard-driven navigation

**Original additions:**
- Multi-view state machine (list/output/interactive/new)
- Session management UI
- Interactive mode with live input
- Terminal creation flow
- Persistence and restoration

### Differences in Implementation

| Aspect | Gemini CLI | Ceregrep Client |
|--------|------------|----------------|
| **Architecture** | Command execution focused | Session management focused |
| **Persistence** | None (ephemeral) | Full session persistence |
| **Interactivity** | Limited (display only) | Full bidirectional I/O |
| **UI** | Streaming output in chat | Dedicated terminal panel |
| **Session Mgmt** | Single session per command | Multi-session with switching |
| **PTY Access** | Internal to command execution | Exposed via TerminalManager |
| **Storage** | No storage | JSON storage in ~/.ceregrep |
| **Agent Integration** | Commands run by agent | Sessions exposed to agent |
| **Keybindings** | Not applicable (chat UI) | Full keyboard navigation |
| **ANSI Rendering** | Inline in messages | Dedicated terminal view |

### Why Choices Were Made

#### Why Persistent Sessions?

**Gemini CLI Approach:** Ephemeral execution
- Commands run once and complete
- Output displayed in chat
- No session state preserved

**Our Approach:** Persistent sessions
- Terminals survive beyond single execution
- Sessions can be resumed
- History preserved across restarts

**Reasoning:**
1. **Developer workflow** - Background processes (dev servers, watchers)
2. **Interactive tools** - Need to interact multiple times (vim, shells)
3. **Context preservation** - Agent can reference past outputs
4. **Multi-tasking** - Switch between terminals without losing state

#### Why Dedicated Terminal Panel?

**Gemini CLI Approach:** Output in chat messages
- Simple integration
- Chronological flow
- No separate UI needed

**Our Approach:** Dedicated terminal panel
- Separate view for terminal management
- Better for long-running processes
- Supports full interactivity

**Reasoning:**
1. **Separation of concerns** - Chat for conversation, panel for terminals
2. **Better UX** - Can scroll large outputs independently
3. **Interactive mode** - Full keyboard control needed
4. **Session overview** - See all running terminals at once

#### Why EventEmitter Pattern?

**Gemini CLI Approach:** Callback-based
- Direct callbacks for output
- Promise-based completion

**Our Approach:** EventEmitter
- Event-driven architecture
- Multiple subscribers possible
- Decoupled components

**Reasoning:**
1. **Flexibility** - Multiple components can listen to same events
2. **Decoupling** - TerminalManager doesn't know about UI
3. **Real-time updates** - Easy to broadcast changes
4. **Scalability** - Can add more event types without changing API

#### Why JSON Storage?

**Gemini CLI Approach:** No persistence

**Our Approach:** JSON in ~/.ceregrep/

**Reasoning:**
1. **Simplicity** - No database needed
2. **Portability** - Easy to backup/restore
3. **Human-readable** - Can inspect/edit manually
4. **Lightweight** - No external dependencies
5. **Fast** - Quick reads/writes for small datasets

**Trade-offs:**
- ❌ Not suitable for huge session counts (cleanup after 100)
- ❌ No indexing or querying
- ✅ Simple and reliable
- ✅ No additional setup needed

---

## Examples

### Example 1: Running vim in Shell Mode

```typescript
import { TerminalManager } from '../tui/terminal-storage';

const manager = TerminalManager.getInstance();

// Create vim session
const session = await manager.createSession({
  name: 'vim-config',
  command: 'vim ~/.bashrc',
  cwd: process.cwd(),
  exposedToAgent: false,
  createdBy: 'user',
});

// Monitor output (shows vim's TUI in ANSI)
manager.on('output', (event) => {
  console.log('Vim output:', event);
});

// Send vim commands
setTimeout(() => {
  manager.writeToPty(session.id, 'i'); // Enter insert mode
  manager.writeToPty(session.id, 'Hello from PTY\n');
  manager.writeToPty(session.id, '\x1b'); // ESC to normal mode
  manager.writeToPty(session.id, ':wq\n'); // Save and quit
}, 1000);
```

**What happens:**
1. PTY spawns vim with ~/.bashrc
2. Vim's TUI renders in terminal buffer
3. After 1 second, enters insert mode
4. Types "Hello from PTY"
5. Exits insert mode and saves

### Example 2: Running Interactive Python REPL

```typescript
// Create Python REPL session
const pythonSession = await manager.createSession({
  name: 'python-repl',
  command: 'python3 -i',
  cwd: process.cwd(),
  exposedToAgent: true,
  createdBy: 'agent',
});

// Wait for prompt
manager.on('output', (event) => {
  if (event.sessionId === pythonSession.id && event.line.includes('>>>')) {
    // REPL is ready, send commands
    executePythonCommands(pythonSession.id);
  }
});

function executePythonCommands(sessionId: string) {
  // Define a function
  manager.writeToPty(sessionId, 'def greet(name):\n');
  manager.writeToPty(sessionId, '    return f"Hello, {name}!"\n');
  manager.writeToPty(sessionId, '\n'); // End function definition

  // Call the function
  manager.writeToPty(sessionId, 'print(greet("World"))\n');

  // Import and use module
  manager.writeToPty(sessionId, 'import math\n');
  manager.writeToPty(sessionId, 'print(math.pi)\n');

  // Exit
  manager.writeToPty(sessionId, 'exit()\n');
}
```

**Output:**
```
>>> def greet(name):
...     return f"Hello, {name}!"
...
>>> print(greet("World"))
Hello, World!
>>> import math
>>> print(math.pi)
3.141592653589793
>>> exit()
```

### Example 3: Using less for Pagination

```typescript
// Create less session for large file
const lessSession = await manager.createSession({
  name: 'view-logs',
  command: 'less /var/log/syslog',
  cwd: '/var/log',
  exposedToAgent: false,
  createdBy: 'user',
});

// Navigate in less
setTimeout(() => {
  // Scroll down
  manager.writeToPty(lessSession.id, ' '); // Space = page down

  // Search for pattern
  setTimeout(() => {
    manager.writeToPty(lessSession.id, '/error\n'); // Search for "error"
  }, 500);

  // Navigate search results
  setTimeout(() => {
    manager.writeToPty(lessSession.id, 'n'); // Next match
    manager.writeToPty(lessSession.id, 'n'); // Next match
    manager.writeToPty(lessSession.id, 'N'); // Previous match
  }, 1000);

  // Quit less
  setTimeout(() => {
    manager.writeToPty(lessSession.id, 'q'); // Quit
  }, 2000);
}, 500);
```

**User experience:**
1. Opens syslog in less
2. Pages down automatically
3. Searches for "error"
4. Navigates through matches
5. Exits after 2 seconds

### Example 4: Running htop for Monitoring

```typescript
// Create htop session
const htopSession = await manager.createSession({
  name: 'system-monitor',
  command: 'htop',
  cwd: process.cwd(),
  exposedToAgent: true,
  createdBy: 'agent',
});

// Htop renders full TUI with colors
// Agent can read system metrics from output

// Sort by CPU
setTimeout(() => {
  manager.writeToPty(htopSession.id, 'P'); // Sort by CPU%
}, 1000);

// Filter processes
setTimeout(() => {
  manager.writeToPty(htopSession.id, 'F4'); // Filter
  manager.writeToPty(htopSession.id, 'node\n'); // Show only "node" processes
}, 2000);

// Toggle tree view
setTimeout(() => {
  manager.writeToPty(htopSession.id, 't'); // Tree view
}, 3000);

// Kill after 10 seconds
setTimeout(() => {
  manager.killSession(htopSession.id);
}, 10000);
```

**What's visible:**
- Real-time process list with colors
- CPU/memory bars
- Process tree
- Filtered view of node processes
- All ANSI formatting preserved

### Example 5: Interactive Development Server

```typescript
// Start development server
const devServer = await manager.createSession({
  name: 'next-dev',
  command: 'npm run dev',
  cwd: '/home/user/my-project',
  exposedToAgent: true,
  createdBy: 'user',
});

// Monitor for "ready" message
manager.on('output', (event) => {
  if (event.sessionId === devServer.id) {
    const output = manager.getOutput(devServer.id, 10).join('\n');

    if (output.includes('Ready on http://localhost:3000')) {
      console.log('Dev server is ready!');
      // Could notify user or open browser here
    }

    if (output.includes('compiled successfully')) {
      console.log('Hot reload completed');
    }

    if (output.includes('error')) {
      console.error('Build error detected:', output);
    }
  }
});

// Restart server (Ctrl+C then restart)
async function restartDevServer(sessionId: string) {
  // Send Ctrl+C
  manager.writeToPty(sessionId, '\x03');

  // Wait for exit
  manager.once('exit', async (event) => {
    if (event.sessionId === sessionId) {
      // Create new session
      await manager.createSession({
        name: 'next-dev',
        command: 'npm run dev',
        cwd: '/home/user/my-project',
        exposedToAgent: true,
        createdBy: 'user',
      });
    }
  });
}
```

**Use cases:**
- Long-running dev servers
- Hot reload monitoring
- Error detection
- Graceful restarts

### Example 6: Running Tests in Watch Mode

```typescript
// Start jest in watch mode
const testWatcher = await manager.createSession({
  name: 'jest-watch',
  command: 'npm test -- --watch',
  cwd: '/home/user/my-project',
  exposedToAgent: true,
  createdBy: 'user',
});

// Wait for watch prompt
manager.on('output', (event) => {
  if (event.sessionId === testWatcher.id) {
    const output = manager.getOutput(testWatcher.id, 5).join('\n');

    if (output.includes('Watch Usage')) {
      // Watch mode is ready, can send commands
      setTimeout(() => handleTestCommands(testWatcher.id), 500);
    }
  }
});

function handleTestCommands(sessionId: string) {
  // Run all tests
  manager.writeToPty(sessionId, 'a');

  // Filter by filename
  setTimeout(() => {
    manager.writeToPty(sessionId, 'p'); // Filter by pattern
    manager.writeToPty(sessionId, 'auth\n'); // Test files matching "auth"
  }, 2000);

  // Run only failed tests
  setTimeout(() => {
    manager.writeToPty(sessionId, 'f'); // Failed tests only
  }, 4000);

  // Update snapshots
  setTimeout(() => {
    manager.writeToPty(sessionId, 'u'); // Update snapshots
  }, 6000);
}
```

**Interactive features:**
- Filter tests by pattern
- Run specific test suites
- Update snapshots
- Toggle coverage
- All while keeping watch mode running

### Example 7: Database CLI Interaction

```typescript
// Connect to PostgreSQL
const psqlSession = await manager.createSession({
  name: 'postgres-cli',
  command: 'psql -U myuser -d mydatabase',
  cwd: process.cwd(),
  exposedToAgent: true,
  createdBy: 'agent',
});

// Wait for prompt
manager.on('output', (event) => {
  if (event.sessionId === psqlSession.id) {
    const lastLine = manager.getOutput(psqlSession.id, 1)[0];

    if (lastLine && lastLine.includes('mydatabase=#')) {
      // Ready for commands
      runDatabaseQueries(psqlSession.id);
    }
  }
});

function runDatabaseQueries(sessionId: string) {
  // List tables
  manager.writeToPty(sessionId, '\\dt\n');

  // Describe table
  setTimeout(() => {
    manager.writeToPty(sessionId, '\\d users\n');
  }, 500);

  // Run query
  setTimeout(() => {
    manager.writeToPty(sessionId, 'SELECT COUNT(*) FROM users;\n');
  }, 1000);

  // Create table
  setTimeout(() => {
    const createTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    manager.writeToPty(sessionId, createTable + '\n');
  }, 1500);

  // Exit
  setTimeout(() => {
    manager.writeToPty(sessionId, '\\q\n');
  }, 2000);
}
```

**Output:**
```
mydatabase=# \dt
           List of relations
 Schema |  Name   | Type  |  Owner
--------+---------+-------+---------
 public | users   | table | myuser
 public | posts   | table | myuser
(2 rows)

mydatabase=# \d users
                Table "public.users"
 Column |  Type   | Collation | Nullable | Default
--------+---------+-----------+----------+---------
 id     | integer |           | not null | ...
 name   | text    |           |          |

mydatabase=# SELECT COUNT(*) FROM users;
 count
-------
    42
(1 row)

mydatabase=# CREATE TABLE IF NOT EXISTS sessions (...);
CREATE TABLE
mydatabase=# \q
```

### Example 8: Git Interactive Operations

```typescript
// Interactive git add
const gitAddSession = await manager.createSession({
  name: 'git-add-interactive',
  command: 'git add -p',
  cwd: '/home/user/my-project',
  exposedToAgent: false,
  createdBy: 'user',
});

// Respond to prompts
manager.on('output', (event) => {
  if (event.sessionId === gitAddSession.id) {
    const output = manager.getOutput(gitAddSession.id, 5).join('\n');

    if (output.includes('Stage this hunk')) {
      // Auto-respond to hunks
      setTimeout(() => {
        // Stage first hunk
        manager.writeToPty(gitAddSession.id, 'y');

        // Skip second hunk
        setTimeout(() => {
          manager.writeToPty(gitAddSession.id, 'n');
        }, 100);

        // Split third hunk
        setTimeout(() => {
          manager.writeToPty(gitAddSession.id, 's');
        }, 200);
      }, 500);
    }
  }
});
```

**Interactive staging:**
- Shows diff hunks
- Prompts for each change
- Supports split, edit, etc.
- Full git-add-patch experience in TUI

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: PTY Fails to Spawn

**Symptoms:**
```
Error: posix_spawnp failed
Failed to spawn PTY: ...
```

**Causes:**
1. node-pty not installed
2. Missing build tools (on Linux)
3. Permission issues
4. Incompatible node-pty version

**Solutions:**
```bash
# Install node-pty
npm install node-pty

# On Ubuntu/Debian
sudo apt-get install build-essential python3 make g++

# On macOS
xcode-select --install

# On Windows
npm install --global windows-build-tools

# Verify installation
node -e "require('node-pty').spawn('echo', ['test'])"
```

#### Issue: Garbled ANSI Output

**Symptoms:**
```
ESC[31mRed textESC[0m
^[[1;34mBlue^[[0m
```

**Causes:**
1. @xterm/headless not processing ANSI
2. showColor: false in config
3. Using child_process instead of PTY
4. Terminal encoding issues

**Solutions:**
```typescript
// 1. Ensure PTY is used
const result = await ShellExecutionService.execute(
  command,
  cwd,
  onOutput,
  abortSignal,
  true, // ← Must be true for PTY
  {
    showColor: true, // ← Must be true
    terminalWidth: 80,
    terminalHeight: 30,
  }
);

// 2. Check @xterm/headless is installed
// npm install @xterm/headless

// 3. Verify PTY is active
console.log(ShellExecutionService.isPtyActive(pid));
```

#### Issue: Interactive Mode Not Working

**Symptoms:**
- Typing has no effect
- Keys not recognized
- Terminal doesn't respond

**Diagnostic steps:**
```typescript
// 1. Check session status
const session = manager.getSession(sessionId);
console.log('Status:', session.status); // Should be "running"
console.log('PID:', session.shellPid);  // Should exist

// 2. Check PTY is active
const isActive = manager.writeToPty(sessionId, 'test');
console.log('PTY write succeeded:', isActive);

// 3. Check keyToAnsi
import { keyToAnsi } from './tui/utils/keyToAnsi';
const ansi = keyToAnsi('a', {});
console.log('ANSI for "a":', ansi); // Should be "a"

// 4. Enable debug logging
manager.on('output', (event) => {
  console.log('[OUTPUT]', event);
});
```

**Solutions:**
- Ensure command is still running (not exited)
- Verify PTY process exists
- Check keyToAnsi is returning valid sequences
- Test with simple command first (e.g., `cat`)

#### Issue: Terminal Output Not Updating

**Symptoms:**
- Output freezes
- No real-time updates
- Only updates on manual refresh

**Diagnostic:**
```typescript
// Check event listeners
console.log('Output listeners:', manager.listenerCount('output'));
console.log('Exit listeners:', manager.listenerCount('exit'));

// Test event emission
manager.emit('output', { sessionId: 'test', line: 'test' });

// Check refresh interval
// In TerminalPanel.tsx, should have:
const interval = setInterval(loadSessions, 500);
```

**Solutions:**
```typescript
// Ensure listeners are attached
useEffect(() => {
  const onOutput = () => loadSessions();
  const onExit = () => loadSessions();

  manager.on('output', onOutput);
  manager.on('exit', onExit);

  // IMPORTANT: Cleanup!
  return () => {
    manager.off('output', onOutput);
    manager.off('exit', onExit);
  };
}, []);

// Add refresh interval
useEffect(() => {
  const interval = setInterval(() => {
    setSessions(manager.listSessions());
  }, 500);

  return () => clearInterval(interval);
}, []);
```

#### Issue: Terminals Not Persisting

**Symptoms:**
- Terminals disappear after restart
- terminals.json not created
- Save errors in console

**Diagnostic:**
```bash
# Check storage directory
ls -la ~/.ceregrep/

# Check file permissions
ls -l ~/.ceregrep/terminals.json

# Check file contents
cat ~/.ceregrep/terminals.json
```

**Solutions:**
```bash
# Create directory
mkdir -p ~/.ceregrep
chmod 755 ~/.ceregrep

# Fix permissions
chmod 644 ~/.ceregrep/terminals.json

# Manually test save
node -e "
  const fs = require('fs');
  const path = require('path');
  const file = path.join(require('os').homedir(), '.ceregrep', 'terminals.json');
  fs.writeFileSync(file, JSON.stringify([{test: true}], null, 2));
  console.log('Saved to:', file);
"
```

#### Issue: Memory Leak with Many Terminals

**Symptoms:**
- Memory usage grows
- App slows down
- Many old sessions in storage

**Solutions:**
```typescript
// 1. Run cleanup regularly
setInterval(() => {
  manager.cleanup(); // Keeps last 100 sessions
}, 60000); // Every minute

// 2. Manually clear old sessions
const sessions = manager.listSessions();
sessions
  .filter(s => s.status !== 'running')
  .filter(s => Date.now() - s.created > 24 * 60 * 60 * 1000) // Older than 1 day
  .forEach(s => {
    manager.sessions.delete(s.id);
  });
manager.saveToDisk();

// 3. Limit output lines per session
const session = manager.getSession(sessionId);
if (session) {
  session.maxOutputLines = 500; // Default is 1000
}
```

#### Issue: Keybindings Conflict with TUI

**Symptoms:**
- Ctrl+C exits app instead of sending to PTY
- Some keys don't reach terminal

**Solutions:**
```typescript
import { keyToAnsi, shouldHandleInTUI } from './tui/utils/keyToAnsi';

useInput((input, key) => {
  // Check if TUI should handle this key
  if (shouldHandleInTUI(input, key)) {
    // Handle in TUI (e.g., exit app)
    handleTUICommand(input, key);
    return;
  }

  // Send to PTY
  const ansi = keyToAnsi(input, key);
  if (ansi && sessionId) {
    manager.writeToPty(sessionId, ansi);
  }
});

// Or create a dedicated "escape mode"
const [mode, setMode] = useState<'tui' | 'pty'>('tui');

useInput((input, key) => {
  if (key.escape) {
    // ESC toggles mode
    setMode(mode === 'tui' ? 'pty' : 'tui');
    return;
  }

  if (mode === 'pty') {
    // All keys go to PTY
    const ansi = keyToAnsi(input, key);
    if (ansi) manager.writeToPty(sessionId, ansi);
  } else {
    // TUI handles keys
    handleTUIKeys(input, key);
  }
});
```

### Debugging Techniques

#### Enable Verbose Logging

```typescript
// In ShellExecutionService
private static executeWithPty(...) {
  console.log('[PTY] Spawning:', command);
  console.log('[PTY] CWD:', cwd);
  console.log('[PTY] Cols×Rows:', cols, rows);

  ptyProcess.onData((data: string) => {
    console.log('[PTY DATA]', data.substring(0, 100));
    handleOutput(Buffer.from(data, 'utf-8'));
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log('[PTY EXIT]', exitCode, signal);
    // ...
  });
}
```

#### Inspect Terminal Buffer

```typescript
// In TerminalManager or ShellExecutionService
const activePty = this.activePtys.get(pid);
if (activePty) {
  const terminal = activePty.headlessTerminal;
  const buffer = terminal.buffer.active;

  console.log('Buffer length:', buffer.length);
  console.log('Viewport Y:', buffer.viewportY);
  console.log('Cursor X:', buffer.cursorX);
  console.log('Cursor Y:', buffer.cursorY);

  // Dump full buffer
  for (let i = 0; i < buffer.length; i++) {
    const line = buffer.getLine(i);
    console.log(`Line ${i}:`, line?.translateToString());
  }
}
```

#### Monitor PTY Events

```typescript
// Create debug event logger
class PTYDebugger {
  constructor(private manager: TerminalManager) {
    manager.on('output', this.onOutput);
    manager.on('exit', this.onExit);
  }

  private onOutput = (event: any) => {
    console.log('[EVENT:OUTPUT]', {
      sessionId: event.sessionId,
      lineLength: event.line.length,
      preview: event.line.substring(0, 50),
    });
  };

  private onExit = (event: any) => {
    console.log('[EVENT:EXIT]', {
      sessionId: event.sessionId,
      exitCode: event.exitCode,
      signal: event.signal,
    });
  };
}

// Usage
const debugger = new PTYDebugger(manager);
```

#### Test ANSI Conversion

```typescript
import { keyToAnsi } from './tui/utils/keyToAnsi';

function testKeyConversion() {
  const tests = [
    { input: '', key: { upArrow: true }, expected: '\x1b[A' },
    { input: 'c', key: { ctrl: true }, expected: '\x03' },
    { input: '', key: { return: true }, expected: '\r' },
  ];

  tests.forEach(({ input, key, expected }) => {
    const result = keyToAnsi(input, key as any);
    const match = result === expected;
    console.log(
      match ? '✓' : '✗',
      'Input:', JSON.stringify(input),
      'Key:', JSON.stringify(key),
      'Result:', JSON.stringify(result),
      'Expected:', JSON.stringify(expected)
    );
  });
}
```

#### Trace Session Lifecycle

```typescript
// Add lifecycle logging to TerminalManager
async createSession(options: CreateSessionOptions) {
  console.log('[LIFECYCLE] Creating session:', options.name);
  const session = { /* ... */ };

  console.log('[LIFECYCLE] Session created:', session.id);
  await this.spawnPty(session, ...);

  console.log('[LIFECYCLE] PTY spawned:', session.shellPid);
  return session;
}

async killSession(sessionId: string) {
  console.log('[LIFECYCLE] Killing session:', sessionId);
  const session = this.sessions.get(sessionId);

  if (session?.shellPid) {
    console.log('[LIFECYCLE] Sending SIGTERM to PID:', session.shellPid);
    // ...
  }

  console.log('[LIFECYCLE] Session killed:', sessionId);
}
```

---

**End of Shell Mode Documentation**

For more information:
- See `/home/alejandro/Swarm/ceregrep-client/tui/utils/SUMMARY.md` for keyToAnsi details
- See `/home/alejandro/Swarm/ceregrep-client/services/shell-execution.ts` for implementation
- See Gemini CLI source for original reference implementation
